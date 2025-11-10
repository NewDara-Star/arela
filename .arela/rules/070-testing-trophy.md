---
id: arela.testing_trophy
title: Testing Trophy Focus
version: 1.0.0
tags: [qa]
research_origin: "Kent C. Dodds — Trophy"
---
Priorities:
- Static analysis baseline (TS, ESLint) mandatory.
- Unit tests for pure logic only.
- Integration tests are the bulk; exercise real contracts (DB/API).
- E2E: thin smoke on critical flows.
CI Gate: integration suite must touch every public API route and every DB write path.
