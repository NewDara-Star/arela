---
id: arela.ruthless_prioritization
title: Ruthless Prioritization (RICE)
category: product
version: 1.0.0
---

# Ruthless Prioritization Workflow

## Purpose

In a startup, the primary risk is not building poorly—it's building the wrong thing. This workflow ensures the team focuses on the ONE thing that matters most.

## The Problem

**Everyone has ideas. Most are good. You can't build them all.**

Without a framework:
- Loudest voice wins
- HiPPO (Highest Paid Person's Opinion) decides
- Politics over data
- Team builds everything, ships nothing

## The RICE Framework

**Formula:**
```
Priority Score = (Reach × Impact × Confidence) / Effort
```

### Reach (1-10)

**Question:** How many users/customers will this affect per time period?

**Scale:**
- 1 = < 100 users/month
- 3 = 100-1,000 users/month
- 5 = 1,000-10,000 users/month
- 7 = 10,000-100,000 users/month
- 10 = > 100,000 users/month

**Examples:**
- New landing page: 10 (all visitors)
- Admin dashboard feature: 2 (only admins)
- Core product feature: 8 (most users)

### Impact (1-10)

**Question:** How much will this move our North Star Metric?

**Scale:**
- 1 = Minimal impact (nice-to-have)
- 3 = Low impact (small improvement)
- 5 = Medium impact (noticeable improvement)
- 7 = High impact (significant improvement)
- 10 = Massive impact (game-changer)

**North Star Metric examples:**
- SaaS: Monthly Active Users (MAU)
- E-commerce: Revenue per visitor
- Social: Daily Active Users (DAU)
- Marketplace: Gross Merchandise Value (GMV)

### Confidence (1-10)

**Question:** How much data (vs. gut feeling) supports our Reach and Impact estimates?

**Scale:**
- 1 = Pure speculation
- 3 = Anecdotal evidence
- 5 = Some user research
- 7 = Strong user research + data
- 10 = A/B test results or proven elsewhere

**Examples:**
- "I think users want this": 2
- "5 users asked for this": 4
- "User research shows 70% want this": 7
- "A/B test showed 20% lift": 10

### Effort (1-10)

**Question:** How many person-weeks will this take?

**Scale:**
- 1 = < 1 day
- 2 = 1-3 days
- 3 = 1 week
- 5 = 2-3 weeks
- 7 = 1 month
- 10 = > 2 months

**Important:** Estimated by engineering team, not product/business.

## The Workflow

### Step 1: Brainstorm

**Collect all ideas:**
- From users
- From team
- From stakeholders
- From competitors

**No filtering yet.** Just capture everything.

### Step 2: Score Each Idea

**Use the RICE template:**

```markdown
## Idea: [Title]

**Description:** [1-2 sentences]

### Reach
**Score:** [1-10]
**Reasoning:** [Why this score?]

### Impact
**Score:** [1-10]
**Reasoning:** [How does this move our North Star?]

### Confidence
**Score:** [1-10]
**Reasoning:** [What data do we have?]

### Effort
**Score:** [1-10]
**Reasoning:** [Engineering estimate]

### RICE Score
**Calculation:** (Reach × Impact × Confidence) / Effort
**Score:** [number]
```

### Step 3: Rank by Score

Sort all ideas by RICE score (highest first).

### Step 4: Ruthlessly Cut

**The hard part:**

1. **Top 3:** These are your priorities
2. **Next 5:** Backlog (maybe later)
3. **Everything else:** Kill it

**Kill means:**
- Not "later"
- Not "when we have time"
- Actually say "no"
- Remove from backlog

### Step 5: Execute

**Focus on #1 only.**

When #1 ships, re-score everything and pick the new #1.

## Example Prioritization

### Scenario

SaaS product with 10,000 MAU. North Star Metric: MAU growth.

### Ideas to Prioritize

**Idea A: Mobile App**
- Reach: 8 (most users want mobile)
- Impact: 7 (could increase MAU 30%)
- Confidence: 6 (user research shows demand)
- Effort: 10 (6 months to build)
- **RICE:** (8 × 7 × 6) / 10 = **33.6**

**Idea B: Email Notifications**
- Reach: 10 (all users)
- Impact: 8 (re-engagement, proven to increase MAU)
- Confidence: 9 (A/B test data from competitors)
- Effort: 3 (2 weeks)
- **RICE:** (10 × 8 × 9) / 3 = **240**

**Idea C: Dark Mode**
- Reach: 6 (some users want it)
- Impact: 2 (nice-to-have, doesn't move MAU)
- Confidence: 5 (user requests)
- Effort: 4 (3 weeks)
- **RICE:** (6 × 2 × 5) / 4 = **15**

**Idea D: Onboarding Tutorial**
- Reach: 10 (all new users)
- Impact: 9 (reduces churn, proven to increase MAU)
- Confidence: 8 (data from similar products)
- Effort: 5 (3 weeks)
- **RICE:** (10 × 9 × 8) / 5 = **144**

### Ranking

1. **Email Notifications** (240) ← Build this first
2. **Onboarding Tutorial** (144) ← Build this second
3. **Mobile App** (33.6) ← Backlog
4. **Dark Mode** (15) ← Kill it

### Decision

**Build:** Email Notifications
**Why:** Highest RICE score, proven impact, low effort
**Timeline:** 2 weeks

**After shipping:** Re-score and pick next (likely Onboarding Tutorial)

**Kill:** Dark Mode (nice-to-have, low impact)

## Handling Disagreements

### Scenario: CEO wants Dark Mode

**Bad response:**
> "No, the RICE score is too low."

**Good response:**
> "Let's look at the RICE scores together:
> - Dark Mode: 15
> - Email Notifications: 240
> 
> Dark Mode has low Impact (2/10) because it doesn't move our North Star (MAU).
> 
> If you believe Impact should be higher, what data supports that? If we're wrong about Impact, let's update the score.
> 
> Otherwise, Email Notifications is 16x higher priority."

**The value:** Depersonalizes the debate. It's not "my opinion vs. yours." It's "what does the data say?"

### Scenario: Engineering says Effort is wrong

**Response:**
> "You're the experts on Effort. What should it be?
> 
> If Effort is 7 instead of 3, the RICE score drops from 240 to 103.
> 
> Does that change the ranking? Let's recalculate."

## Common Pitfalls

### 🚨 Pitfall 1: Building Everything

**Symptom:** "We'll do all of them, just at different times"

**Problem:** Nothing ships. Team is spread thin.

**Solution:** Pick ONE. Ship it. Then pick the next ONE.

### 🚨 Pitfall 2: Ignoring the Score

**Symptom:** "The score says X, but let's do Y anyway"

**Problem:** Framework is useless if you ignore it.

**Solution:** If you disagree with the score, challenge the inputs (Reach, Impact, Confidence, Effort), not the output.

### 🚨 Pitfall 3: Sandbagging Effort

**Symptom:** Engineers inflate Effort to kill ideas they don't like

**Problem:** Breaks trust, makes framework political.

**Solution:** Effort estimates must be honest. If there's disagreement, break down the work and estimate each piece.

### 🚨 Pitfall 4: Optimizing for Easy Wins

**Symptom:** Only building low-Effort ideas

**Problem:** Never tackle hard, high-impact work.

**Solution:** RICE naturally balances Effort with Impact. Trust the score.

## Quarterly Review

### Every Quarter

1. **Review last quarter's priorities**
   - Did we ship them?
   - Did they have the expected impact?
   - Were our RICE scores accurate?

2. **Update North Star Metric**
   - Has our focus changed?
   - Do we need a new metric?

3. **Re-score everything**
   - New data available?
   - Market changed?
   - Priorities shifted?

4. **Pick top 3 for next quarter**
   - Focus on #1
   - #2 and #3 are backup

## Template: RICE Scoring Sheet

```markdown
# RICE Prioritization: Q1 2024

**North Star Metric:** Monthly Active Users (MAU)
**Current MAU:** 10,000
**Goal:** 15,000 MAU by end of Q1

## Ideas

### 1. Email Notifications

**Description:** Send daily digest emails to re-engage inactive users

**Reach:** 10 (all users)
**Impact:** 8 (proven to increase MAU 20-30%)
**Confidence:** 9 (A/B test data from competitors)
**Effort:** 3 (2 weeks)

**RICE Score:** (10 × 8 × 9) / 3 = **240**

**Status:** ✅ Prioritized for Q1

---

### 2. Onboarding Tutorial

**Description:** Interactive tutorial for new users

**Reach:** 10 (all new users, ~1000/month)
**Impact:** 9 (reduces churn from 50% to 30%)
**Confidence:** 8 (data from similar products)
**Effort:** 5 (3 weeks)

**RICE Score:** (10 × 9 × 8) / 5 = **144**

**Status:** ✅ Prioritized for Q1

---

### 3. Mobile App

**Description:** Native iOS and Android apps

**Reach:** 8 (most users want mobile)
**Impact:** 7 (could increase MAU 30%)
**Confidence:** 6 (user research)
**Effort:** 10 (6 months)

**RICE Score:** (8 × 7 × 6) / 10 = **33.6**

**Status:** 📋 Backlog (Q2 maybe)

---

### 4. Dark Mode

**Description:** Dark theme for UI

**Reach:** 6 (some users want it)
**Impact:** 2 (nice-to-have, doesn't move MAU)
**Confidence:** 5 (user requests)
**Effort:** 4 (3 weeks)

**RICE Score:** (6 × 2 × 5) / 4 = **15**

**Status:** ❌ Killed (low impact)

---

## Q1 Priorities

1. **Email Notifications** (RICE: 240)
2. **Onboarding Tutorial** (RICE: 144)
3. [Reserve for urgent items]

## Killed Ideas

- Dark Mode (RICE: 15) - Low impact on MAU
- [Other killed ideas]
```

## Summary

**The RICE Framework:**
- **R**each: How many users?
- **I**mpact: How much does it move the North Star?
- **C**onfidence: How much data do we have?
- **E**ffort: How long will it take?

**The Process:**
1. Brainstorm all ideas
2. Score each with RICE
3. Rank by score
4. Pick top 3
5. Kill everything else
6. Execute #1

**The Goal:** Focus the entire team on the ONE thing that matters most.

**Ruthless prioritization = high velocity = competitive advantage.**
