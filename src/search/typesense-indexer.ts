// Typesense document indexer — maps Note objects to TypesenseDocument and
// provides single-note and full-reindex operations

import type { Note } from '../types/note.js';
import type { AnvilDb } from '../index/sqlite.js';
import type { TypesenseSearchClient, TypesenseDocument } from './typesense-client.js';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Maximum body length to index — Typesense has a per-field size budget */
const MAX_BODY_LENGTH = 20_000;

/** Regex to strip wiki-links: [[Target]] → Target, [[Target|Display]] → Display */
const WIKI_LINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Convert an ISO date string to a Unix timestamp in milliseconds.
 * Returns 0 and logs a warning for invalid dates.
 */
export function toEpochMs(dateStr: string | undefined | null): number {
  if (!dateStr) return 0;
  const ms = new Date(dateStr).getTime();
  if (Number.isNaN(ms)) {
    process.stderr.write(
      JSON.stringify({
        level: 'warn',
        message: `Invalid date string for epoch conversion: "${dateStr}"`,
        timestamp: new Date().toISOString(),
      }) + '\n'
    );
    return 0;
  }
  return ms;
}

/**
 * Strip wiki-link syntax from text, keeping the display text.
 * [[My Note]] → My Note
 * [[My Note|displayed]] → displayed
 */
function stripWikiLinks(text: string): string {
  return text.replace(WIKI_LINK_RE, (_match, target, display) => display ?? target);
}

/**
 * Truncate a string to maxLen, breaking at the last space before the limit
 * to avoid cutting mid-word.
 */
function truncateBody(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > maxLen * 0.8 ? truncated.slice(0, lastSpace) : truncated;
}

// ─── Mapping ────────────────────────────────────────────────────────────────

/**
 * Map a Note to a TypesenseDocument.
 * - Truncates body to 20K characters
 * - Strips wiki-link syntax from body text
 * - Converts date strings to epoch milliseconds
 */
export function noteToDocument(note: Note): TypesenseDocument {
  const body = truncateBody(stripWikiLinks(note.body ?? ''), MAX_BODY_LENGTH);

  const doc: TypesenseDocument = {
    id: note.noteId,
    source: 'anvil',
    source_type: note.type,
    title: note.title,
    body,
    tags: note.tags ?? [],
    created_at: toEpochMs(note.created),
    modified_at: toEpochMs(note.modified),
  };

  // Optional fields — only include when present to keep documents lean
  if (note.status) doc.status = note.status;
  if (note.priority) doc.priority = note.priority;
  if (note.due) doc.due_at = toEpochMs(note.due);
  if (note.scope?.context) doc.scope_context = note.scope.context;
  if (note.scope?.team) doc.scope_program = note.scope.team;
  if (note.scope?.service) doc.scope_repo = note.scope.service;

  // Type-specific fields that map to search document
  if (note.fields?.assignee_id) doc.assignee_id = String(note.fields.assignee_id);
  if (note.fields?.assignee) doc.assignee_id = String(note.fields.assignee);
  if (note.fields?.project_id) doc.project_id = String(note.fields.project_id);
  if (note.fields?.project) doc.project_id = String(note.fields.project);
  if (note.fields?.project_name) doc.project_name = String(note.fields.project_name);

  return doc;
}

// ─── Index operations ───────────────────────────────────────────────────────

/**
 * Index a single note into Typesense.
 * Errors are caught and logged to stderr — never throws.
 */
export async function indexNote(
  client: TypesenseSearchClient,
  note: Note
): Promise<void> {
  try {
    const doc = noteToDocument(note);
    await client.upsert(doc);
  } catch (err) {
    process.stderr.write(
      JSON.stringify({
        level: 'error',
        message: `Failed to index note ${note.noteId}: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date().toISOString(),
      }) + '\n'
    );
  }
}

/**
 * Remove a single note from the Typesense index by its noteId.
 * Errors are caught and logged to stderr — never throws.
 */
export async function deindexNote(
  client: TypesenseSearchClient,
  noteId: string
): Promise<void> {
  try {
    await client.delete(noteId);
  } catch (err) {
    process.stderr.write(
      JSON.stringify({
        level: 'error',
        message: `Failed to deindex note ${noteId}: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date().toISOString(),
      }) + '\n'
    );
  }
}

/**
 * Full reindex: read all notes from SQLite and batch-upsert into Typesense.
 * Processes in chunks of 100 to avoid memory pressure.
 *
 * @param client - Typesense search client
 * @param db - AnvilDb (raw SQLite handle)
 */
export async function fullReindex(
  client: TypesenseSearchClient,
  db: AnvilDb
): Promise<void> {
  // Ensure the collection exists before indexing
  await client.ensureCollection();

  const CHUNK_SIZE = 100;

  // Read all notes from SQLite
  const rows = db.getAll<{
    note_id: string;
    type: string;
    title: string;
    body_text: string | null;
    status: string | null;
    priority: string | null;
    due: string | null;
    created: string;
    modified: string;
    scope_context: string | null;
    scope_team: string | null;
    scope_service: string | null;
  }>(
    `SELECT note_id, type, title, body_text, status, priority, due,
            created, modified, scope_context, scope_team, scope_service
     FROM notes`
  );

  process.stderr.write(
    JSON.stringify({
      level: 'info',
      message: `Typesense full reindex: ${rows.length} notes to index`,
      timestamp: new Date().toISOString(),
    }) + '\n'
  );

  // Fetch all tags in one query for efficiency
  const tagRows = db.getAll<{ note_id: string; tag: string }>(
    'SELECT note_id, tag FROM note_tags ORDER BY note_id'
  );
  const tagsMap = new Map<string, string[]>();
  for (const row of tagRows) {
    if (!tagsMap.has(row.note_id)) {
      tagsMap.set(row.note_id, []);
    }
    tagsMap.get(row.note_id)!.push(row.tag);
  }

  // Convert rows to TypesenseDocuments
  const docs: TypesenseDocument[] = rows.map((row) => {
    const body = truncateBody(
      stripWikiLinks(row.body_text ?? ''),
      MAX_BODY_LENGTH
    );

    const doc: TypesenseDocument = {
      id: row.note_id,
      source: 'anvil',
      source_type: row.type,
      title: row.title,
      body,
      tags: tagsMap.get(row.note_id) ?? [],
      created_at: toEpochMs(row.created),
      modified_at: toEpochMs(row.modified),
    };

    if (row.status) doc.status = row.status;
    if (row.priority) doc.priority = row.priority;
    if (row.due) doc.due_at = toEpochMs(row.due);
    if (row.scope_context) doc.scope_context = row.scope_context;
    if (row.scope_team) doc.scope_program = row.scope_team;
    if (row.scope_service) doc.scope_repo = row.scope_service;

    return doc;
  });

  // Batch upsert in chunks
  let indexed = 0;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    try {
      await client.batchUpsert(chunk);
      indexed += chunk.length;
    } catch (err) {
      process.stderr.write(
        JSON.stringify({
          level: 'error',
          message: `Typesense batch upsert failed at offset ${i}: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: new Date().toISOString(),
        }) + '\n'
      );
      // Continue with next chunk — partial reindex is better than none
    }
  }

  process.stderr.write(
    JSON.stringify({
      level: 'info',
      message: `Typesense full reindex complete: ${indexed}/${rows.length} notes indexed`,
      timestamp: new Date().toISOString(),
    }) + '\n'
  );
}
