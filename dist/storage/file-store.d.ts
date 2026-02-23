import { AnvilError } from '../types/error.js';
import { Note } from '../types/note.js';
/**
 * Filesystem metadata for a note file
 */
export type FileMetadata = {
    filePath: string;
    mtime: Date;
    size: number;
};
/**
 * Result of reading a note — either a Note with metadata or an error
 */
export type ReadResult = {
    note: Note;
    fileMetadata: FileMetadata;
} | AnvilError;
/**
 * Result of vault scanning — file info for a single .md file
 */
export type ScanResult = {
    filePath: string;
    mtime: Date;
    size: number;
};
/**
 * Read a note file from disk.
 * Parses frontmatter, extracts body, returns Note + file metadata.
 * Handles: file not found (NOT_FOUND error), malformed YAML (warns),
 * missing frontmatter (returns note with empty metadata), BOM stripping.
 */
export declare function readNote(filePath: string): Promise<ReadResult>;
/**
 * Write a note to disk atomically.
 * Serializes note to frontmatter + body and writes atomically
 * (write to {filePath}.tmp, then rename).
 * Creates parent dirs if needed.
 */
export declare function writeNote(note: Note): Promise<void>;
/**
 * Generate a unique file path for a new note, checking for collisions
 * against the actual filesystem.
 */
export declare function generateFilePath(vaultRoot: string, title: string, type: string, strategy?: 'flat' | 'by-type'): Promise<string>;
/**
 * Scan vault recursively, yielding all .md files.
 * Respects ignore patterns (.anvil/.local/, .git/, node_modules/, temp files).
 * Handles symlinks gracefully.
 */
export declare function scanVault(vaultRoot: string, ignorePatterns?: string[]): AsyncGenerator<ScanResult, void, unknown>;
/**
 * Delete a file from disk.
 * Returns structured error if not found.
 */
export declare function deleteFile(filePath: string): Promise<void>;
//# sourceMappingURL=file-store.d.ts.map