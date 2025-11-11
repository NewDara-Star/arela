---
id: arela.technical_debt_management
title: Technical Debt Management
category: architecture
severity: must
version: 1.0.0
---

# Technical Debt Management

## Principle

**Technical debt is not evil—unmanaged technical debt is.** Track it, prioritize it, and pay it down strategically.

## The 20% Rule

**Dedicate 20% of every sprint to technical debt.**

- 80% new features
- 20% refactoring, upgrades, debt paydown

**Why:** Prevents debt from compounding. Keeps codebase maintainable.

## Debt Classification

### Type 1: Deliberate & Prudent
**Example:** "We shipped fast with a monolith, knowing we'll need microservices later"

**Action:** Document in ADR, add to backlog with timeline

### Type 2: Deliberate & Reckless
**Example:** "We don't have time for tests, ship it anyway"

**Action:** STOP. This is never acceptable.

### Type 3: Inadvertent & Prudent
**Example:** "Now we know a better pattern exists"

**Action:** Refactor incrementally, document learnings

### Type 4: Inadvertent & Reckless
**Example:** "What's a design pattern?"

**Action:** Training needed. Refactor with mentorship.

## Debt Tracking

### Create Debt Tickets

```markdown
## Technical Debt: [DEBT-ID] - [Title]

**Type:** Deliberate/Inadvertent + Prudent/Reckless
**Severity:** Critical | High | Medium | Low
**Interest Rate:** How much slower does this make us? (%)
**Estimated Paydown:** [hours/days]

### Why This Exists
[Explanation of why debt was incurred]

### Cost of Keeping
- Slower feature development: X%
- Higher bug rate: Y%
- Developer frustration: Z/10
- Onboarding difficulty: +N days

### Paydown Plan
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

### ROI Calculation
Time to paydown: 2 days
Speed improvement: 15%
Break-even: 13 days
```

## Prioritization Matrix

| Severity | Interest Rate | Priority |
|----------|---------------|----------|
| Critical | High (>20%) | P0 - This sprint |
| Critical | Medium (10-20%) | P1 - Next sprint |
| High | High (>20%) | P1 - Next sprint |
| High | Medium (10-20%) | P2 - This quarter |
| Medium | Any | P3 - This year |
| Low | Any | P4 - Backlog |

## Red Flags

### 🚨 Pay Down Immediately

- Security vulnerabilities
- Data loss risks
- Production outages
- Blocking new features
- Team velocity < 50% of baseline

### ⚠️ Schedule Soon

- Deprecated dependencies
- Flaky tests (>10% failure rate)
- Code duplication (>3 copies)
- Missing documentation for critical systems
- Onboarding takes >2 weeks

### 📝 Track & Monitor

- Suboptimal patterns
- Minor performance issues
- Cosmetic code issues
- Nice-to-have refactors

## Enforcement

### Pre-commit

- New debt must have a ticket
- Debt tickets must have severity + interest rate
- Critical debt blocks PR merge

### Sprint Planning

- 20% capacity reserved for debt
- Debt tickets prioritized by ROI
- No sprint without debt paydown

### Quarterly Review

- Calculate total debt burden
- Measure velocity impact
- Adjust 20% rule if needed

## Metrics

Track these monthly:

- **Debt Ratio:** Lines of debt / Total lines
- **Interest Rate:** Velocity loss due to debt (%)
- **Paydown Rate:** Debt tickets closed / Sprint
- **Debt Age:** Average age of debt tickets (days)

**Healthy targets:**
- Debt Ratio: < 15%
- Interest Rate: < 10%
- Paydown Rate: ≥ 2 per sprint
- Debt Age: < 90 days

## Examples

### Good Debt Management

```
User: "Add payment processing"
CTO: "We'll use Stripe for MVP (deliberate debt).
      Later we'll need multi-provider support.
      Created DEBT-042 for Q3."
```

### Bad Debt Management

```
User: "Add payment processing"
Dev: "I'll build our own payment system!"
CTO: "..." (inadvertent reckless debt)
```

## Summary

- Track all debt explicitly
- Classify by type and severity
- Pay down 20% per sprint
- Prioritize by ROI
- Never let critical debt accumulate

**Managed debt = sustainable velocity.**
