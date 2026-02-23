# Scratch — 011: Filter Builder

## 2026-02-23 — Story created

Phase 1 uses pattern matching only. LLM-powered resolution (Phase 2) will handle complex queries like "find all the tasks I worked on last sprint that are still open and related to the auth project." For Phase 1, the patterns cover the 80% case.

The pipeline architecture (sequence of matchers, each consuming tokens) makes it easy to add new matchers later without rewriting the parser.
