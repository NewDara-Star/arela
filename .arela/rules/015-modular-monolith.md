---
id: arela.modular_monolith
title: Modular Monolith First
version: 1.0.0
tags: [architecture]
research_origin: "Building the Ideal Startup CTO Persona — Architecture Trade-offs"
---
Default: modular monolith for ≤ 2 squads and < 10 bounded contexts.
Split only when ALL are true:
- Independent scaling hotspot proven by metrics
- Team/Conway boundary is stable
- Clear async contract defined (schema + SLOs)
Migration path: strangler pattern. Guardrails: shared types pkg, contract tests, tracing across boundary.
