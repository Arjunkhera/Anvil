// QMD subprocess adapter for semantic search
// Implements SearchEngine interface, wraps QMD CLI commands
// Falls back to FtsSearchEngine if QMD is not installed

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { SearchEngine, SearchOptions, SearchResult } from './engine.js';

const execFileAsync = promisify(execFile);

export interface QMDAdapterOptions {
  collectionName?: string;
  qmdPath?: string;
  maxBuffer?: number;
}

export class QMDAdapter implements SearchEngine {
  private collectionName: string;
  private qmdPath: string;
  private maxBuffer: number;

  constructor(opts: QMDAdapterOptions = {}) {
    this.collectionName = opts.collectionName ?? 'anvil';
    this.qmdPath = opts.qmdPath ?? 'qmd';
    this.maxBuffer = opts.maxBuffer ?? 10 * 1024 * 1024; // 10MB
  }

  /**
   * Full semantic query — expansion + reranking via `qmd query`
   */
  async query(text: string, opts?: SearchOptions): Promise<SearchResult[]> {
    const args = ['query', text, '--json', '-c', this.collectionName];
    if (opts?.limit) args.push('-n', String(opts.limit));
    if (opts?.path) args.push('--path', opts.path);
    return this.exec(args);
  }

  /**
   * Fast BM25 keyword search via `qmd search`
   */
  async search(text: string, opts?: SearchOptions): Promise<SearchResult[]> {
    const args = ['search', text, '--json', '-c', this.collectionName];
    if (opts?.limit) args.push('-n', String(opts.limit));
    if (opts?.path) args.push('--path', opts.path);
    return this.exec(args);
  }

  /**
   * Vector similarity search via `qmd vsearch`
   */
  async similar(text: string, opts?: SearchOptions): Promise<SearchResult[]> {
    const args = ['vsearch', text, '--json', '-c', this.collectionName];
    if (opts?.limit) args.push('-n', String(opts.limit));
    return this.exec(args);
  }

  /**
   * Re-index the collection via `qmd update`
   * Note: This triggers a re-index. Call after writes.
   */
  async reindex(): Promise<void> {
    await this.exec(['update', '-c', this.collectionName]);
  }

  /**
   * Ensure collection exists, pointing at the notes directory.
   * Idempotent — if collection exists, this is a no-op.
   * Uses `qmd collection add` — safe to call multiple times.
   */
  async ensureCollection(notesPath: string): Promise<void> {
    await this.exec([
      'collection', 'add', notesPath,
      '--name', this.collectionName,
      '--mask', '**/*.md',
    ]);
  }

  /**
   * Register path-based QMD contexts for better search relevance.
   * Called once during setup.
   */
  async registerContexts(notesPath: string): Promise<void> {
    const contexts: Array<[string, string]> = [
      ['/', 'Anvil working memory — SDLC notes, tasks, stories, scratch journals, project documentation'],
      ['/projects', 'Software project directories, each containing stories, scratch journals, specs, and documentation'],
      ['/scratches', 'Global scratch journals — design discussions, ideas, research notes, decisions'],
    ];

    for (const [path, description] of contexts) {
      try {
        await this.exec(['context', 'add', notesPath + path, description]);
      } catch {
        // Ignore errors if context already exists or path doesn't exist
      }
    }
  }

  /**
   * Check if QMD is available in PATH.
   */
  static async isAvailable(qmdPath: string = 'qmd'): Promise<boolean> {
    try {
      await execFileAsync(qmdPath, ['--version'], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  private async exec(args: string[]): Promise<any> {
    try {
      const { stdout } = await execFileAsync(this.qmdPath, args, {
        maxBuffer: this.maxBuffer,
        timeout: 30000, // 30s timeout
      });
      
      if (!stdout || !stdout.trim()) {
        return [];
      }
      
      try {
        const parsed = JSON.parse(stdout);
        return this.normalizeResults(parsed);
      } catch {
        // Not JSON — return empty (some QMD commands return plain text)
        return [];
      }
    } catch (err) {
      // QMD not found or error — return empty array (caller handles graceful degradation)
      throw err;
    }
  }

  /**
   * Normalize QMD output to our SearchResult format.
   * QMD returns: { docid, score, file, snippet, collection } or array thereof
   */
  private normalizeResults(raw: unknown): SearchResult[] {
    if (!Array.isArray(raw)) {
      raw = [raw];
    }
    
    return (raw as any[])
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        // Prefer file path — it can be resolved to a note UUID via notes.file_path.
        // QMD's docid is an internal hash (#abc123) that is not stored in our DB.
        noteId: this.pathToNoteId(item.file ?? '') || (item.docid ?? item.id ?? ''),
        score: typeof item.score === 'number' ? item.score : 0,
        snippet: typeof item.snippet === 'string' ? item.snippet : (item.content ?? ''),
        file: item.file,
      }));
  }

  private pathToNoteId(filePath: string): string {
    // Extract noteId from file path — used as fallback
    // The real noteId will be looked up from frontmatter by the search handler
    return filePath;
  }
}
