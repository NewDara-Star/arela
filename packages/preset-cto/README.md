# @arela/preset-cto

Arela packages a curated set of CTO-level rules, workflows, and memories that keep projects aligned.
Use the `arela` CLI to bootstrap a `.arela/` folder, sync templates, run upgrades, and audit content.

## Quick Start

**One command to rule them all:**

```sh
npx @newdara/preset-cto setup
```

This interactive wizard handles: git init → install preset → arela init → husky hooks → CI → baseline → optional RAG.

**Fast flags:**
```sh
npx @newdara/preset-cto setup --yes                    # accept all defaults
npx @newdara/preset-cto setup --non-interactive --yes  # CI mode
npx @newdara/preset-cto setup --skip-rag --skip-ci     # skip optional steps
```

### Documentation

- 📖 **[GETTING-STARTED.md](./GETTING-STARTED.md)** - For non-technical users
- 🔄 **[FLOW.md](./FLOW.md)** - Visual setup flow and decision tree
- 📚 **[SETUP.md](./SETUP.md)** - Complete technical documentation
- ⚡ **[QUICKSTART.md](./QUICKSTART.md)** - Command reference

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
