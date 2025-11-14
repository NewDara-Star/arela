---
trigger: always_on
---

Gate the PR on:
- Static checks clean; types precise; security warnings resolved.
- Tests: unit for business logic; integration for contracts; smoke e2e for core journeys.
- Simplicity over cleverness; invariants documented near code.
- Observability in critical paths (structured logs/traces).
- Rollback ready with release tag or flag.