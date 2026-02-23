// Unit tests for the file watcher

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { mkdtemp } from 'fs';
import { tmpdir } from 'os';
import { promisify } from 'util';
import Database from 'better-sqlite3';

import { AnvilWatcher, type WatcherOptions } from '../../src/storage/watcher.js';
import { upsertNote, getAllNotePaths } from '../../src/index/indexer.js';
import { TypeRegistry } from '../../src/registry/type-registry.js';
import type { Note } from '../../src/types/note.js';

const mkdtempAsync = promisify(mkdtemp);

// Helper to create a test database
function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  
  // Create minimal schema
  db.exec(`
    CREATE TABLE notes (
      note_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      file_path TEXT UNIQUE,
      created TEXT NOT NULL,
      modified TEXT NOT NULL,
      archived INTEGER DEFAULT 0,
      pinned INTEGER DEFAULT 0,
      scope_context TEXT,
      scope_team TEXT,
      scope_service TEXT,
      status TEXT,
      priority TEXT,
      due TEXT,
      effort REAL,
      body_text TEXT
    );
    
    CREATE TABLE note_tags (
      note_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (note_id, tag),
      FOREIGN KEY (note_id) REFERENCES notes(note_id)
    );
    
    CREATE TABLE relationships (
      source_id TEXT NOT NULL,
      target_id TEXT,
      target_title TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      PRIMARY KEY (source_id, target_title, relation_type),
      FOREIGN KEY (source_id) REFERENCES notes(note_id)
    );
    
    CREATE TABLE types (
      type_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      schema_json TEXT,
      updated_at TEXT
    );
    
    CREATE VIRTUAL TABLE notes_fts USING fts5(title, description, body_text, content=notes, content_rowid=rowid);
  `);
  
  return db;
}

// Helper to create a test note with absolute path
function createTestNote(filePath: string, noteId: string = 'note-1'): Note {
  return {
    noteId,
    type: 'test',
    title: 'Test Note',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    tags: [],
    related: [],
    body: 'Test body',
    filePath,
    fields: {},
  };
}

