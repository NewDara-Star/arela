---
id: arela.incident_response
title: Incident Response
category: operations
version: 1.0.0
---

# Incident Response Workflow

## Purpose

Systematic approach to handling production incidents. Stay calm, fix fast, learn always.

## Severity Levels

### P0 - Critical
**Impact:** Service down, data loss, security breach  
**Response:** Immediate, all hands  
**SLA:** Acknowledge < 5min, Resolve < 1hr

### P1 - High
**Impact:** Major feature broken, significant user impact  
**Response:** Within 15 minutes  
**SLA:** Acknowledge < 15min, Resolve < 4hr

### P2 - Medium
**Impact:** Minor feature broken, workaround exists  
**Response:** Within 1 hour  
**SLA:** Acknowledge < 1hr, Resolve < 24hr

### P3 - Low
**Impact:** Cosmetic issue, no user impact  
**Response:** Next business day  
**SLA:** Acknowledge < 24hr, Resolve < 1 week

## Incident Response Template

```markdown
# Incident: [INC-ID] - [Title]

**Severity:** P0 | P1 | P2 | P3  
**Status:** Investigating | Identified | Monitoring | Resolved  
**Started:** [timestamp]  
**Resolved:** [timestamp]  
**Duration:** [minutes]  
**Incident Commander:** [@name]  

## Impact

**Users Affected:** [number or %]  
**Services Down:** [list]  
**Data Loss:** Yes/No  
**Revenue Impact:** $[amount]  

## Timeline

- **[HH:MM]** - Incident detected (how?)
- **[HH:MM]** - Incident commander assigned
- **[HH:MM]** - Root cause identified
- **[HH:MM]** - Fix deployed
- **[HH:MM]** - Monitoring for stability
- **[HH:MM]** - Incident resolved

## Root Cause

[Detailed explanation of what went wrong]

## Resolution

[What was done to fix it]

## Action Items

- [ ] Immediate fix deployed
- [ ] Monitoring added
- [ ] Tests added to prevent recurrence
- [ ] Documentation updated
- [ ] Post-mortem scheduled
- [ ] Customer communication sent

## Communication

### Internal
- Slack: #incidents channel
- Status: Updated every 15 minutes

### External
- Status page: https://status.example.com
- Customer email: Sent if > 1hr downtime
- Social media: If public-facing

## Lessons Learned

[To be filled in post-mortem]
```

## Response Phases

### Phase 1: Detect (0-5 min)

**Goals:**
- Confirm incident is real
- Assess severity
- Assign incident commander

