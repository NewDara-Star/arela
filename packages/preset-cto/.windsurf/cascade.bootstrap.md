SYSTEM: Arela Bootstrap (preset-cto)

Load `.arela/rules/*` and `.arela/workflows/*`. If any file is missing, ask for it before proceeding.

Rules:

- .arela/rules/140-investigate-failures.md
- .arela/rules/130-automated-qa.md
- .arela/rules/120-async-first-communication.md
- .arela/rules/110-performance-budget.md
- .arela/rules/100-multi-agent-orchestration.md
- .arela/rules/096-context-engineering.md
- .arela/rules/095-responsible-ai.md
- .arela/rules/090-adr-discipline.md
- .arela/rules/085-blameless-culture.md
- .arela/rules/080-observability-minimums.md
- .arela/rules/070-testing-trophy.md
- .arela/rules/070-testing-pyramid.md
- .arela/rules/060-security-first.md
- .arela/rules/050-technical-debt-management.md
- .arela/rules/040-code-review-gates.md
- .arela/rules/030-ticket-format.md
- .arela/rules/025-two-way-door-decisions.md
- .arela/rules/020-context-integrity.md
- .arela/rules/017-dora-metrics.md
- .arela/rules/016-trunk-based-dev.md
- .arela/rules/015-modular-monolith.md
- .arela/rules/010-pragmatic-visionary.md

Workflows:

- .arela/workflows/tech-hiring.prompt.md
- .arela/workflows/ruthless-prioritization.prompt.md
- .arela/workflows/qa-automation.prompt.md
- .arela/workflows/mom-test-interview.prompt.md
- .arela/workflows/incident-response.prompt.md
- .arela/workflows/engineer-ticket.prompt.md
- .arela/workflows/delegate-agent-ticket.prompt.md
- .arela/workflows/cto-decision-adr.prompt.md
- .arela/workflows/architect-spec.prompt.md

Enforce: arela.context_integrity, arela.ticket_format, arela.code_review_gates, arela.testing_trophy, arela.observability_minimums.

Maintain arela.context_integrity; halt and run a Context Integrity Check on drift.

For every task, return a Report (summary, acceptance checklist status, test outputs, UI proof if applicable).

Files:
- .arela/rules/140-investigate-failures.md
- .arela/rules/130-automated-qa.md
- .arela/rules/120-async-first-communication.md
- .arela/rules/110-performance-budget.md
- .arela/rules/100-multi-agent-orchestration.md
- .arela/rules/096-context-engineering.md
- .arela/rules/095-responsible-ai.md
- .arela/rules/090-adr-discipline.md
- .arela/rules/085-blameless-culture.md
- .arela/rules/080-observability-minimums.md
- .arela/rules/070-testing-trophy.md
- .arela/rules/070-testing-pyramid.md
- .arela/rules/060-security-first.md
- .arela/rules/050-technical-debt-management.md
- .arela/rules/040-code-review-gates.md
- .arela/rules/030-ticket-format.md
- .arela/rules/025-two-way-door-decisions.md
- .arela/rules/020-context-integrity.md
- .arela/rules/017-dora-metrics.md
- .arela/rules/016-trunk-based-dev.md
- .arela/rules/015-modular-monolith.md
- .arela/rules/010-pragmatic-visionary.md
- .arela/workflows/tech-hiring.prompt.md
- .arela/workflows/ruthless-prioritization.prompt.md
- .arela/workflows/qa-automation.prompt.md
- .arela/workflows/mom-test-interview.prompt.md
- .arela/workflows/incident-response.prompt.md
- .arela/workflows/engineer-ticket.prompt.md
- .arela/workflows/delegate-agent-ticket.prompt.md
- .arela/workflows/cto-decision-adr.prompt.md
- .arela/workflows/architect-spec.prompt.md
