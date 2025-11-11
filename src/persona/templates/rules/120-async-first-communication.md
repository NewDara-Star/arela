---
id: arela.async_first_communication
title: Async-First Communication
category: process
severity: should
version: 1.0.0
---

# Async-First Communication

## Principle

**Synchronous meetings are a bug, not a feature.** Default to asynchronous, written communication to maximize deep work and create a living archive of decisions.

## The Doctrine

Modeled after GitLab's handbook:

1. **Async is the default** - Meetings are the exception
2. **Write it down** - If it's not written, it doesn't exist
3. **Single Source of Truth** - One place for all information
4. **Assume positive intent** - Text lacks tone, assume the best

## Why Async-First?

### Benefits

**Deep Work:**
- No meeting interruptions
- Engineers control their schedule
- 4-hour blocks of focus time
- Higher quality output

**Documentation:**
- Decisions are automatically documented
- New team members can catch up
- No "you had to be there" knowledge
- Searchable history

**Inclusivity:**
- Works across time zones
- Non-native speakers have time to compose
- Introverts can contribute equally
- No "loudest voice wins"

**Efficiency:**
- No scheduling overhead
- No "could have been an email"
- Parallel work streams
- Faster decision-making

### Costs

**Slower for some things:**
- High-bandwidth conflict resolution
- Brainstorming sessions
- Team bonding
- Urgent decisions

**Requires discipline:**
- Must write clearly
- Must check async channels
- Must respond promptly
- Must document everything

## Communication Hierarchy

### Level 1: Written, Async (Default)

**Tools:** GitHub Issues, PRs, Notion, Slack threads

**Use for:**
- Feature proposals
- Bug reports
- Code reviews
- Architecture decisions
- Status updates
- Questions with non-urgent answers

**Response time:** Within 24 hours

### Level 2: Synchronous Chat (Rare)

**Tools:** Slack DMs, quick calls

**Use for:**
- Urgent blockers
- Quick clarifications (< 5 min)
- Time-sensitive coordination

**Response time:** Within 1 hour (during work hours)

### Level 3: Synchronous Meeting (Last Resort)

**Tools:** Zoom, Google Meet

**Use for:**
- High-bandwidth conflict resolution
- Quarterly planning
- Team retrospectives
- 1-on-1s
- Interviews

**Requirements:**
- Must have written agenda
- Must have pre-read materials
- Must produce written output
- Must be recorded (if possible)

## Single Source of Truth (SSoT)

### The Rule

**Every piece of information has exactly one canonical location.**

### Anti-Pattern: Information Silos

❌ **Bad:**
```
- Feature spec in Google Doc
- Discussion in Slack
- Decision in email
- Implementation notes in Notion
- Code in GitHub
```

**Problem:** Information is scattered. New team members can't find anything.

✅ **Good:**
```
- Everything in GitHub Issue
- Spec, discussion, decision, implementation notes
- Code linked in PR
- Single URL to share
```

### Documentation Structure

```
/docs
├── /architecture
│   ├── overview.md
│   └── /adr (Architecture Decision Records)
├── /runbooks
│   ├── deployment.md
│   ├── incident-response.md
│   └── on-call.md
├── /guides
│   ├── onboarding.md
│   ├── code-review.md
│   └── testing.md
└── /rfcs (Request for Comments)
    ├── 001-new-feature.md
    └── 002-migration-plan.md
```

## Writing Guidelines

### Be Clear and Concise

**Bad:**
> "I think maybe we should possibly consider perhaps looking into the idea of potentially using Redis for caching if that makes sense?"

**Good:**
> "Proposal: Use Redis for caching. Rationale: [3 bullet points]. Tradeoffs: [2 bullet points]. Decision needed by: Friday."

### Use Structure

**Bad:**
> [Wall of text with no structure]

**Good:**
```markdown
## Problem
[What's wrong?]

## Proposal
[What should we do?]

## Alternatives Considered
1. Option A - [why not]
2. Option B - [why not]

## Decision
[What we're doing and why]

## Next Steps
- [ ] Task 1 (@owner)
- [ ] Task 2 (@owner)
```

### Assume Positive Intent

**Bad interpretation:**
> "Your code is wrong" → "You're incompetent"

**Good interpretation:**
> "Your code is wrong" → "There's a bug we should fix together"

**Better communication:**
> "I found a bug in line 42. Here's a test case that fails. Want me to submit a fix?"

## Meeting Guidelines

### When to Have a Meeting

**Good reasons:**
- ✅ High-bandwidth conflict (people disagree strongly)
- ✅ Brainstorming (need rapid back-and-forth)
- ✅ Team bonding (social connection)
- ✅ Sensitive topics (performance reviews, layoffs)

**Bad reasons:**
- ❌ Status updates (use async)
- ❌ Information sharing (use docs)
- ❌ Decision announcement (use async)
- ❌ "We always have this meeting" (question it)

### Meeting Requirements

**Before the meeting:**
- [ ] Written agenda shared 24h in advance
- [ ] Pre-read materials provided
- [ ] Clear decision to be made or outcome expected
- [ ] Optional attendees marked as optional

**During the meeting:**
- [ ] Start on time
- [ ] One person takes notes
- [ ] Stay on agenda
- [ ] End early if possible

