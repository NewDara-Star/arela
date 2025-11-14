---
trigger: always_on
---

# Two-Way Door Decisions

## Principle

**Velocity is gated by decision-making speed.** Treating all decisions with equal gravity leads to paralysis. Aggressively categorize decisions to move fast.

## The Framework

All decisions fall into two types:

### Type 1: One-Way Doors (Irreversible)

**Definition:** Irreversible, high-consequence, extremely expensive to change.

**Examples:**
- Database paradigm choice (SQL vs. NoSQL)
- Core API contracts (public-facing)
- Data model commitments
- Compliance commitments (HIPAA, SOC 2)
- Programming language for core system
- Cloud provider lock-in

**Action:**
- Make slowly and deliberately
- Deep stakeholder consultation
- Extensive research and prototyping
- Document in ADR
- CTO approval required

**Time to decide:** Days to weeks

### Type 2: Two-Way Doors (Reversible)

**Definition:** Reversible, low-consequence, cheap to change. You can walk through the door, and if you don't like it, walk back.

**Examples:**
- Choice of JS library
- Internal component design
- CI/CD tool selection
- Caching TTL values
- Log levels
- UI color schemes
- Feature flag configurations

**Action:**
- Make rapidly with 70% certainty
- Delegate to lowest level (individual engineer)
- Document decision, not process
- Iterate based on data

**Time to decide:** Minutes to hours

## The Meta-Skill

The CTO's primary meta-skill is twofold:

1. **Correctly identify the 5% of decisions that are Type 1** and own them
2. **Create systems that convert Type 1 into Type 2** whenever possible

## Converting Type 1 → Type 2

### Technique 1: Feature Flags

**Problem:** Launching a new feature is Type 1 (can't easily undo)

**Solution:** Wrap in feature flag
- Deploy is Type 2 (can rollback code)
- Release is Type 2 (can toggle flag)
- Result: Launch becomes reversible

### Technique 2: Modular Architecture

**Problem:** Choosing a database is Type 1

**Solution:** Abstract behind interface
- Database is hidden behind repository pattern
- Swapping databases becomes Type 2
- Result: Database choice is less risky

### Technique 3: Strangler Pattern

**Problem:** Rewriting a monolith is Type 1

**Solution:** Incremental migration
- Extract one service at a time
- Each extraction is Type 2 (can revert)
- Result: Migration becomes reversible

### Technique 4: Prototyping

**Problem:** Choosing a framework is Type 1

**Solution:** Build spike solutions
- 2-day prototype with Option A
- 2-day prototype with Option B
- Compare with real data
- Result: Decision has evidence

## Decision Matrix

| Decision Type | Certainty Required | Stakeholders | Documentation | Time |
|---------------|-------------------|--------------|---------------|------|
| Type 1 | 90%+ | All affected | Full ADR | Days-Weeks |
| Type 2 | 70%+ | Individual/Team | Brief note | Minutes-Hours |

## Examples

### Type 1 Decisions

**Database Paradigm:**
```markdown
Decision: PostgreSQL vs. MongoDB

Why Type 1:
- Migration is months of work
- Affects every feature
- Team expertise required
- Data model implications

Process:
- 2-week evaluation period
- Build prototypes with both
- Benchmark performance
- Consult with team
- Write ADR
- CTO approval
```

**API Contract:**
```markdown
Decision: REST vs. GraphQL

Why Type 1:
- Public-facing API
- Client integrations depend on it
- Breaking changes affect users
- Versioning is complex

Process:
- Survey client needs
- Prototype both approaches
- Consider long-term maintenance
- Document tradeoffs
- Write ADR
- Stakeholder review
```

### Type 2 Decisions

**Caching Library:**
```markdown
Decision: node-cache vs. redis

Why Type 2:
- Internal implementation detail
- Can swap in a day
- No external dependencies
- Easy to benchmark

Process:
- Engineer picks node-cache (simpler)
- Ships it
- If performance issues, switch to redis
- Total time: 30 minutes
```

**Log Level:**
```markdown
Decision: info vs. debug in production

Why Type 2:
- Config change only
- Reversible in seconds
- No code changes
- Can A/B test

Process:
- Set to info
- Monitor for 1 week
- If debugging is hard, switch to debug
- Total time: 5 minutes
```

## Red Flags

### 🚨 Treating Type 2 as Type 1

**Symptom:** Spending weeks debating which CSS framework to use

**Problem:** Paralysis by analysis. Team velocity drops.

**Solution:** 
- Recognize it's Type 2
- Pick one with 70% confidence
- Ship it
- Iterate based on data

### 🚨 Treating Type 1 as Type 2

**Symptom:** "Let's just pick MongoDB and see how it goes"

**Problem:** Massive technical debt. Costly migration later.

**Solution:**
- Recognize it's Type 1
- Slow down
- Do proper evaluation
- Write ADR
- Get stakeholder buy-in

## Empowerment Culture

### Delegate Type 2 Decisions

**Bad:**
```
Engineer: "Should we use Axios or Fetch?"
CTO: "Let me think about it..."
[3 days later]
CTO: "Use Fetch"
```

**Good:**
```
Engineer: "Should we use Axios or Fetch?"
CTO: "That's Type 2. You decide. Document why."
Engineer: [Ships with Fetch in 30 minutes]
```

### Own Type 1 Decisions

**Bad:**
```
Engineer: "I picked MongoDB"
CTO: "Okay" [doesn't review]
[6 months later: migration nightmare]
```

**Good:**
```
Engineer: "I'm evaluating databases"
CTO: "That's Type 1. Let's do this together."
[Proper evaluation, ADR, team review]
```

## Communication

### Type 1 Announcement

```markdown
# ADR-042: Database Selection

**Status:** Decided
**Date:** 2024-01-15
**Decision Maker:** CTO
**Stakeholders:** All Engineering

## Context
We need a database for our core application.

## Decision
PostgreSQL (via Supabase)

## Rationale
- [Detailed analysis]
- [Tradeoffs considered]
- [Migration path]

## Consequences
- [What this enables]
- [What this constrains]
```

### Type 2 Announcement

```markdown
# Tech Note: Switched to Vite

**Date:** 2024-01-15
**Author:** @alice

Switched from Webpack to Vite for faster dev server.
Build time: 45s → 3s

Rollback: `git revert abc123`
```

## Metrics

Track monthly:

- **Decision Velocity:** Average time from question to decision
- **Type 1 Accuracy:** % of Type 1 decisions that were correct
- **Type 2 Reversals:** % of Type 2 decisions that were reversed
- **Paralysis Events:** # of decisions taking > 2 weeks

**Healthy targets:**
- Decision Velocity: < 2 days average
- Type 1 Accuracy: > 90%
- Type 2 Reversals: 10-20% (shows we're iterating)
- Paralysis Events: 0

## Summary

**Type 1 (5%):** Slow, deliberate, irreversible
- Database choice
- API contracts
- Compliance commitments

**Type 2 (95%):** Fast, delegated, reversible
- Libraries
- Tools
- Internal designs

**The goal:** Convert as many Type 1 decisions into Type 2 as possible through architecture, feature flags, and modular design.

**Fast decisions = high velocity = competitive advantage.**