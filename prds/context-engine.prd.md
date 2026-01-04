---
id: REQ-004
title: Context Engine (Teleportation & Memory)
type: feature
status: implemented
author: Arela
created: 2026-01-04
last_updated: 2026-01-04
---

# Context Engine

## Problem
AI agents lack persistence. Every session starts blank. We need a way to "teleport" context (rules + memory) from one agent incarnation to the next.

## Solution
A standardized protocol reading strictly defined markdown files (`AGENTS.md`, `SCRATCHPAD.md`) at the start of every session.

## User Stories

### US-001: Context Teleportation
- **As an** AI agent
- **I want to** call `arela_context` at the start of a session
- **So that** I immediately know the project rules and previous work history.

### US-002: Memory Persistence
- **As an** AI agent
- **I want to** call `arela_update` with new logs
- **So that** my work is saved for the next agent.

### US-003: Rule Enforcement (The Gatekeeper)
- **As a** Project Owner
- **I want** all tools to be blocked until `arela_context` is called
- **So that** no agent acts without reading the rules first.

## Technical Specs
- **Files:**
    - `AGENTS.md`: Read-only rules.
    - `SCRATCHPAD.md`: Read-write memory.
- **Enforcement:**
    - `requireSession()` guard in `src/mcp/server.ts` (or now `src/mcp/tools/*.ts`).
    - Attempting to use `writeFile` before `arela_context` must fail.