describe('AnvilWatcher', () => {
  let tmpDir: string;
  let db: Database.Database;
  let registry: TypeRegistry;

  beforeEach(async () => {
    tmpDir = await mkdtempAsync(join(tmpdir(), 'anvil-watcher-test-'));
    db = createTestDb();
    registry = new TypeRegistry(db);
  });

  afterEach(async () => {
    try {
      db.close();
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    it('should construct without errors', () => {
      const options: WatcherOptions = {
        vaultPath: tmpDir,
        db,
        registry,
      };
      const watcher = new AnvilWatcher(options);
      expect(watcher).toBeDefined();
    });

    it('should accept custom ignore patterns', () => {
      const customPatterns = ['custom_ignored', '*.bak'];
      const options: WatcherOptions = {
        vaultPath: tmpDir,
        db,
        registry,
        ignorePatterns: customPatterns,
      };
      const watcher = new AnvilWatcher(options);
      expect(watcher).toBeDefined();
    });

    it('should accept custom debounce interval', () => {
      const options: WatcherOptions = {
        vaultPath: tmpDir,
        db,
        registry,
        debounceMs: 200,
      };
      const watcher = new AnvilWatcher(options);
      expect(watcher).toBeDefined();
    });

    it('should accept error handler callback', () => {
      const onError = vi.fn();
      const options: WatcherOptions = {
        vaultPath: tmpDir,
        db,
        registry,
        onError,
      };
      const watcher = new AnvilWatcher(options);
      expect(watcher).toBeDefined();
    });
  });

  describe('handleEvent and debounce', () => {
    it('should collect multiple events for same file and keep last event', async () => {
      vi.useFakeTimers();

      const options: WatcherOptions = {
        vaultPath: tmpDir,
        db,
        registry,
        debounceMs: 100,
      };

      const watcher = new AnvilWatcher(options);
      
      // Mock the processBatch method to avoid file I/O
      let batchProcessed = false;
      (watcher as any).processBatch = async () => {
        batchProcessed = true;
      };

      // Simulate multiple events for the same file
      (watcher as any).handleEvent('add', 'test.md');
      (watcher as any).handleEvent('change', 'test.md');
      (watcher as any).handleEvent('change', 'test.md');

      // Verify pending events only has one entry (last event wins)
      const pendingEvents = (watcher as any).pendingEvents;
      expect(pendingEvents.size).toBe(1);
      expect(pendingEvents.get('test.md')).toBe('change');

      // Advance time to trigger batch processing
      vi.advanceTimersByTime(150);
      await Promise.resolve();

      expect(batchProcessed).toBe(true);

      vi.useRealTimers();
    });

    it('should ignore non-markdown files', async () => {
      vi.useFakeTimers();

      const options: WatcherOptions = {
        vaultPath: tmpDir,
        db,
        registry,
        debounceMs: 100,
      };

      const watcher = new AnvilWatcher(options);

      // Try to handle non-.md files
      (watcher as any).handleEvent('add', 'test.txt');
      (watcher as any).handleEvent('add', 'test.yaml');
      (watcher as any).handleEvent('add', 'test.json');

      // Verify no events were collected
      const pendingEvents = (watcher as any).pendingEvents;
      expect(pendingEvents.size).toBe(0);

      vi.useRealTimers();
    });

    it('should debounce events properly', async () => {
      vi.useFakeTimers();

      const options: WatcherOptions = {
        vaultPath: tmpDir,
        db,
        registry,
        debounceMs: 100,
      };

      const watcher = new AnvilWatcher(options);
      
      let batchCount = 0;
      (watcher as any).processBatch = async () => {
        batchCount++;
      };

      // Trigger multiple events with short intervals (within debounce window)
      (watcher as any).handleEvent('add', 'file1.md');
      vi.advanceTimersByTime(50);
      (watcher as any).handleEvent('change', 'file1.md');
      vi.advanceTimersByTime(50);
      (watcher as any).handleEvent('change', 'file1.md');

      // Should not have processed yet
      expect(batchCount).toBe(0);

      // Advance past debounce window
      vi.advanceTimersByTime(100);
      await Promise.resolve();

      // Should have processed exactly once
      expect(batchCount).toBe(1);

      vi.useRealTimers();
    });

    it('should batch multiple files', async () => {
      vi.useFakeTimers();

      const options: WatcherOptions = {
        vaultPath: tmpDir,
        db,
        registry,
        debounceMs: 100,
      };

      const watcher = new AnvilWatcher(options);
      
      let batchedFiles: string[] = [];
      (watcher as any).processBatch = async function() {
        batchedFiles = Array.from((this as any).pendingEvents.keys());
      };

      // Trigger events for multiple files
      (watcher as any).handleEvent('add', 'file1.md');
      (watcher as any).handleEvent('change', 'file2.md');
      (watcher as any).handleEvent('add', 'file3.md');

      // Verify all files are pending
      const pendingEvents = (watcher as any).pendingEvents;
      expect(pendingEvents.size).toBe(3);

      // Advance past debounce window
      vi.advanceTimersByTime(150);
      await Promise.resolve();

      // Should have processed all files in one batch
      expect(batchedFiles.length).toBe(3);

      vi.useRealTimers();
    });
  });

  describe('startupCatchup', () => {
    it('should detect deleted files and remove them from index', async () => {
      // Create a note in the database without corresponding file
      const filePath = join(tmpDir, 'deleted-note.md');
      const note = createTestNote(filePath, 'del-note');
      upsertNote(db, note);

      // Verify note exists
      let paths = getAllNotePaths(db);
      expect(paths.length).toBe(1);
      expect(paths[0].noteId).toBe('del-note');

      // Run startup catchup with no files on disk
      const options: WatcherOptions = {
        vaultPath: tmpDir,
        db,
        registry,
      };

      const watcher = new AnvilWatcher(options);
      await (watcher as any).startupCatchup();

      // Verify note was deleted
      paths = getAllNotePaths(db);
      expect(paths.length).toBe(0);
    });

    it('should preserve correctly indexed files', async () => {
      // Create a note in the database
      const filePath = join(tmpDir, 'preserved-note.md');
      const note = createTestNote(filePath, 'preserved');
      note.modified = new Date().toISOString();
      upsertNote(db, note);

      // Create file on disk with same modification time (won't update)
      const noteContent = `---
noteId: preserved
type: test
title: Test Note
created: 2024-01-01T00:00:00Z
modified: 2024-01-01T00:00:00Z
tags: []
---
Test body`;

      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(filePath, noteContent, 'utf-8');

      // Run startup catchup
      const options: WatcherOptions = {
        vaultPath: tmpDir,
        db,
        registry,
      };

      const watcher = new AnvilWatcher(options);
      await (watcher as any).startupCatchup();

      // Verify note still exists
      const paths = getAllNotePaths(db);
      expect(paths.length).toBe(1);
      expect(paths[0].noteId).toBe('preserved');
    });
  });

  describe('waitForBatch', () => {
    it('should resolve immediately when no pending events', async () => {
      const options: WatcherOptions = {
        vaultPath: tmpDir,
        db,
        registry,
      };

      const watcher = new AnvilWatcher(options);

      // waitForBatch should resolve immediately
      const promise = watcher.waitForBatch();
      await expect(promise).resolves.toBeUndefined();
    });

    it('should resolve after batch is processed', async () => {
      vi.useFakeTimers();

      const options: WatcherOptions = {
        vaultPath: tmpDir,
        db,
        registry,
        debounceMs: 50,
      };

      const watcher = new AnvilWatcher(options);

      // Mock the processBatch to call batch completion callbacks
      let processBatchCalls = 0;
      (watcher as any).processBatch = async function() {
        processBatchCalls++;
        this.pendingEvents.clear();
        const callbacks = this.batchCompletionCallbacks.splice(0);
        callbacks.forEach(cb => cb());
      };

      // Create a pending event
      (watcher as any).handleEvent('add', 'test.md');

      // Verify there are pending events
      expect((watcher as any).pendingEvents.size).toBe(1);

      // Start waiting for batch
      const waitPromise = watcher.waitForBatch();

      // Advance time to trigger processing
      vi.advanceTimersByTime(100);
      await Promise.resolve();

      // waitForBatch should resolve
      await expect(waitPromise).resolves.toBeUndefined();
      expect(processBatchCalls).toBe(1);

      vi.useRealTimers();
    });

    it('should handle concurrent wait requests', async () => {
      vi.useFakeTimers();

      const options: WatcherOptions = {
        vaultPath: tmpDir,
        db,
        registry,
        debounceMs: 50,
      };

      const watcher = new AnvilWatcher(options);

      // Mock the processBatch
      (watcher as any).processBatch = async function() {
        this.pendingEvents.clear();
        const callbacks = this.batchCompletionCallbacks.splice(0);
        callbacks.forEach(cb => cb());
      };

      // Create pending events
      (watcher as any).handleEvent('add', 'test.md');

      // Start multiple wait requests
      const promises = [
        watcher.waitForBatch(),
        watcher.waitForBatch(),
        watcher.waitForBatch(),
      ];

      // Advance time to trigger processing
      vi.advanceTimersByTime(100);
      await Promise.resolve();

      // All waits should resolve
      await expect(Promise.all(promises)).resolves.toBeDefined();

      vi.useRealTimers();
    });
  });

  describe('stop method', () => {
    it('should stop the watcher', async () => {
      const options: WatcherOptions = {
        vaultPath: tmpDir,
        db,
        registry,
      };

      const watcher = new AnvilWatcher(options);

      // Should not throw when stopping
      await expect(watcher.stop()).resolves.toBeUndefined();

      // Verify watcher is stopped
      expect((watcher as any).watcher).toBeNull();
    });
  });
});
