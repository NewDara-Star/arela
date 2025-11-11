---
trigger: always_on
---

Default: modular monolith for ≤ 2 squads and < 10 bounded contexts.
Split only when ALL are true:
- Independent scaling hotspot proven by metrics
- Team/Conway boundary is stable
- Clear async contract defined (schema + SLOs)
Migration path: strangler pattern. Guardrails: shared types pkg, contract tests, tracing across boundary.