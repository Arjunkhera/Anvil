import type { QueryViewInput } from '../types/tools.js';
import type { ToolContext } from './create-note.js';
import type { ViewData } from '../types/view.js';
import type { AnvilError } from '../types/error.js';
/**
 * Handle anvil_query_view request.
 * Returns data in list, table, or board view format.
 */
export declare function handleQueryView(input: QueryViewInput, ctx: ToolContext): Promise<ViewData | AnvilError>;
//# sourceMappingURL=query-view.d.ts.map