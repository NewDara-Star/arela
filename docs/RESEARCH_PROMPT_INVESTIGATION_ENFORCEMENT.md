# Research Prompt: Investigation Enforcement for Agentic AI

**Date:** 2026-01-04
**Context:** Arela v5 - AI Memory Layer for Vibecoding
**Goal:** Design a system that makes following investigation rules the path of least resistance for AI agents

---

## The Core Problem

Observed behavior in agentic AI (LLM-based coding assistants):
1. **Shortcut preference:** AI jumps to "quick fixes" instead of understanding root causes
2. **Pattern matching over reasoning:** Applies familiar solutions without verifying they fit
3. **Failure blindness:** Moves on when something works without understanding WHY
4. **Escalation avoidance:** Exhausts all options before asking human for help

**Why this happens:**
- LLMs are trained to be helpful/responsive → speed over accuracy
- Path of least resistance = immediate action, not investigation
- No consequence for failed attempts (can just try again)
- Rules exist as text but have no programmatic enforcement

**What we want:**
- AI investigates before fixing
- AI documents its reasoning
- AI escalates to human early (not as last resort)
- Success is only valid if understood

---

## Research Questions

### 1. AI Self-Constraint Mechanisms

**Question:** How do current agentic systems constrain AI behavior programmatically?

Research areas:
- Constitutional AI (Anthropic) - Can principles be enforced, not just suggested?
- Tool use policies - How do systems like OpenAI Assistants limit tool access?
- Guardrails and gates - What patterns exist for blocking actions until conditions are met?
- ReAct and Chain-of-Thought - Can reasoning be required, not optional?

**Specific sub-questions:**
- Is there research on "investigation gates" that require documentation before action?
- How do systems track "failure state" in agentic loops?
- What prevents AI from circumventing self-imposed constraints?

### 2. Human-AI Collaboration Patterns

**Question:** What research exists on optimal human involvement timing in AI workflows?

Research areas:
- Human-in-the-loop systems - When should human be consulted?
- Escalation patterns - How to detect when AI is spinning without progress?
- Trust calibration - How does human learn when to trust vs verify AI?
- Pair programming with AI - Existing patterns for human-AI coding synergy

**Specific sub-questions:**
- Is there an optimal "failure count" before human escalation?
- How do successful teams split investigation vs execution between human and AI?
- What makes humans WANT to be consulted vs finding it annoying?

### 3. Structured Problem-Solving Enforcement

**Question:** How can structured methodologies be enforced on AI, not just recommended?

Research areas:
- Rubber duck debugging - Can AI be forced to explain before acting?
- Scientific method - Hypothesis → Experiment → Analysis flow
- 5 Whys and root cause analysis - Programmatic enforcement?
- Debugging methodologies (systematic elimination, bisection, etc.)

**Specific sub-questions:**
- Are there agentic systems that require hypothesis before code change?
- How to detect "symptom fixing" vs "root cause fixing"?
- Can we measure investigation quality programmatically?

### 4. Failure-Aware Agentic Systems

**Question:** How do agentic systems handle repeated failures differently than first attempts?

Research areas:
- Retry strategies with backoff - Does this apply to reasoning, not just API calls?
- Failure memory - Do agents learn from session failures?
- Escalation triggers - What signals indicate need for different approach?
- Self-reflection in agents - "Am I making progress or spinning?"

**Specific sub-questions:**
- Is tracking "same file edited N times" a good failure heuristic?
- How to distinguish "productive iteration" from "random attempts"?
- What's the optimal intervention point before sunk cost fallacy?

### 5. Existing Implementations

**Question:** What tools/systems already implement investigation enforcement?

Research areas:
- IDE extensions that require documentation before commit
- Code review systems that check for investigation evidence
- Debugging tools that enforce methodical approach
- AI coding assistants with built-in reasoning requirements

**Specific sub-questions:**
- Does Cursor, Copilot, Aider, or similar have investigation features?
- Are there MCP servers designed for reasoning/investigation?
- What can Arela learn from existing implementations?

---

## Arela-Specific Context

**Current state:**
- 11 MCP tools for context, memory, verification, etc.
- Session Guard blocks tools until context is read
- Pre-commit hook reminds about SCRATCHPAD
- Rules #11-15 in AGENTS.md (investigation, understanding, logging, asking for help)
- BUT: Rules are passive, not enforced

**Constraints:**
- Must work via MCP (AI calls tools, tools can gate actions)
- Should integrate with existing SCRATCHPAD pattern
- Shouldn't be so annoying that humans bypass it
- Must actually change AI behavior, not just add bureaucracy

**Open implementation questions:**
1. New `arela_investigate` tool vs. modifying existing tools?
2. Session-level failure tracking vs. task-level?
3. Soft enforcement (warnings) vs. hard (blocking)?
4. How to detect "failure" without user explicitly saying "that didn't work"?

---

## Success Criteria for Research

The research should provide:

1. **Existing patterns** - What's already been tried and what worked?
2. **Psychological insights** - Why do AI (and humans) shortcut? How to counter?
3. **Implementation options** - Concrete mechanisms for Arela's MCP architecture
4. **Trade-offs** - What's the cost of enforcement? Where's the balance?
5. **Novel ideas** - Anything not yet tried that could work?

---

## Deliverable

A document similar to `IMPLEMENTATION_SPEC_FINAL_25_PERCENT.md` that provides:
- State of the art in investigation enforcement
- Recommended approach for Arela
- Concrete implementation plan
- Risks and mitigations

---

## Meta-Note

This research prompt itself is an exercise in investigation before implementation. Instead of jumping to build `arela_investigate`, we're researching what's been tried, what works, and why.

**This is Rule #11 in action.**
