# Arela Setup - Zero-Friction Installation

Two ways to bootstrap Arela rules, CI guardrails, and evaluation baselines:

## 🌐 Option A: Web Installer (Recommended)

**Zero local setup required**

1. Visit [arela.dev/install](https://arela.dev/install)
2. Enter your repository (`owner/repo`)
3. Select your agent (Cursor, Windsurf, Claude, or Generic)
4. Authorize GitHub
5. Done! A PR will be created with all files

### What Gets Created

- `.arela/rules/*` - 13 CTO-level engineering standards
- `.arela/workflows/*` - 4 agent prompt templates
- `.arela/evals/rubric.json` - Evaluation criteria
- `.arela/.last-report.json` - Baseline scores (all 4.0)
- `.github/workflows/arela-doctor.yml` - CI enforcement on PRs
- `.husky/pre-commit` - Pre-commit validation hook
- `.vscode/settings.json` - IDE configuration

### PR Checklist

The PR includes:
- ✅ All rules committed
- ✅ CI workflow configured
- ✅ Pre-commit hook installed
- ✅ Baseline evaluation added
- ✅ Agent-specific setup instructions

---

## 💻 Option D: One-Liner CLI

**For terminal lovers**

```bash
npx @newdara/arela-setup
```

That's it. No configuration, no manual steps.

### What It Does

1. Detects your package manager (pnpm/yarn/npm)
2. Installs `@newdara/preset-cto` as dev dependency
3. Initializes `.arela/` folder with rules and workflows
4. Installs CI workflow and pre-commit hooks
5. Creates baseline evaluation report
6. Creates branch `chore/arela-bootstrap`
7. Commits all files
8. Opens PR (if `gh` CLI available)

### Requirements

- Node.js ≥18
- Git repository
- One of: pnpm, yarn, or npm

### Optional

- `gh` CLI for automatic PR creation

---

## After Installation

### 1. Verify Everything Works

```bash
npx arela doctor --eval
```

Should output:
```
✓ Rules OK (13)
✓ Workflows OK (4)
✓ Evaluation passed. Avg 4.00 (min 3.5, avg 4.0)
```

### 2. Get Agent Bootstrap Prompt

```bash
npx arela agent bootstrap
```

Copy the output and paste into your agent's system prompt or rules file:
- **Cursor**: `.cursor/rules.md`
- **Windsurf**: `.windsurf/README.md`
- **Claude**: Projects → Custom Instructions

Or install directly:

```bash
npx arela agent install --agent=cursor
```

### 3. Test Pre-Commit Hook

```bash
# Break a rule
echo "broken" > .arela/rules/030-ticket-format.md

# Try to commit
git add .arela/rules/030-ticket-format.md
git commit -m "test"
# Should fail with validation error
```

---

## What's Enforced

### Context Integrity
Agents must validate state before acting. No hallucinated context.

### Ticket Format
Structured work with:
- Context (why)
- Technical task (what)
- Acceptance criteria (checklist)
- Files to modify
- Report (summary + test outputs + UI proof)

### Code Review Gates
- Static checks clean
- Tests: unit + integration + e2e smoke
- Simplicity over cleverness
- Observability in critical paths
- Rollback ready

### Testing Standards
Choose your strategy:
- **Pyramid**: Unit-heavy, few integration, minimal e2e
- **Trophy**: Integration-heavy, some unit, thin e2e smoke

### Observability
- Structured JSON logs with correlation IDs
- Golden signals: latency, traffic, errors, saturation
- Tracing for cross-service calls
- SLOs for critical routes

---

## Customization

### Local Overrides

Create `*.local.md` files next to any rule:

```bash
# Override ticket format
cp .arela/rules/030-ticket-format.md .arela/rules/030-ticket-format.local.md
# Edit the local version
```

Local files are never overwritten during sync/upgrade.

### Sync Updates

Pull latest preset changes:

```bash
npx arela sync
```

Conflicts are written as `*.new` files for manual review.

### Upgrade (Three-Way Merge)

```bash
npx arela upgrade
```

Safely merges preset updates with your local changes.

---

## CI/CD Integration

### GitHub Actions

Already configured in `.github/workflows/arela-doctor.yml`

Runs on every PR:
```yaml
- run: npx arela doctor --eval
```

### Pre-Commit Hook

Already configured in `.husky/pre-commit`

Blocks commits if rules are invalid.

### Evaluation Mode

CI checks scores in `.arela/.last-report.json` against `evals/rubric.json`:
- Minimum per-category: 3.5
- Average across all: 4.0

Update scores after each task to track quality trends.

---

## Troubleshooting

### Pre-commit not running?

```bash
git config core.hooksPath .husky
chmod +x .husky/pre-commit
```

### CI failing?

```bash
# Run locally
npx arela doctor --eval

# Check specific rule
cat .arela/rules/030-ticket-format.md
```

### Want to skip postinstall?

```bash
ARELA_SKIP_POSTINSTALL=1 pnpm add -D @newdara/preset-cto
```

---

## Architecture

### Monorepo Structure

```
arela/
├── packages/
│   ├── preset-cto/        # Core preset with CLI
│   ├── arela-setup/       # One-liner installer
│   └── arela-web/         # Web installer
└── .arela/                # Local rules instance
```

### Commands

```bash
# Initialize
npx arela init

# Sync preset updates
npx arela sync [--force]

# Three-way merge
npx arela upgrade

# Validate
npx arela doctor [--eval]

# Install guardrails
npx arela harden

# Agent bootstrap
npx arela agent bootstrap [--json]
npx arela agent install --agent=<name>

# Research import
npx arela research import <dir>
```

---

## Philosophy

**Pragmatic Visionary**: Boring tech, fast delivery, measurable outcomes

**Trunk-Based Development**: Small PRs, continuous integration

**Testing Trophy**: Integration tests > unit tests

**Observability First**: Structured logs, traces, SLOs

**Context Integrity**: Agents validate state before acting

---

## Support

- **Issues**: [github.com/newdara/arela/issues](https://github.com/newdara/arela/issues)
- **Docs**: [arela.dev/docs](https://arela.dev/docs)
- **Discord**: [arela.dev/discord](https://arela.dev/discord)

---

## License

MIT
