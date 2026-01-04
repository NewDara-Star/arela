---
id: REQ-014
type: feature
title: Enforcement Checklist MCP
status: draft
created: 2026-01-04
priority: high
---

# Feature: Enforcement Checklist (The Gatekeeper) 🛑

## Context
The "Update Protocol" is currently a manual checklist in `AGENTS.md`. Users (and Agents) can skip it. The user wants this to be "Extremely Enforced" and actionable via MCP.

## Goals
1. **Programmatic Verification:** Don't just ask "Did you update docs?", check the file system/git status to *prove* it.
2. **Comprehensive Coverage:** Verify Guards, Docs, Tests, Task tracking, and Memory.
3. **Blocker Status:** If the checklist fails, the task is NOT done.

## User Stories
- **US-014-1:** As an agent, I want to call `arela_checklist` to see what hygiene steps I missed.
- **US-014-2:** As the system, I want to automatically run `npm run test:guards` when the checklist is invoked.
- **US-014-3:** As the system, I want to verify that `SCRATCHPAD.md` has been modified recently (smart staleness check).
- **US-014-4:** As the system, I want to warn if new code (`.ts`) exists without corresponding tests (`.spec.ts` or `.feature`).

## Implementation Plan (Slice: `slices/checklist`)

### 1. Operations (`ops.ts`)
- `checkGuards()`: Runs `npm run test:guards`.
- `checkDocs()`: 
    - Scans for modified `*.md` files.
    - **[NEW] Content Check:** Verifies PRD content matches code changes (via simple heuristics or LLM).
- `checkStructure()`:
    - **[NEW] VSA Enforcement:** Every slice MUST have `README.md`.
    - **[NEW] Tool Consistency:** If `tools.ts` exists, verified exposed tools map to `ops.ts`.
- `checkGraph()`:
    - **[NEW] Impact Analysis:** If `slices/A` changes, identify `slices/B` (dependent).
    - **[NEW] Cascading Verification:** Require tests for `slices/B` to run.
- `checkTests()`:
    - **[NEW] Orphan Detection:** Warn if `tests/features/X.feature` exists but `prds/X.prd.md` is missing.
    - **[NEW] Coverage:** Warn if `slices/X.ts` exists but `slices/X.test.ts` (or mapped feature) is missing.
- `checkMemory()`: Checks `SCRATCHPAD.md` mtime (< 15 mins).
- `checkTask()`: Checks `task.md` modification.

### 2. MCP Tool (`arela_checklist`)
- **Action:** `run`
- **Arguments:** `{ rigorous: boolean }` (default true)
- **Output:**
    - Table of passed/failed checks.
    - **Blocking Error:** If Critical checks fail.
    - **Impact Report:** "You changed `types.ts`, which affects `ops.ts`. Please verify `ops.ts`."

### 3. Enforcement
- **Active:** `arela_checklist` is suggested via `arela_status` if not run recently.
- **Passive:** `pre-commit` or `test:guards` can optionally invoke this.

## Architecture
```
slices/checklist/
├── README.md
├── types.ts          # ChecklistItem interface
├── ops.ts            # The verification logic (git/fs checks)
└── tools.ts          # MCP definition
```
