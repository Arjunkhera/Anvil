// Core file I/O operations for vault management
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { makeError } from '../types/error.js';
import { DEFAULT_IGNORE_PATTERNS } from '../types/config.js';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter.js';
/**
 * Check if a path matches any ignore pattern.
 * Patterns support basic wildcards: * (single segment), ** (any segments)
 */
function shouldIgnore(filePath, patterns) {
    for (const pattern of patterns) {
        // Normalize pattern and path separators
        const normalizedPattern = pattern.replace(/\\/g, '/');
        const normalizedPath = filePath.replace(/\\/g, '/');
        // Simple pattern matching
        if (normalizedPattern.includes('**')) {
            // Matches anything containing the pattern
            const basePart = normalizedPattern.replace(/\*\*/g, '');
            if (normalizedPath.includes(basePart)) {
                return true;
            }
        }
        else if (normalizedPattern.includes('*')) {
            // Single-level wildcard
            const regex = new RegExp(`^${normalizedPattern.replace(/\./g, '\\.').replace(/\*/g, '[^/]+')}$`);
            if (regex.test(normalizedPath)) {
                return true;
            }
        }
        else {
            // Exact match or prefix match (directory)
            if (normalizedPath === normalizedPattern ||
                normalizedPath.startsWith(normalizedPattern + '/')) {
                return true;
            }
        }
    }
    return false;
}
/**
 * Read a note file from disk.
 * Parses frontmatter, extracts body, returns Note + file metadata.
 * Handles: file not found (NOT_FOUND error), malformed YAML (warns),
 * missing frontmatter (returns note with empty metadata), BOM stripping.
 */
export async function readNote(filePath) {
    try {
        // Read file content
        const content = await fs.readFile(filePath, 'utf-8');
        // Parse frontmatter and body
        const { data, content: body } = parseFrontmatter(content);
        // Get file metadata
        const stat = await fs.stat(filePath);
        const fileMetadata = {
            filePath,
            mtime: stat.mtime,
            size: stat.size,
        };
        // Construct Note from metadata and body
        const metadata = {
            noteId: data.noteId || '',
            type: data.type || '',
            title: data.title || '',
            created: data.created || new Date().toISOString(),
            modified: data.modified || new Date().toISOString(),
            tags: Array.isArray(data.tags) ? data.tags : [],
            related: Array.isArray(data.related) ? data.related : [],
            scope: data.scope,
            status: data.status,
            priority: data.priority,
            due: data.due,
            effort: typeof data.effort === 'number' ? data.effort : undefined,
            fields: {
                // Collect any fields not in the known metadata fields
                ...(typeof data === 'object' && data !== null
                    ? Object.entries(data).reduce((acc, [key, value]) => {
                        if (![
                            'noteId',
                            'type',
                            'title',
                            'created',
                            'modified',
                            'tags',
                            'related',
                            'scope',
                            'status',
                            'priority',
                            'due',
                            'effort',
                        ].includes(key)) {
                            acc[key] = value;
                        }
                        return acc;
                    }, {})
                    : {}),
            },
        };
        const note = {
            ...metadata,
            body,
            filePath,
        };
        return { note, fileMetadata };
    }
    catch (err) {
        // File not found
        if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            return makeError('NOT_FOUND', `Note file not found: ${filePath}`);
        }
        // Other errors (malformed YAML, etc.)
        return makeError('IO_ERROR', `Failed to read note: ${err instanceof Error ? err.message : String(err)}`);
    }
}
/**
 * Write a note to disk atomically.
 * Serializes note to frontmatter + body and writes atomically
 * (write to {filePath}.tmp, then rename).
 * Creates parent dirs if needed.
 */
export async function writeNote(note) {
    try {
        // Create parent directory if needed
        const dir = dirname(note.filePath);
        await fs.mkdir(dir, { recursive: true });
        // Prepare metadata for serialization
        const metadata = {
            noteId: note.noteId,
            type: note.type,
            title: note.title,
            created: note.created,
            modified: note.modified,
            tags: note.tags,
            related: note.related,
        };
        // Add optional fields
        if (note.scope) {
            metadata.scope = note.scope;
        }
        if (note.status) {
            metadata.status = note.status;
        }
        if (note.priority) {
            metadata.priority = note.priority;
        }
        if (note.due) {
            metadata.due = note.due;
        }
        if (note.effort !== undefined) {
            metadata.effort = note.effort;
        }
        // Add custom fields
        Object.assign(metadata, note.fields);
        // Serialize
        const content = serializeFrontmatter(metadata, note.body);
        // Atomic write: write to .tmp, then rename
        const tmpPath = `${note.filePath}.tmp`;
        await fs.writeFile(tmpPath, content, 'utf-8');
        await fs.rename(tmpPath, note.filePath);
    }
    catch (err) {
        throw err;
    }
}
/**
 * Helper function to recursively scan a directory for markdown files
 */
async function scanDirRecursive(dir, prefix, ignorePatterns, results) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            try {
                const fullPath = join(dir, entry.name);
                const relativePath = prefix ? join(prefix, entry.name) : entry.name;
                // Check if should ignore
                if (shouldIgnore(relativePath, ignorePatterns)) {
                    continue;
                }
                if (entry.isDirectory()) {
                    // Recursively scan subdirectory
                    await scanDirRecursive(fullPath, relativePath, ignorePatterns, results);
                }
                else if (entry.isFile() && entry.name.endsWith('.md')) {
                    // Get file stats
                    const stat = await fs.stat(fullPath);
                    results.push({
                        filePath: relativePath,
                        mtime: stat.mtime,
                        size: stat.size,
                    });
                }
            }
            catch (err) {
                // Skip files that can't be stat'd (deleted, permission error, etc.)
                // Continue scanning other files
            }
        }
    }
    catch (err) {
        // If reading directory fails, just return (empty result set)
    }
}
/**
 * Generate a unique file path for a new note, checking for collisions
 * against the actual filesystem.
 */
export async function generateFilePath(vaultRoot, title, type, strategy = 'flat') {
    // Import here to avoid circular dependencies
    const { generateSlug, generateFilePath: generateFilePathLogic } = await import('./slug.js');
    // Scan existing files to build collision set
    const existingPaths = new Set();
    try {
        const results = [];
        await scanDirRecursive(vaultRoot, '', DEFAULT_IGNORE_PATTERNS, results);
        for (const result of results) {
            existingPaths.add(result.filePath);
        }
    }
    catch (err) {
        // If scanning fails, just proceed without collision detection
        // This allows the function to work even if the vault is empty
    }
    return generateFilePathLogic(title, type, strategy, existingPaths);
}
/**
 * Scan vault recursively, yielding all .md files.
 * Respects ignore patterns (.anvil/.local/, .git/, node_modules/, temp files).
 * Handles symlinks gracefully.
 */
export async function* scanVault(vaultRoot, ignorePatterns = DEFAULT_IGNORE_PATTERNS) {
    const results = [];
    await scanDirRecursive(vaultRoot, '', ignorePatterns, results);
    for (const result of results) {
        yield result;
    }
}
/**
 * Delete a file from disk.
 * Returns structured error if not found.
 */
export async function deleteFile(filePath) {
    try {
        await fs.unlink(filePath);
    }
    catch (err) {
        if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            throw makeError('NOT_FOUND', `File not found: ${filePath}`);
        }
        throw err;
    }
}
//# sourceMappingURL=file-store.js.map