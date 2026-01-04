---
id: REQ-008
title: Investigation State Machine
type: feature
status: implemented
author: Arela
created: 2026-01-04
last_updated: 2026-01-04
---

# Investigation State Machine

## Problem
Developers (and AI) jump to "fixes" without understanding the problem. We need to enforce a scientific method workflow.

## Solution
A State Machine that gates write access based on the current investigation stage.

## User Stories

### US-001: Symptom Logging (Start)
- **As an** Investigator
- **I want to** log a symptom (error)
- **So that** the session enters `ANALYSIS` mode (Write Blocked).

### US-002: Hypothesis Registration
- **As an** Investigator
- **I want to** register a hypothesis
- **So that** the session enters `VERIFICATION` mode (Write Blocked).

### US-003: Hypothesis Confirmation
- **As an** Investigator
- **I want to** confirm my hypothesis with evidence
- **So that** the session enters `IMPLEMENTATION` mode (Write Granted).

### US-004: Escalation
- **As an** Investigator
- **I want to** escalate to a human if I fail repeated attempts
- **So that** I don't loop endlessly.

## Technical Specs
- **Files:** `slices/guard/state-machine.ts`
- **States:** `DISCOVERY` -> `ANALYSIS` -> `VERIFICATION` -> `IMPLEMENTATION`.
- **Transitions:** Controlled by `logSymptom`, `registerHypothesis`, `confirmHypothesis`.
