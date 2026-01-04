---
id: REQ-005
title: "Automated Regression Prevention (Anti-Fragility)"
type: feature
status: draft
priority: high
created: 2026-01-04
updated: 2026-01-04
context: ["Session Guard"]
tools: ["arela_enforce"]
---

# Automated Regression Prevention

## Summary

When the user points out an error ("You forgot X" or "You broke Y"), Arela should not just fix the error—it should **programmatically guarantee** it never happens again. We need a workflow that turns *Failure* into *Enforcement*.

## User Stories

### US-001: The "Never Again" Command
**As a** User,
**I want** to say "You forgot to document the new tool",
**So that** Arela immediately creates a programmatic check (like `check_doc_coverage.js`) to enforce it forever.

### US-002: Linter Generation
**As a** System,
**I want** to generate ESLint rules or Git Hooks from natural language failures,
**So that** the codebase becomes stricter over time.

## Proposed Solution: The `arela_enforce` Tool

A new tool that takes a "Failure Description" and generates an "Enforcer".

### Enforcer Types:
1.  **Repo Script:** A node script that runs on pre-commit (e.g., "Check all tools have .md files").
2.  **Linter Rule:** Custom ESLint rule (e.g., "Never import from `../../`").
3.  **Test Case:** A regression test case (e.g., "Graph database must not be empty").

## Workflow

1.  User: "You forgot X."
2.  Arela: "My apologies. Creating Guardrail..."
3.  Arela calls `arela_enforce(issue="Missing Documentation", solution="Check docs folder matches tool list")`.
4.  Tool generates `scripts/enforce_docs.ts`.
5.  Tool adds script to `package.json` -> `test` or `pre-commit`.

## Acceptance Criteria
- [ ] `arela_enforce` tool exists.
- [ ] Can generate a simple file-check script from a prompt.
- [ ] Auto-installs the script into the CI/CD pipeline (or pre-commit).
