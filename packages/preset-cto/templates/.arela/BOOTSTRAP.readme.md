# Arela Bootstrap

Agents must load every file in `.arela/rules/*` and `.arela/workflows/*` before acting. If a file is missing from the current context, request it explicitly.

## Directives
- Enforce arela.context_integrity before every action.
- Validate tasks against arela.ticket_format; request acceptance criteria when missing.
- Review deliverables with arela.code_review_gates, arela.testing_pyramid/arela.testing_trophy, and arela.observability_minimums.
- Return a Report per task (summary, acceptance checklist status, test outputs, and UI proof if applicable).
- On drift, pause and run a Context Integrity Check (what / why / fix).

Run `npx arela harden` to regenerate this file with concrete rule + workflow paths once the repo is initialized.
