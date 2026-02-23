import Database from 'better-sqlite3';
import type { Note, NoteMetadata, Relationship } from '../types/index.js';
import { extractWikiLinks, parseWikiLinkText } from '../storage/wiki-links.js';
import { parseWikiLink } from '../types/note.js';

/**
 * Ensure type exists in the types table (for foreign key constraint)
 */
function ensureTypeExists(db: Database.Database, typeId: string): void {
  const checkStmt = db.prepare('SELECT type_id FROM types WHERE type_id = ?');
  const existing = checkStmt.get(typeId);
  if (!existing) {
    const insertStmt = db.prepare(`
      INSERT INTO types (type_id, name, schema_json, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    insertStmt.run(typeId, typeId, '{}', new Date().toISOString());
  }
}

/**
 * Upsert a note into the database within a single transaction.
 * This includes:
 * 1. Upsert into notes table
 * 2. Sync note_tags table
 * 3. Sync relationships table
 * 4. Update notes_fts virtual table
 * 5. Forward reference reconciliation
 */
export function upsertNote(db: Database.Database, note: Note): void {
  const transaction = db.transaction(() => {
    // Ensure type exists for foreign key constraint
    ensureTypeExists(db, note.type);

    // Step 1: Upsert into notes table
    const upsertNoteStmt = db.prepare(`
      INSERT OR REPLACE INTO notes (
        note_id, type, title, description, file_path, created, modified,
        archived, pinned, scope_context, scope_team, scope_service,
        status, priority, due, effort, body_text
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const archived = note.fields?.archived ? 1 : 0;
    const pinned = note.fields?.pinned ? 1 : 0;

    upsertNoteStmt.run(
      note.noteId,
      note.type,
      note.title,
      note.fields?.description || null,
      note.filePath,
      note.created,
      note.modified,
      archived,
      pinned,
      note.scope?.context || null,
      note.scope?.team || null,
      note.scope?.service || null,
      note.status || null,
      note.priority || null,
      note.due || null,
      note.effort || null,
      note.body,
    );

    // Step 2: Sync note_tags table
    // Delete existing tags for this note
    const deleteTagsStmt = db.prepare('DELETE FROM note_tags WHERE note_id = ?');
    deleteTagsStmt.run(note.noteId);

    // Insert new tags
    if (note.tags && note.tags.length > 0) {
      const insertTagStmt = db.prepare(`
        INSERT OR IGNORE INTO note_tags (note_id, tag)
        VALUES (?, ?)
      `);
      for (const tag of note.tags) {
        insertTagStmt.run(note.noteId, tag);
      }
    }

    // Step 3: Sync relationships table
    // Delete existing relationships where source_id = this note
    const deleteRelStmt = db.prepare('DELETE FROM relationships WHERE source_id = ?');
    deleteRelStmt.run(note.noteId);

    const insertRelStmt = db.prepare(`
      INSERT OR IGNORE INTO relationships (source_id, target_id, target_title, relation_type)
      VALUES (?, ?, ?, ?)
    `);

    // Collect all relationships to insert
    const relationshipsToInsert: Array<{
      targetTitle: string;
      relationType: string;
    }> = [];

    // Insert explicit 'related' entries
    if (note.related && note.related.length > 0) {
      for (const relStr of note.related) {
        const targetTitle = parseWikiLink(relStr);
        if (targetTitle) {
          relationshipsToInsert.push({
            targetTitle,
            relationType: 'related',
          });
        }
      }
    }

    // Extract body wiki-links as 'mentions' relationships
    const bodyLinks = extractWikiLinks(note.body);
    for (const linkTitle of bodyLinks) {
      relationshipsToInsert.push({
        targetTitle: linkTitle,
        relationType: 'mentions',
      });
    }

    // Extract typed reference relationships from fields
    for (const [fieldName, fieldValue] of Object.entries(note.fields || {})) {
      if (fieldValue && typeof fieldValue === 'string') {
        // Check if this field value looks like a wiki-link
        const parsedTarget = parseWikiLink(fieldValue);
        if (parsedTarget) {
          relationshipsToInsert.push({
            targetTitle: parsedTarget,
            relationType: fieldName,
          });
        }
      }
    }

    // For each relationship, try to resolve target_id
    const getTargetIdStmt = db.prepare(
      'SELECT note_id FROM notes WHERE title = ? LIMIT 1'
    );

    for (const rel of relationshipsToInsert) {
      const targetIdRow = getTargetIdStmt.get(rel.targetTitle) as
        | { note_id: string }
        | undefined;
      const targetId = targetIdRow?.note_id || null;

      insertRelStmt.run(
        note.noteId,
        targetId,
        rel.targetTitle,
        rel.relationType
      );
    }

    // Step 4: Update notes_fts virtual table
    const insertFtsStmt = db.prepare(`
      INSERT OR REPLACE INTO notes_fts(rowid, title, description, body_text)
      SELECT rowid, title, description, body_text FROM notes WHERE note_id = ?
    `);
    insertFtsStmt.run(note.noteId);

    // Step 5: Forward reference reconciliation
    // Update NULL target_ids in relationships where target_title matches this note's title
    const updateForwardRefStmt = db.prepare(`
      UPDATE relationships
      SET target_id = ?
      WHERE target_id IS NULL AND target_title = ?
    `);
    updateForwardRefStmt.run(note.noteId, note.title);
  });

  transaction();
}

/**
 * Delete a note and update related data.
 * 1. Set target_id = NULL in relationships where target_id = noteId (preserve forward ref)
 * 2. Delete from notes (cascade deletes tags and relationships where source_id = noteId)
 * 3. Delete from notes_fts
 */
export function deleteNote(db: Database.Database, noteId: string): void {
  const transaction = db.transaction(() => {
    // Step 1: Set target_id = NULL in relationships where target_id = noteId
    const updateForwardRefStmt = db.prepare(`
      UPDATE relationships
      SET target_id = NULL
      WHERE target_id = ?
    `);
    updateForwardRefStmt.run(noteId);

    // Step 2: Delete from notes (cascade deletes tags and relationships)
    const deleteNoteStmt = db.prepare('DELETE FROM notes WHERE note_id = ?');
    deleteNoteStmt.run(noteId);

    // Step 3: Delete from notes_fts by clearing all rows with that noteId reference
    // Since FTS is external content, just clearing the notes table clears the FTS references
    // We can also manually remove from FTS if needed
    db.exec('PRAGMA optimize;');
  });

  transaction();
}

/**
 * Full rebuild within a single transaction.
 * 1. DELETE all notes (cascade deletes tags, relationships)
 * 2. DELETE from notes_fts (virtual table cleanup)
 * 3. Upsert all notes one by one
 */
export function fullRebuild(db: Database.Database, notes: Note[]): void {
  const transaction = db.transaction(() => {
    // Step 1: Delete all notes
    const deleteAllStmt = db.prepare('DELETE FROM notes');
    deleteAllStmt.run();

    // Step 2: Clear FTS table (by deleting all rows)
    const deleteFtsStmt = db.prepare(`
      DELETE FROM notes_fts
    `);
    deleteFtsStmt.run();

    // Step 3: Upsert all notes one by one (without nested transactions)
    for (const note of notes) {
      upsertNoteInternal(db, note);
    }
  });

  transaction();
}

/**
 * Internal upsert function for use within transactions (doesn't create its own transaction)
 */
function upsertNoteInternal(db: Database.Database, note: Note): void {
  // Ensure type exists for foreign key constraint
  ensureTypeExists(db, note.type);

  // Upsert into notes table
  const upsertNoteStmt = db.prepare(`
    INSERT OR REPLACE INTO notes (
      note_id, type, title, description, file_path, created, modified,
      archived, pinned, scope_context, scope_team, scope_service,
      status, priority, due, effort, body_text
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const archived = note.fields?.archived ? 1 : 0;
  const pinned = note.fields?.pinned ? 1 : 0;

  upsertNoteStmt.run(
    note.noteId,
    note.type,
    note.title,
    note.fields?.description || null,
    note.filePath,
    note.created,
    note.modified,
    archived,
    pinned,
    note.scope?.context || null,
    note.scope?.team || null,
    note.scope?.service || null,
    note.status || null,
    note.priority || null,
    note.due || null,
    note.effort || null,
    note.body,
  );

  // Sync note_tags table
  const deleteTagsStmt = db.prepare('DELETE FROM note_tags WHERE note_id = ?');
  deleteTagsStmt.run(note.noteId);

  if (note.tags && note.tags.length > 0) {
    const insertTagStmt = db.prepare(`
      INSERT OR IGNORE INTO note_tags (note_id, tag)
      VALUES (?, ?)
    `);
    for (const tag of note.tags) {
      insertTagStmt.run(note.noteId, tag);
    }
  }

  // Sync relationships table
  const deleteRelStmt = db.prepare('DELETE FROM relationships WHERE source_id = ?');
  deleteRelStmt.run(note.noteId);

  const insertRelStmt = db.prepare(`
    INSERT OR IGNORE INTO relationships (source_id, target_id, target_title, relation_type)
    VALUES (?, ?, ?, ?)
  `);

  const relationshipsToInsert: Array<{
    targetTitle: string;
    relationType: string;
  }> = [];

  if (note.related && note.related.length > 0) {
    for (const relStr of note.related) {
      const targetTitle = parseWikiLink(relStr);
      if (targetTitle) {
        relationshipsToInsert.push({
          targetTitle,
          relationType: 'related',
        });
      }
    }
  }

  const bodyLinks = extractWikiLinks(note.body);
  for (const linkTitle of bodyLinks) {
    relationshipsToInsert.push({
      targetTitle: linkTitle,
      relationType: 'mentions',
    });
  }

  for (const [fieldName, fieldValue] of Object.entries(note.fields || {})) {
    if (fieldValue && typeof fieldValue === 'string') {
      const parsedTarget = parseWikiLink(fieldValue);
      if (parsedTarget) {
        relationshipsToInsert.push({
          targetTitle: parsedTarget,
          relationType: fieldName,
        });
      }
    }
  }

  const getTargetIdStmt = db.prepare(
    'SELECT note_id FROM notes WHERE title = ? LIMIT 1'
  );

  for (const rel of relationshipsToInsert) {
    const targetIdRow = getTargetIdStmt.get(rel.targetTitle) as
      | { note_id: string }
      | undefined;
    const targetId = targetIdRow?.note_id || null;

    insertRelStmt.run(
      note.noteId,
      targetId,
      rel.targetTitle,
      rel.relationType
    );
  }

  // Update notes_fts virtual table
  const insertFtsStmt = db.prepare(`
    INSERT OR REPLACE INTO notes_fts(rowid, title, description, body_text)
    SELECT rowid, title, description, body_text FROM notes WHERE note_id = ?
  `);
  insertFtsStmt.run(note.noteId);

  // Forward reference reconciliation
  const updateForwardRefStmt = db.prepare(`
    UPDATE relationships
    SET target_id = ?
    WHERE target_id IS NULL AND target_title = ?
  `);
  updateForwardRefStmt.run(note.noteId, note.title);
}

/**
 * Get a note's metadata by ID
 */
export function getNote(
  db: Database.Database,
  noteId: string
): NoteMetadata | null {
  const stmt = db.prepare(`
    SELECT
      note_id as noteId, type, title, created, modified,
      status, priority, due, effort,
      scope_context as scopeContext, scope_team as scopeTeam, scope_service as scopeService,
      description
    FROM notes
    WHERE note_id = ?
  `);
  const row = stmt.get(noteId) as any;
  if (!row) {
    return null;
  }

  // Get tags
  const tagsStmt = db.prepare('SELECT tag FROM note_tags WHERE note_id = ?');
  const tagRows = tagsStmt.all(noteId) as Array<{ tag: string }>;
  const tags = tagRows.map((r) => r.tag);

  // Get related notes
  const relatedStmt = db.prepare(`
    SELECT target_title FROM relationships
    WHERE source_id = ? AND relation_type = 'related'
  `);
  const relatedRows = relatedStmt.all(noteId) as Array<{ target_title: string }>;
  const related = relatedRows.map((r) => {
    const { target_title } = r;
    return `[[${target_title}]]`;
  });

  return {
    noteId: row.noteId,
    type: row.type,
    title: row.title,
    created: row.created,
    modified: row.modified,
    tags,
    related,
    status: row.status !== null ? row.status : undefined,
    priority: row.priority !== null ? row.priority : undefined,
    due: row.due !== null ? row.due : undefined,
    effort: row.effort !== null ? row.effort : undefined,
    scope: row.scopeContext || row.scopeTeam || row.scopeService
      ? {
          context: row.scopeContext || undefined,
          team: row.scopeTeam || undefined,
          service: row.scopeService || undefined,
        }
      : undefined,
    fields: {},
  };
}

/**
 * Get forward relationships (relationships where this note is the source)
 */
export function getForwardRelationships(
  db: Database.Database,
  noteId: string
): Relationship[] {
  const stmt = db.prepare(`
    SELECT source_id as sourceId, target_id as targetId, target_title as targetTitle, relation_type as relationType
    FROM relationships
    WHERE source_id = ?
  `);
  const rows = stmt.all(noteId) as Array<{
    sourceId: string;
    targetId: string | null;
    targetTitle: string;
    relationType: string;
  }>;

  return rows.map((row) => ({
    sourceId: row.sourceId,
    targetId: row.targetId,
    targetTitle: row.targetTitle,
    relationType: row.relationType,
    resolved: row.targetId !== null,
  }));
}

/**
 * Get reverse relationships (relationships where this note is the target)
 */
export function getReverseRelationships(
  db: Database.Database,
  noteId: string
): Relationship[] {
  const stmt = db.prepare(`
    SELECT source_id as sourceId, target_id as targetId, target_title as targetTitle, relation_type as relationType
    FROM relationships
    WHERE target_id = ?
  `);
  const rows = stmt.all(noteId) as Array<{
    sourceId: string;
    targetId: string | null;
    targetTitle: string;
    relationType: string;
  }>;

  return rows.map((row) => ({
    sourceId: row.sourceId,
    targetId: row.targetId,
    targetTitle: row.targetTitle,
    relationType: row.relationType,
    resolved: row.targetId !== null,
  }));
}

/**
 * Get all indexed note paths and their metadata for startup catchup
 */
export function getAllNotePaths(
  db: Database.Database
): Array<{ noteId: string; filePath: string; modified: string }> {
  const stmt = db.prepare(`
    SELECT note_id as noteId, file_path as filePath, modified
    FROM notes
  `);
  return stmt.all() as Array<{ noteId: string; filePath: string; modified: string }>;
}
