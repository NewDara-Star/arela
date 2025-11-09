# @newdara/preset-cto

**CTO-level engineering discipline for AI agents.** Enforce best practices, prevent technical debt, and ship with confidence.

Arela packages 22 CTO-level rules, 9 workflows, auto-activation hooks, multi-agent orchestration, and a global learning system that shares knowledge across all your projects.

## What's New in v1.3.0 🚀

**Multi-Agent Orchestration!** Organize tickets by agent (Codex, Claude, DeepSeek, local models), track status automatically, and save 72-99% on AI costs.

```bash
# First project
cd project-1
npx arela setup
git commit  # ❌ Missing API tests
# Saved to ~/.arela/

# Second project (learns!)
cd project-2
npx arela setup
# 🤖 Apply pattern: Require API tests? [Y/n]
```

## Quick Start

**One command to rule them all:**

```sh
npx @newdara/preset-cto@latest setup
```

This interactive wizard handles: git init → install preset → arela init → husky hooks → CI → baseline → RAG → **learning system**.

**Fast flags:**
```sh
npx @newdara/preset-cto@latest setup --yes                    # accept all defaults
npx @newdara/preset-cto@latest setup --non-interactive --yes  # CI mode
npx @newdara/preset-cto@latest setup --skip-rag --skip-ci     # skip optional steps
```

### Documentation

- 📖 **[GETTING-STARTED.md](./GETTING-STARTED.md)** - For non-technical users
- 🔄 **[FLOW.md](./FLOW.md)** - Visual setup flow and decision tree
- 📚 **[SETUP.md](./SETUP.md)** - Complete technical documentation
- ⚡ **[QUICKSTART.md](./QUICKSTART.md)** - Command reference
- 🧠 **[AUTO-ACTIVATION.md](./AUTO-ACTIVATION.md)** - Auto-activation system
- 🌐 **[BROWSER-AUTOMATION.md](./BROWSER-AUTOMATION.md)** - QA testing with Stagehand
- 🔍 **[RAG.md](./RAG.md)** - Local semantic search

## Learning System

Arela learns from your violations and shares knowledge across projects:

### Commands

```bash
npx arela patterns           # View learned patterns
npx arela check-updates      # Check for new version
npx arela sync               # Sync updates + patterns
npx arela export-patterns    # Share with team
npx arela import-patterns    # Import team patterns
npx arela projects           # List all projects
```

### How It Works

1. **Tracks violations** - Every `arela doctor` failure is recorded in `~/.arela/config.json`
2. **Detects patterns** - Recurring violations become learned patterns
3. **Applies to new projects** - Patterns auto-suggest in new repos
4. **Safe updates** - Your data in `~/.arela/` never touched by package updates
5. **Team sharing** - Export/import patterns across team

### Data Architecture

```
~/.arela/                    ← Global (your learning data)
├── config.json              ← Patterns, violations, projects
└── custom-rules/            ← Your custom rules

node_modules/@newdara/       ← Package (updated by npm)
└── preset-cto/templates/    ← Base rules

.arela/                      ← Project (merged)
├── rules/                   ← Base rules
└── custom/                  ← Your overrides (safe!)
```

## Manual Setup

```sh
pnpm add -D @newdara/preset-cto
npx arela init
npx arela harden
npx arela doctor
```

### Non-Negotiables

Arela enforces three guardrails on every run and fails CI if they drift:
- Context integrity (`arela.context_integrity`) to ensure every prompt ships with valid front-matter.
- Ticket schema (`arela.ticket_format`) so every change request links back to real work.
- Review gates (`arela.code_review_gates`) that block merges without dual sign-off.

### Postinstall Opt-Out

The preset auto-initializes `.arela/` during `pnpm i`. When bootstrapping tooling or vendoring the preset,
skip that behavior by exporting `ARELA_SKIP_POSTINSTALL=1 pnpm add -D @arela/preset-cto`.

### Local Overrides

Drop `*.local.md` files next to preset rules or workflows to document overrides. The CLI never overwrites
those files during sync or upgrade operations.

### CI Example

```yaml
# .github/workflows/arela-doctor.yml
name: Arela Doctor
on: [pull_request]
jobs:
  doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm i
      - run: npx arela doctor
```
