---
id: REQ-011
title: Requirements Management (PRD Slice)
type: feature
status: implemented
author: Arela
created: 2026-01-04
last_updated: 2026-01-04
---

# Requirements Management (PRD Slice)

## Problem
Requirements are often scattered in chats or heads. We need them as "source code" in the repo.

## Solution
`arela_prd` tool to Manage PRDs: structured Markdown files with YAML frontmatter.

## User Stories

### US-001: Create PRD
- **As an** Agent
- **I want to** call `arela_prd create`
- **So that** I start with a standard template.

### US-002: Parse PRD
- **As an** Agent
- **I want to** call `arela_prd parse`
- **So that** I can extract user stories and specs programmatically.

### US-003: List PRDs
- **As an** Agent
- **I want to** call `arela_prd list`
- **So that** I see what features are planned or implemented.

## Technical Specs
- **Files:** `slices/prd/ops.ts`, `slices/prd/types.ts`
- **Logic:**
  - `gray-matter` for parsing frontmatter.
  - Regex for extracting User Stories (`US-XXX`).
