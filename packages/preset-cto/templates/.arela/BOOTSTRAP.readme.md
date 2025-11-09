# Arela Bootstrap

Agents must load every file in `.arela/rules/*` and `.arela/workflows/*` before acting. If a file is missing from the current context, request it explicitly.

## Core Directives
- Enforce arela.context_integrity before every action.
- Validate tasks against arela.ticket_format; request acceptance criteria when missing.
- Review deliverables with arela.code_review_gates, arela.testing_pyramid/arela.testing_trophy, and arela.observability_minimums.
- Return a Report per task (summary, acceptance checklist status, test outputs, and UI proof if applicable).
- On drift, pause and run a Context Integrity Check (what / why / fix).

## Learning System (v1.1.0+)

Arela now learns from violations and shares knowledge across projects via `~/.arela/`:

### Auto-Activation
- Rules activate automatically based on prompt keywords and file context
- See `.arela/skill-rules.json` for activation triggers
- Hooks in `.arela/hooks/` analyze context and suggest relevant rules

### Global Learning
- Violations are tracked in `~/.arela/config.json`
- Patterns learned from one project apply to new projects
- Custom rules auto-generated from recurring violations
- Run `npx arela patterns` to view learned patterns

### Safe Updates
- User data in `~/.arela/` and `.arela/custom/` never touched by package updates
- Conflicts resolved interactively
- Run `npx arela sync` after package updates

### Commands
```bash
npx arela patterns           # View learned patterns
npx arela check-updates      # Check for new version
npx arela sync               # Sync updates + patterns
npx arela export-patterns    # Share with team
npx arela projects           # List all projects
```

## Integration

Run `npx arela harden` to regenerate this file with concrete rule + workflow paths once the repo is initialized.

For IDE integration (Windsurf, Cursor, Claude Code):
- Auto-activation hooks suggest rules based on context
- Pre-commit hooks enforce quality gates
- RAG server provides semantic search: `npx arela serve`
