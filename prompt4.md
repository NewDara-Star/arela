
Prompts to Codex

A) Add research-derived rules

Create these files under packages/preset-cto/templates/.arela/rules/ with exact content.

015-modular-monolith.md

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

016-trunk-based-dev.md

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

017-dora-metrics.md

---
id: arela.dora_metrics
title: DORA Metrics Minimums
version: 1.0.0
tags: [metrics, ops]
research_origin: "DORA Four Keys"
---
Track and display: Deployment Frequency, Lead Time for Changes, Change Failure Rate, MTTR.
Requirement: add /docs/metrics.md updated weekly. PRs touching CI must include a line item updating DF/Lead Time trend.

070-testing-trophy.md

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

095-responsible-ai.md

---
id: arela.responsible_ai
title: Responsible AI Minimums
version: 1.0.0
tags: [ethics, ai]
research_origin: "Google AI Principles"
---
- Fairness: document intended user impact in ADR.
- Transparency: log model + prompt versions per release.
- Accountability: owner in ticket; postmortem template for incidents.
- Privacy/Security: secrets scanning in CI; PII redaction in logs.

096-context-engineering.md

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



B) Add two workflows

Under packages/preset-cto/templates/.arela/workflows/ add:

cto-decision-adr.prompt.md

---
id: workflow.cto_decision_adr
title: CTO Decision → ADR
placeholders: ["topic","options","constraints","tradeoffs"]
---
Produce ADR with Context, Decision, Consequences, Alternatives, Reversibility, Metrics to watch.
Inputs: {topic}, {options}, {constraints}, {tradeoffs}.

mom-test-interview.prompt.md

---
id: workflow.mom_test
title: YC Mom Test Interview
placeholders: ["problem_area"]
---
Generate a 15-minute script: ask past behavior, quantify pain, avoid hypotheticals, capture exact quotes.
Input: {problem_area}



C) Evaluation harness and doctor flag

Create packages/preset-cto/templates/.arela/evals/rubric.json:

{
  "categories": {
    "reasoning": "Invariants, trade-offs, edge cases",
    "correctness": "Types, tests, contracts satisfied",
    "maintainability": "Clarity, structure, ADR links",
    "safety": "Security, rollback plan, logs/traces",
    "ux_empathy": "Latency impact, error messages, offline behavior"
  },
  "scoring": { "minPass": 3.5, "avgPass": 4.0 }
}

Update src/cli.ts and src/loaders.ts:
	•	Add doctor --eval that reads .arela/evals/rubric.json if present and checks a PR report at .arela/.last-report.json for scores; fail if any < minPass or avg < avgPass. If file missing, print guidance and skip eval with a warning.
Rebuild after changes.

D) Research import command

Implement arela research import <dir>:
	•	Accept only .md summaries.
	•	For each .md, create a rule in .arela/rules/ with front-matter:
	•	id: arela.research.<slug>
	•	title: from first H1
	•	research_origin: basename of source file
	•	tags: ["research"]
	•	version: 1.0.0
	•	Do not overwrite existing IDs; if clash, append -v2.
	•	Write a mapping file .arela/research_index.json.
Add command to src/cli.ts, wire in loaders.ts, then rebuild.

E) Version bump

Set packages/preset-cto/package.json "version": "0.3.0" and rebuild.

