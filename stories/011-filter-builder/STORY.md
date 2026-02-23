# Story: Filter Builder

> ID: 011 | Status: **draft** | Priority: P2-medium | Created: 2026-02-23

## Description

Implement the conversational query resolver — a rule-based parser that transforms natural language query patterns into structured `QueryFilter` objects. This is the bridge between how agents/users naturally ask questions ("show me blocked stories," "what's due this week") and the structured filters that the search and query-view tools consume.

Phase 1 uses pattern matching and keyword recognition. LLM-powered resolution is deferred to Phase 2.

## Acceptance Criteria

- [ ] **Pattern recognition:** The filter builder recognizes and extracts common query patterns into structured filters:
  - Type filters: "tasks" → `{ type: "task" }`, "stories" → `{ type: "story" }`, "meetings" → `{ type: "meeting" }`
  - Status filters: "open tasks" → `{ type: "task", status: "open" }`, "blocked stories" → `{ type: "story", status: "blocked" }`, "done" → `{ status: "done" }`
  - Priority filters: "urgent" / "P0" → `{ priority: "P0-critical" }`, "high priority" → `{ priority: "P1-high" }`
  - Tag filters: "tagged urgent" / "tag:urgent" → `{ tags: ["urgent"] }`
  - Due date filters: "due today" → `{ due: { gte: today, lte: today } }`, "due this week" → `{ due: { gte: monday, lte: sunday } }`, "overdue" → `{ due: { lte: yesterday }, status: { not: "done" } }`
  - Scope filters: "about Document Service" → `{ scope: { service: "Document Service" } }`
  - Assignee filters: "assigned to me" / "my tasks" → `{ assignee: "self" }`, "assigned to Arjun" → `{ assignee: "Arjun" }`
- [ ] **Compound queries:** Handle multi-clause queries: "open tasks due this week" → `{ type: "task", status: "open", due: { gte: monday, lte: sunday } }`. "blocked P1 stories" → `{ type: "story", status: "blocked", priority: "P1-high" }`.
- [ ] **Free-text pass-through:** Unrecognized portions of the query are passed as free-text to FTS. "authentication tasks" → `{ type: "task", query: "authentication" }`. "meetings about onboarding" → `{ type: "meeting", query: "onboarding" }`.
- [ ] **Filter inspection:** The filter builder returns both the parsed filter AND the original query, so agents can show the user what was parsed: `{ originalQuery: "blocked P1 stories", parsedFilter: { type: "story", status: "blocked", priority: "P1-high" }, freeText: null }`.
- [ ] **Date resolution:** Relative date expressions resolve to absolute ISO dates based on the current date. "today", "yesterday", "tomorrow", "this week" (Mon-Sun), "next week", "this month", "last 7 days". Timezone: use the server's local timezone.
- [ ] **Fuzzy type matching:** "task" and "tasks" both resolve to type "task". "meeting" and "meetings" both resolve to type "meeting". Handle common pluralization.
- [ ] **Case insensitivity:** All keyword matching is case-insensitive. "BLOCKED", "Blocked", "blocked" all resolve to status "blocked".
- [ ] **Unknown patterns:** Queries that don't match any pattern are treated entirely as free-text search. "random gibberish" → `{ query: "random gibberish" }`.
- [ ] **Integration with search/query-view:** The filter builder can be used as an optional pre-processing step before `anvil_search` or `anvil_query_view`. The tools accept either a raw `QueryFilter` object OR a natural language string that gets passed through the filter builder first.
- [ ] **Unit tests:** Each pattern type individually, compound queries, free-text pass-through, date resolution (with mocked current date), fuzzy type matching, case insensitivity, unknown patterns, edge cases (empty query, only whitespace, only stop words).

## Technical Notes

**Key files to create:**
- `src/search/filter-builder.ts` — Pattern matching engine, query parser

**Design references:**
- Conversational query resolution: §7 of Phase 1 design doc

**Implementation notes:**
- This is a rule-based parser, not an NLP system. Use regex patterns and keyword dictionaries.
- Architecture: pipeline of matchers. Each matcher tries to extract its pattern (type, status, priority, date, etc.) and removes matched tokens from the remaining query. Whatever's left becomes free-text.
- Date resolution should be its own utility function — it'll be useful outside the filter builder too.
- The "self" assignee should resolve to the current user's name from the server config (or a well-known note).
- Priority matching: support both short ("P0", "P1") and long ("P0-critical", "high priority", "urgent") forms. Map to the canonical enum values from the type registry.
- Consider registering custom keywords: type definitions could include aliases (e.g., type "bug" could alias to "defect", "issue"). Deferred for now but worth structuring the matcher to support it.

## Dependencies

- **001** — Type registry (for enum values, type names — used to validate parsed filters)
- **002** — Core types (QueryFilter)
- **006** — Search tool (integration — filter builder feeds into search)

## History

| Date | From | To | Note |
|------|------|----|------|
| 2026-02-23 | — | draft | Story created from Phase 1 design §7 |

---
*Status transitions are logged in the History table above and detailed in scratch.md alongside.*
