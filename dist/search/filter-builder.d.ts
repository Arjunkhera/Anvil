import type { ParsedQuery, DateRange } from '../types/query.js';
/**
 * Resolve relative date expressions to absolute ISO date strings.
 *
 * @param expr - One of: 'today', 'yesterday', 'tomorrow', 'this week',
 *               'next week', 'this month', 'last 7 days', 'last 30 days'
 * @param now - Reference date (injectable for testing)
 * @returns DateRange with gte/lte ISO date strings, or null if no match
 */
export declare function resolveDateExpression(expr: string, now?: Date): DateRange | null;
/**
 * Parse a natural language query into a structured QueryFilter.
 * Pattern-based, rule-based — no LLM required.
 *
 * @param query - The natural language query string
 * @param now - Current date (injectable for testing), defaults to new Date()
 * @returns ParsedQuery with parsedFilter, freeText, and originalQuery
 */
export declare function parseQuery(query: string, now?: Date): ParsedQuery;
//# sourceMappingURL=filter-builder.d.ts.map