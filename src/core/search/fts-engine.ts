// FTS-based search engine implementation

import type { AnvilDb } from '../../index/sqlite.js';
import type { SearchEngine, SearchOptions, SearchResult } from './engine.js';

/**
 * Sanitize FTS5 query string
 * - Escape special FTS5 characters
 * - Wrap multi-word queries in quotes
 */
function sanitizeFtsQuery(query: string): string {
  // Escape special FTS5 characters: ( ) " *
  let sanitized = query.replace(/[()":*]/g, '');

  // If multi-word, wrap in quotes for phrase search
  if (sanitized.trim().includes(' ')) {
    sanitized = `"${sanitized.trim()}"`;
  }

  return sanitized || '*';
}

/**
 * FTS5-based search engine using BM25 ranking.
 * Provides fast full-text search with snippet extraction.
 */
export class FtsSearchEngine implements SearchEngine {
  constructor(private db: AnvilDb) {}

  /**
   * Search using FTS5 with BM25 ranking
   * Returns ranked results with snippets
   */
  async search(query: string, opts?: SearchOptions): Promise<SearchResult[]> {
    const sanitized = sanitizeFtsQuery(query);
    const limit = opts?.limit ?? 100;
    const offset = opts?.offset ?? 0;

    const rows = this.db.getAll<{
      noteId: string;
      score: number;
      snippet: string;
    }>(
      `SELECT
        notes.note_id as noteId,
        bm25(notes_fts, 10.0, 5.0, 1.0) as score,
        snippet(notes_fts, -1, '<b>', '</b>', '...', 32) as snippet
      FROM notes_fts
      JOIN notes ON notes.rowid = notes_fts.rowid
      WHERE notes_fts MATCH ?
      ORDER BY score
      LIMIT ? OFFSET ?`,
      [sanitized, limit, offset]
    );

    return rows || [];
  }

  /**
   * Query with same semantics as search for FTS
   */
  async query(query: string, opts?: SearchOptions): Promise<SearchResult[]> {
    return this.search(query, opts);
  }
}
