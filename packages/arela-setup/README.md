# @newdara/arela-setup

One-liner to bootstrap Arela rules, CI guardrails, and evaluation baselines in any repository.

## Usage

```bash
npx @newdara/arela-setup
```

That's it. No configuration, no manual steps.

## What It Does

1. **Installs** `@newdara/preset-cto` as a dev dependency
2. **Initializes** `.arela/` folder with rules and workflows
3. **Hardens** the repo with CI workflow and pre-commit hooks
4. **Creates** baseline evaluation report
5. **Commits** everything to a new branch `chore/arela-bootstrap`
6. **Opens** a PR (if `gh` CLI is available)

## Files Created

- `.arela/rules/*` - Engineering standards
- `.arela/workflows/*` - Agent prompt templates
- `.arela/evals/rubric.json` - Evaluation criteria
- `.arela/.last-report.json` - Baseline scores
- `.github/workflows/arela-doctor.yml` - CI enforcement
- `.husky/pre-commit` - Pre-commit validation
- `.vscode/settings.json` - IDE configuration

## Requirements

- Node.js ≥18
- Git repository
- One of: pnpm, yarn, or npm

## Optional

- `gh` CLI for automatic PR creation

## After Setup

```bash
# Verify everything works
npx arela doctor --eval

# Get agent bootstrap prompt
npx arela agent bootstrap

# Copy to clipboard (macOS)
npx arela agent bootstrap | pbcopy
```

## Opt-Out of Auto-Init

If you installed `@newdara/preset-cto` directly and want to skip postinstall:

```bash
ARELA_SKIP_POSTINSTALL=1 pnpm add -D @newdara/preset-cto
```

## Web Alternative

Prefer a web interface? Visit [arela.dev/install](https://arela.dev/install) to bootstrap via GitHub PR.
