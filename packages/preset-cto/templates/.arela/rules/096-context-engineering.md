---
id: arela.context_engineering
title: Context Engineering Protocol
version: 1.0.0
tags: [ai, context]
research_origin: "Context Integrity & local code indexing"
---
- Maintain local index of repo; agents must read .arela/** at session start.
- Define architectural invariants; test them.
- On context drift, run Context Integrity Check (what/why/fix) and halt.
