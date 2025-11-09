---
id: arela.trunk_based_dev
title: Trunk-Based Development
version: 1.0.0
tags: [workflow, delivery]
research_origin: "DORA + TBD comparison"
---
Rules:
- Small PRs to main behind flags; CI green at all times.
- Feature branches live < 24h.
- If PR > 300 LOC diff or > 4 files, split or justify.
CI Gate: fail if average PR lead time > 24h over last 20 PRs (optional hook).
