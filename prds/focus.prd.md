---
id: REQ-012
title: Context Rolling (Focus)
type: feature
status: implemented
author: Arela
created: 2026-01-04
last_updated: 2026-01-04
---

# Context Rolling (Focus)

## Problem
`SCRATCHPAD.md` grows indefinitely, exceeding token limits. We need a way to compress it without losing history.

## Solution
`arela_focus` tool that summarizes the scratchpad using LLM, archiving the full log to `.arela/scratchpad_archive/`.

## User Stories

### US-001: Archival
- **As an** Agent
- **I want to** call `arela_focus`
- **So that** the current scratchpad is saved to a timestamped file.

### US-002: Summarization
- **As an** Agent
- **I want to** see a concise summary in the rolled scratchpad
- **So that** I maintain context without token overload.

## Technical Specs
- **Files:** `slices/focus/ops.ts`
- **Logic:**
  - `archiveScratchpad()`: Moves content.
  - `summarizeContent()`: Calls OpenAI.
