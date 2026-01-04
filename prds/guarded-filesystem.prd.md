---
id: REQ-007
title: Guarded Filesystem
type: feature
status: implemented
author: Arela
created: 2026-01-04
last_updated: 2026-01-04
---

# Guarded Filesystem

## Problem
AI agents can accidentally destroy data. Direct filesystem access is dangerous. We need a layer that enforces safety protocols before every write.

## Solution
Wrap all `fs-extra` operations in a "Session Guard" check. Operations are only allowed if the investigation state permits it (or `AGENTS.md` has been read).

## User Stories

### US-001: Write Blocking
- **As a** Safety System
- **I want to** block `write_file` if the session is not initialized
- **So that** no unguided edits happen.

### US-002: Write Tracking
- **As an** Investigator
- **I want to** block `edit_file` if I am in a "ReadOnly" investigation state
- **So that** I don't change code while diagnosing a bug.

### US-003: Read Availability
- **As an** Agent
- **I want to** use `read_file` freely (but tracked)
- **So that** I can gather information without impediment.

## Technical Specs
- **Files:** `slices/fs/ops.ts`
- **Logic:**
  - `checkWriteAccessOp(toolName)` called before every write.
  - `requireSession()` called at server/tool level.
