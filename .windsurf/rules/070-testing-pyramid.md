---
trigger: always_on
---

Targets:
- Unit: fast, isolated, deterministic. Target ≥85% for critical modules.
- Integration: real DB or container, no mocks on public contracts.
- E2E: few, stable smoke tests for the top user journeys.
All tests must run in CI and be reproducible locally.