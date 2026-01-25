# Core Concepts

## Context Teleportation

The central idea of Arela is that **context lives in files, not in AI memory**.

When you save your session state to `SCRATCHPAD.md`:
1. You can close the chat
2. Open a new chat (even with a different AI)
3. The new AI reads the scratchpad
4. It "teleports" into your exact context

This breaks the limitation of AI sessions being isolated.

## The Two Sacred Files

### AGENTS.md — The Constitution

This file defines your project's identity:
- What the project is
- Technology stack
- Coding rules
- Behavioral expectations

Every AI session starts by reading this file. It's the "personality injection" for Arela.

### SCRATCHPAD.md — The Memory

This file tracks:
- What was accomplished
- Decisions made
- Current blockers
- Next steps

It's append-only by default (to prevent accidental data loss).

## Mandatory Tool Usage

Arela enforces a governance model where AI must use tools before acting:

| Action | Required Tool |
|--------|---------------|
| Searching for code | `arela_vector_search` first |
| Refactoring | `arela_graph_impact` first |
| Stating facts | `arela_verify` first |
| Planning features | Use `arela_prd` if a PRD exists |

This is encoded in `AGENTS.md` as Rule #7.
 
 ## The Session Guard
 
 **Trust is good, but enforcement is better.**
 
 Arela v5 introduces a programmatic **Session Guard** that prevents "vibe coding" (making changes based on guesses).
 
 - **Blocked by Default:** You cannot write/edit code in `DISCOVERY` mode.
 - **Investigate First:** You must use tools (`log_symptom` -> `register_hypothesis`) to prove you understand the problem.
 - **Unlock Access:** Only after `confirm_hypothesis` can you enter `IMPLEMENTATION` mode and edit files.
 
 This forces the AI to behave like a Senior Engineer: Measure twice, cut once.

## Vertical Slice Architecture

Each feature is a self-contained "slice":

```
slices/
├── context/      # Reading AGENTS + SCRATCHPAD
├── memory/       # Writing to SCRATCHPAD
├── verification/ # Fact-checking
├── graph/        # Dependency analysis
├── vector/       # Semantic search
├── dashboard/    # Repo dashboard export
├── focus/        # Context compression
├── translate/    # Vibe → Plan (internal-only)
└── shared/       # Common utilities
```

Each slice has:
- `README.md` — Documentation
- `*.ts` — Implementation
- Its own types and logic

## The Feedback Loop

```
┌──────────────────────────────────────────┐
│                                          │
│   User gives "Vibe"                      │
│         │                                │
│         ▼                                │
│   Plan (PRD or external)                 │
│         │                                │
│         ▼                                │
│   AI Executes (using Arela tools)        │
│         │                                │
│         ▼                                │
│   Arela Updates SCRATCHPAD               │
│         │                                │
│         ▼                                │
│   Next Session Reads Context  ───────────┼──┐
│                                          │  │
└──────────────────────────────────────────┘  │
                    ▲                         │
                    └─────────────────────────┘
```

This creates a continuous memory loop across sessions.