**Actions:**
1. Check monitoring alerts
2. Verify user reports
3. Assess impact (users, revenue, data)
4. Declare severity level
5. Assign IC (Incident Commander)
6. Create incident channel (#inc-123)

**Communication:**
```
🚨 INCIDENT DECLARED
Severity: P0
Impact: API down, all users affected
IC: @alice
Channel: #inc-123
Status page: Updated
```

### Phase 2: Investigate (5-30 min)

**Goals:**
- Identify root cause
- Gather context
- Form hypothesis

**Actions:**
1. Check recent deployments
2. Review error logs
3. Check infrastructure metrics
4. Query database for anomalies
5. Test hypothesis
6. Document findings

**Questions to Ask:**
- What changed recently?
- When did this start?
- Is it affecting all users or subset?
- Are there any patterns?
- What's different from normal?

### Phase 3: Fix (30-60 min)

**Goals:**
- Implement solution
- Deploy fix
- Verify resolution

**Actions:**
1. Implement fix (code, config, infrastructure)
2. Test fix in staging
3. Deploy to production
4. Monitor for stability
5. Verify user impact reduced

**Fix Strategies:**
- **Rollback:** Revert to last known good
- **Hotfix:** Quick patch and deploy
- **Scale:** Add more resources
- **Disable:** Turn off broken feature
- **Redirect:** Route to backup system

### Phase 4: Monitor (1-4 hrs)

**Goals:**
- Ensure stability
- Watch for recurrence
- Collect data

**Actions:**
1. Monitor error rates
2. Check user reports
3. Watch key metrics
4. Stay on call
5. Document observations

**Stability Criteria:**
- Error rate < baseline
- No new user reports
- Metrics returning to normal
- No related alerts

### Phase 5: Resolve (4+ hrs)

**Goals:**
- Declare incident over
- Communicate resolution
- Schedule post-mortem

**Actions:**
1. Verify all systems normal
2. Update status page
3. Notify customers
4. Thank the team
5. Schedule post-mortem (within 48hrs)
6. Close incident ticket

## Incident Commander Responsibilities

### During Incident

- **Lead:** Make decisions, delegate tasks
- **Communicate:** Update stakeholders every 15min
- **Coordinate:** Ensure team is focused
- **Document:** Keep timeline updated
- **Escalate:** Bring in help if needed

### After Incident

- **Post-mortem:** Schedule and facilitate
- **Follow-up:** Ensure action items completed
- **Learn:** Share lessons with team

## Communication Templates

### Internal Update (Every 15 min)

```
🔴 INCIDENT UPDATE [HH:MM]
Status: [Investigating/Fixing/Monitoring]
Impact: [Current state]
ETA: [When we expect resolution]
Next update: [+15 min]
```

### Customer Email

```
Subject: Service Disruption - [Date]

We experienced a service disruption today from [start] to [end].

What happened:
[Brief explanation]

Impact:
[What users experienced]

Resolution:
[What we did to fix it]

Prevention:
[What we're doing to prevent recurrence]

We apologize for the inconvenience.
```

### Status Page Update

```
🔴 Investigating
We're investigating reports of [issue]. 
Updates every 15 minutes.

🟡 Identified
We've identified the cause and are working on a fix.
ETA: [time]

🟢 Resolved
The issue has been resolved. All systems operational.
```

## Post-Mortem Template

```markdown
# Post-Mortem: [INC-ID] - [Title]

**Date:** [date]  
**Duration:** [minutes]  
**Severity:** P0 | P1 | P2 | P3  
**Attendees:** [list]  

## Summary

[2-3 sentence summary of what happened]

## Impact

- **Users Affected:** [number]
- **Duration:** [minutes]
- **Revenue Loss:** $[amount]
- **Customer Complaints:** [number]

## Timeline

[Detailed timeline from incident doc]

## Root Cause

[Deep dive into what went wrong]

### Contributing Factors

1. [Factor 1]
2. [Factor 2]
3. [Factor 3]

## What Went Well

- ✅ [Thing 1]
- ✅ [Thing 2]

## What Went Poorly

- ❌ [Thing 1]
- ❌ [Thing 2]

## Action Items

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Add monitoring for X | @alice | 2024-01-15 | ⏳ |
| Write test for Y | @bob | 2024-01-16 | ⏳ |
| Update runbook | @charlie | 2024-01-17 | ⏳ |

## Lessons Learned

1. [Lesson 1]
2. [Lesson 2]
3. [Lesson 3]

## Prevention

[How we'll prevent this from happening again]
```

## Best Practices

### Do's

✅ Stay calm and focused  
✅ Communicate frequently  
✅ Document everything  
✅ Fix first, blame never  
✅ Learn from every incident  

### Don'ts

❌ Panic or rush  
❌ Go silent  
❌ Skip documentation  
❌ Point fingers  
❌ Repeat mistakes  

## Incident Metrics

Track monthly:

- **MTTR:** Mean Time To Resolution
- **MTTD:** Mean Time To Detection
- **Incident Count:** By severity
- **Repeat Incidents:** Same root cause
- **Action Item Completion:** % done on time

**Healthy targets:**
- MTTR P0: < 1 hour
- MTTD: < 5 minutes
- Repeat Incidents: 0
- Action Items: 100% completion

## Summary

**When things break:**
1. Stay calm
2. Assess impact
3. Fix fast
4. Communicate clearly
5. Learn always

**Incidents are learning opportunities, not failures.**