**After the meeting:**
- [ ] Notes published within 2 hours
- [ ] Action items assigned with owners
- [ ] Decisions documented
- [ ] Recording shared (if recorded)

### Meeting Template

```markdown
# Meeting: [Title]

**Date:** [date]
**Time:** [time + timezone]
**Duration:** [30 min]
**Attendees:** @alice, @bob, @charlie
**Optional:** @dave

## Agenda

1. [Topic 1] (10 min) - Decision needed
2. [Topic 2] (15 min) - Discussion
3. [Topic 3] (5 min) - Update

## Pre-read

- [Link to proposal]
- [Link to data]

## Notes

[Live notes during meeting]

## Decisions

- **Decision 1:** [What we decided]
- **Decision 2:** [What we decided]

## Action Items

- [ ] Task 1 (@owner, due: date)
- [ ] Task 2 (@owner, due: date)
```

## Async Decision-Making

### RFC (Request for Comments) Process

**For major decisions:**

1. **Author writes RFC**
   - Problem statement
   - Proposed solution
   - Alternatives considered
   - Tradeoffs

2. **Team reviews async**
   - Comments on document
   - Asks questions
   - Proposes alternatives
   - 3-5 day review period

3. **Author addresses feedback**
   - Updates RFC
   - Responds to comments
   - Clarifies ambiguities

4. **Decision made**
   - Approver makes final call
   - Decision documented in RFC
   - RFC marked as "Accepted" or "Rejected"

### Example RFC

```markdown
# RFC-042: Migrate to Microservices

**Status:** Under Review
**Author:** @alice
**Approver:** @cto
**Review Period:** 2024-01-15 to 2024-01-20

## Problem

Our monolith is becoming difficult to scale. Multiple teams are blocked by each other's release cycles.

## Proposal

Extract the payment service into a separate microservice.

### Architecture

[Diagram]

### Migration Plan

1. Phase 1: [details]
2. Phase 2: [details]

### Timeline

3 months

### Cost

$5K/month additional infrastructure

## Alternatives Considered

### Alternative 1: Optimize Monolith

**Pros:** [list]
**Cons:** [list]
**Why not:** [reason]

### Alternative 2: Extract Different Service

**Pros:** [list]
**Cons:** [list]
**Why not:** [reason]

## Tradeoffs

**Pros:**
- Team autonomy
- Independent scaling
- Fault isolation

**Cons:**
- Increased complexity
- Network latency
- Distributed transactions

## Open Questions

1. How do we handle distributed transactions?
2. What's the rollback plan?

## Comments

**@bob (2024-01-16):**
> What about the user service? Should we extract that too?

**@alice (2024-01-16):**
> Good question. Let's do payment first, learn, then decide on user service.

## Decision

[To be filled after review period]
```

## Async Code Review

### PR Description Template

```markdown
## What

[One-line summary]

## Why

[Link to issue/ticket]
[Business context]

## How

[Technical approach]
[Key design decisions]

## Testing

- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manually tested locally
- [ ] Tested in staging

## Screenshots

[If UI changes]

## Checklist

- [ ] Tests pass
- [ ] Docs updated
- [ ] No breaking changes
- [ ] Backward compatible

## Review Notes

[Anything reviewers should focus on]
[Known limitations]
[Follow-up work needed]
```

### Review Guidelines

**Reviewer:**
- Respond within 24 hours
- Be specific and constructive
- Suggest, don't demand
- Approve if "good enough"

**Author:**
- Respond to all comments
- Mark resolved when addressed
- Don't take feedback personally
- Merge when approved

## Async Standups

### Daily Update Template

**Instead of synchronous standup:**

```markdown
## Update: 2024-01-15

**Yesterday:**
- ✅ Completed: Feature X
- ✅ Completed: Bug fix Y

**Today:**
- 🚧 Working on: Feature Z
- 🚧 Working on: Code review

**Blockers:**
- ⚠️ Waiting for design approval on Feature Z

**Help Needed:**
- Need someone to review PR #123
```

**Post in:** Slack channel or GitHub Discussion

**Timing:** Post by 10am your timezone

## Tools

### Recommended Stack

**Documentation:**
- Notion (wiki, docs)
- GitHub (code, issues, PRs)
- Miro (diagrams, brainstorming)

**Communication:**
- Slack (chat, but use threads)
- Loom (async video)
- GitHub Discussions (long-form)

**Meetings:**
- Zoom (when necessary)
- Otter.ai (transcription)
- Grain (recording + highlights)

## Metrics

Track monthly:

- **Meeting Hours:** Total hours in meetings per person
- **Response Time:** Average time to first response (async)
- **Documentation Coverage:** % of decisions documented
- **Meeting Efficiency:** % of meetings with pre-read + notes

**Healthy targets:**
- Meeting Hours: < 10 hours/week per person
- Response Time: < 4 hours
- Documentation Coverage: > 95%
- Meeting Efficiency: 100%

## Summary

**Default to async:**
- Write it down
- Single source of truth
- Assume positive intent
- Meetings are last resort

**Benefits:**
- Deep work
- Better documentation
- Inclusive
- Efficient

**The goal:** A team that communicates clearly, documents everything, and maximizes focus time.

**Async-first = high velocity + high quality.**
