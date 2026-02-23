import type { SearchInput } from '../types/tools.js';
import type { ToolContext } from './create-note.js';
import type { SearchResponse } from '../types/view.js';
import type { AnvilError } from '../types/error.js';
/**
 * Handle anvil_search request.
 * Performs FTS, filter-only, or combined search based on input.
 * Returns paginated SearchResult objects with metadata and tags.
 */
export declare function handleSearch(input: SearchInput, ctx: ToolContext): Promise<SearchResponse | AnvilError>;
//# sourceMappingURL=search.d.ts.map