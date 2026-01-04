---
id: REQ-006
title: Memory Persistence (Scratchpad Logic)
type: feature
status: implemented
author: Arela
created: 2026-01-04
last_updated: 2026-01-04
---

# Memory Persistence

## Problem
Context must be updated intelligently, not just blindly appended, to prevent memory bloat and loss of structure.

## Solution
`arela_update` tool that supports both "append" (log mode) and "structured merge" (json mode) for smart updates.

## User Stories

### US-001: Append Updates
- **As an** AI agent
- **I want to** append text to the scratchpad
- **So that** I condition the next agent with my thought process.

### US-002: Structured Merging
- **As an** AI agent
- **I want to** pass a JSON object to update specific sections (e.g. "Completed Tasks")
- **So that** lists are updated in-place without duplication.

### US-003: Timestamping
- **As the** System
- **I want** every update to be automatically timestamped
- **So that** the timeline of work is preserved.

## Technical Specs
- **Files:** `slices/memory/logic.ts`
- **Logic:**
  - `mergeUpdates(existing, update)` function.
  - Heuristic detection of JSON payload in `content` string.
