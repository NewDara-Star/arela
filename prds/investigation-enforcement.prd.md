---
id: REQ-003
title: "Investigation Enforcement System"
type: feature
status: draft
priority: high
created: 2026-01-04
updated: 2026-01-04
context:
  - src/mcp/server.ts
  - slices/investigation/*
  - AGENTS.md
tools:
  - arela_context
  - arela_update
handoff:
  target: coder-agent
  prompt: "Implement investigation gate based on this spec"
---

# Investigation Enforcement System

## Summary

Make following the investigation rules (AGENTS.md #11-14) the **path of least resistance**. Currently, taking shortcuts is easier than proper investigation. This system makes shortcuts harder and rule-following easier through programmatic enforcement.

---

## Problem Statement

**Observed behavior:** AI takes shortcuts when debugging:
- Jumps to "quick fixes" without understanding root cause
- Tries simpler approaches instead of investigating failures
- Moves on when something works without understanding WHY

**Root cause:** Rules are passive text. No programmatic consequence for ignoring them.

**Evidence from this session:**
1. Test script import error → tried different import paths instead of investigating build
2. User story extraction returning 0 → jumped to regex change instead of debugging
3. Only discovered build cache issue when user ran command and provided output

---

## Design Principles

1. **Shortcuts must be harder than investigation**
2. **Failures create escalating consequences**
3. **Success is only valid if understood**
4. **Human is always accessible (Rule #14)**

---

## User Stories

### US-001: Investigation Gate

**As a** user working with AI,  
**I want** the AI to log its investigation before attempting fixes,  
**So that** I can see the reasoning and catch shortcuts early.

**Acceptance Criteria:**
- [ ] Before any code edit after a failure, AI must document what it investigated
- [ ] Investigation log is visible in SCRATCHPAD
- [ ] Skip investigation → visible warning to user

### US-002: Failure Escalation

**As a** user working with AI,  
**I want** repeated failures to require more documentation,  
**So that** the AI can't keep trying random fixes without thinking.

**Acceptance Criteria:**
- [ ] First attempt: normal process
- [ ] After 1 failure: must log what was tried and why it failed
- [ ] After 2 failures: must ask user for help (Rule #14)
- [ ] Escalation resets on success

### US-003: Understanding Checkpoint

**As a** user working with AI,  
**I want** the AI to explain WHY something worked before moving on,  
**So that** we learn from successes, not just failures.

**Acceptance Criteria:**
- [ ] When a fix works, AI must document what it learned
- [ ] Documentation includes: what failed, what worked, WHY
- [ ] This becomes part of SCRATCHPAD for future sessions

---

## Proposed Solutions

### Option A: arela_investigate Tool (Recommended)

New MCP tool that must be called before retry attempts:

```typescript
arela_investigate({
  problem: "User story extraction returns 0",
  attempted: ["Changed regex pattern", "Modified section lookup"],
  hypothesis: "Sections are parsed correctly but regex doesn't match header format",
  evidence: "Section headers show 'US-001: Generate...' but regex uses /^US-\\d+:/"
  nextStep: "Add debug logging to see actual header values"
})
```

**Pros:**
- Programmatic enforcement via MCP
- Creates audit trail in SCRATCHPAD
- Can block other tools until investigation logged

**Cons:**
- Requires discipline to call
- Could become checkbox exercise

### Option B: Edit Gate in Session Guard

Modify Session Guard to track failure state:

```typescript
let failureCount = 0;
let lastInvestigationLogged = false;

// Before allowing code edits
if (failureCount > 0 && !lastInvestigationLogged) {
  return { blocked: true, error: "Log investigation before retry" };
}
```

**Pros:**
- Truly blocks shortcuts
- No discipline required

**Cons:**
- How to detect "failure"?
- May be too restrictive for minor edits

### Option C: Human Escalation Path

After N failures, REQUIRE user input:

```typescript
if (failureCount >= 2) {
  // Force notify_user before any more edits
  return { 
    blocked: true, 
    error: "Rule #14: You've failed twice. Ask the user for help."
  };
}
```

**Pros:**
- Enforces Rule #14 programmatically
- User becomes the investigation partner

**Cons:**
- User may find it annoying
- Doesn't teach AI to investigate independently

### Recommended: Hybrid Approach

1. **First failure:** Require `arela_investigate` before retry
2. **Second failure:** Require `arela_investigate` + must mention user could help
3. **Third failure:** Block all edits, force `notify_user`

---

## Implementation Plan

### Phase 1: Investigation Slice
- Create `slices/investigation/` with types and ops
- Add `arela_investigate` tool to MCP server
- Auto-log investigations to SCRATCHPAD

### Phase 2: Failure Tracking
- Track failure count per "task" (heuristic: same file being edited)
- Implement escalation logic in Session Guard

### Phase 3: Understanding Checkpoint
- After successful edit, prompt for "what did you learn?"
- Make this optional but visible

---

## Success Metrics

1. **Investigation logs appear before retry attempts**
2. **User reports seeing better problem-solving behavior**
3. **SCRATCHPAD contains useful debugging history**
4. **AI asks for help earlier (not after exhausting all options)**

---

## Open Questions

1. How do we detect "failure" programmatically?
   - User says "that didn't work"?
   - Same file edited multiple times in short period?
   - Test command returns error?

2. Should this apply to all edits or only after first failure?

3. How strict should enforcement be? (Warning vs Block)

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-04 | Human + AI | Initial draft during dogfooding session |
