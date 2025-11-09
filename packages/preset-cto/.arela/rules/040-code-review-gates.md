---
id: arela.code_review_gates
title: Code Review Quality Gates
version: 1.0.0
tags: [qa, review]
---
Gate the PR on:
- Static checks clean; types precise; security warnings resolved.
- Tests: unit for business logic; integration for contracts; smoke e2e for core journeys.
- Simplicity over cleverness; invariants documented near code.
- Observability in critical paths (structured logs/traces).
- Rollback ready with release tag or flag.
