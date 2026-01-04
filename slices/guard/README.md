# Session Guard Slice

The Investigation Enforcement layer for Arela v5.

## Purpose

Prevents "vibe coding" by enforcing investigation before code modification. The Session Guard implements an **Investigation State Machine (ISM)** that blocks write operations until the agent has demonstrated understanding of the problem.

## The Problem

LLMs tend to:
1. Jump straight to solutions (skipping root cause analysis)
2. "Thrash" on failed fixes instead of investigating
3. Pattern-match symptoms to common fixes without verifying

## The Solution

**Privilege Escalation Model:**
- Default state: **READ-ONLY** (can grep, view files, run tests)
- Escalated state: **WRITE** (can edit_file, write_file)

To escalate, the agent must:
1. Log the symptom (`arela_log_symptom`)
2. Register a hypothesis (`arela_register_hypothesis`)
3. Confirm the hypothesis via testing (`arela_confirm_hypothesis`)

## State Machine

```
┌─────────────┐    arela_log_symptom    ┌─────────────┐
│  DISCOVERY  │ ─────────────────────▶  │  ANALYSIS   │
│   (S0)      │                         │   (S1)      │
└─────────────┘                         └──────┬──────┘
                                               │
                              arela_register_hypothesis
                                               │
                                               ▼
┌─────────────┐  arela_confirm_hypothesis ┌─────────────┐
│IMPLEMENTATION│ ◀────────────────────── │ VERIFICATION│
│   (S3)      │                          │   (S2)      │
└─────────────┘                          └──────┬──────┘
       │                                        │
       │                       arela_reject_hypothesis
       │                                        │
       │                                        ▼
       │                                 (back to S1)
       │
       │  arela_verify_fix
       ▼
┌─────────────┐
│   REVIEW    │ ─────▶ (reset to S0)
│   (S4)      │
└─────────────┘
```

## Tools Provided

| Tool | Description | Transition |
|------|-------------|------------|
| `arela_log_symptom` | Log error/issue details | S0 → S1 |
| `arela_register_hypothesis` | Submit hypothesis with evidence | S1 → S2 |
| `arela_confirm_hypothesis` | Hypothesis verified by test | S2 → S3 |
| `arela_reject_hypothesis` | Hypothesis disproven | S2 → S1 |
| `arela_escalate` | Request human help | Any → Human |
| `arela_guard_status` | Check current state | None |

## Policy Enforcement

### Blocked Actions in Read-Only States (S0, S1, S2)
- `edit_file`
- `write_file`
- `replace_string`
- `git_commit`

### Validation Rules
- Hypothesis `reasoning_chain` must be >20 words
- Hypothesis `suspected_root_cause` must be >10 words
- `evidence_files` must contain files actually read in session
- Repeated identical reasoning triggers rejection

## Files

- `types.ts` - TypeScript types and Zod schemas
- `state-machine.ts` - ISM logic
- `policy.ts` - Enforcement rules
- `ops.ts` - Tool operations
