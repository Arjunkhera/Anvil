# Story: Integration Tests & Documentation

> ID: 013 | Status: **draft** | Priority: P2-medium | Created: 2026-02-23

## Description

Build the end-to-end integration test suite that validates the full system working together, and write the documentation needed for Phase 1 launch: setup guide, MCP tool reference, and type authoring guide. This story is the quality gate — nothing ships until these tests pass and the docs are usable.

## Acceptance Criteria

### Integration Tests

- [ ] **Test vault fixture:** Create a `tests/fixtures/test-vault/` directory with a realistic set of test notes: at least 20 notes across all built-in types (tasks, stories, projects, people, services, meetings, journals, plain notes). Include notes with every relationship type (typed references, explicit related, body wiki-links). Include notes with forward references (links to notes that don't exist yet).
- [ ] **Full CRUD cycle:** Test: create a note via MCP tool → verify it appears in search results → verify it appears in query views → update the note → verify the update is reflected in search/views → get the note and verify full content → delete the note (if implemented) → verify removal from search/views.
- [ ] **Cross-type relationships:** Test: create a person note → create a task assigned to that person → call `get_related` on the person → verify the task appears in reverse relationships with relation_type "assignee". Create a journal entry mentioning the task → verify "mentions" relationship appears.
- [ ] **Forward reference resolution:** Test: create note A that references `[[Future Note]]` → verify relationship exists with target_id NULL → create "Future Note" → verify the relationship's target_id is now resolved.
- [ ] **Search accuracy:** Test: create notes with known content → search for specific terms → verify expected notes appear in results with correct ranking (title matches ranked higher than body matches). Test filter combinations: type + status, tags + due range, scope + free-text.
- [ ] **Query view shapes:** Test: create tasks with different statuses → request board view grouped by status → verify all status columns present (including empty ones) → verify items are in correct columns. Request table view with custom columns → verify column structure matches.
- [ ] **Type validation enforcement:** Test: attempt to create a task with `status: "invalid"` → verify rejection with VALIDATION_ERROR. Attempt to update an immutable field → verify rejection. Attempt to replace body on an append_only type → verify rejection.
- [ ] **File watcher integration:** Test: create a note via MCP tool → modify the file directly on disk → wait for watcher debounce → verify index reflects the disk change. Delete a file on disk → verify removal from index.
- [ ] **Git sync round-trip:** Test (if feasible in CI): initialize a test vault as a Git repo → create notes → push → clone to a second location → verify notes exist in second clone. (May require a local bare repo as the remote.)
- [ ] **Startup cold start:** Test: start the server with an empty vault → verify `list_types` returns built-in types → verify `search` returns empty results → create a note → verify it's searchable. Test: start with existing index → verify incremental catchup (no full rebuild).
- [ ] **Error handling:** Test: call `get_note` with non-existent ID → verify NOT_FOUND error. Call `create_note` with non-existent type → verify TYPE_NOT_FOUND error. Call `search` with malformed query → verify graceful handling (no crash).

### Documentation

- [ ] **README.md:** Project overview, install instructions, quick start (init + MCP config), tech stack, link to detailed docs.
- [ ] **Setup guide:** Step-by-step: install → `anvil init` → configure MCP client (Claude Desktop, Cursor examples) → first note creation → first search. Include troubleshooting section for common issues.
- [ ] **MCP tool reference:** For each of the 7+ tools: description, input schema (with all parameters, types, defaults), output schema, example request/response, error cases. Machine-readable (could be auto-generated from Zod schemas).
- [ ] **Type authoring guide:** How to create custom types: YAML format, field types and their constraints, inheritance, template syntax, behaviors (append_only). Include a worked example of creating a custom "bug" type that extends "task."
- [ ] **Architecture overview:** Brief explanation of the system for contributors: vault structure, type registry, index, MCP server, file watcher. Include the architecture diagram from the design doc.

## Technical Notes

**Key files to create:**
- `tests/integration/crud.test.ts` — Full CRUD cycle tests
- `tests/integration/search.test.ts` — Search accuracy and filter tests
- `tests/integration/query-view.test.ts` — View rendering tests
- `tests/integration/relationships.test.ts` — Cross-type relationships and forward references
- `tests/integration/watcher.test.ts` — File watcher integration tests
- `tests/integration/sync.test.ts` — Git sync round-trip (optional, may be hard in CI)
- `tests/fixtures/test-vault/` — Realistic test vault with 20+ notes
- `docs/setup.md` — Setup guide
- `docs/tools.md` — MCP tool reference
- `docs/types.md` — Type authoring guide
- `README.md` — Project README

**Implementation notes:**
- Integration tests should use a temporary directory for each test suite (create a fresh vault, run tests, clean up). Use `vitest`'s `beforeAll`/`afterAll` for setup/teardown.
- File watcher tests need careful timing — use vitest's `vi.useFakeTimers()` or explicit waits for debounce to fire.
- The MCP tool reference could be auto-generated from the Zod schemas registered with the MCP SDK. Consider a script that introspects the server and outputs documentation.
- Test vault fixture should be committed to the repo — it serves as both test data and a reference implementation of how notes look.

## Dependencies

- **All previous stories (001-011)** — This is the final quality gate for Phase 1. All features must be implemented before integration tests can fully run.
- **012** — Migration tooling (the migration test uses the test vault as input)

## History

| Date | From | To | Note |
|------|------|----|------|
| 2026-02-23 | — | draft | Story created from Phase 1 design §12 (build order) and verification plan |

---
*Status transitions are logged in the History table above and detailed in scratch.md alongside.*
