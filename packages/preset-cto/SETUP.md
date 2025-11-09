# Arela Setup Guide

## One-Command Setup

The `setup` command orchestrates the entire Arela bootstrap process:

```bash
npx @newdara/preset-cto setup
```

This interactive wizard will:

1. ✓ Detect package manager (pnpm > npm > yarn)
2. ✓ Ensure git repository exists (offers to `git init` if missing)
3. ✓ Install `@newdara/preset-cto` if not present
4. ✓ Handle pnpm build approvals if needed
5. ✓ Run `arela init` (copy rules/workflows)
6. ✓ Install and configure Husky pre-commit hooks
7. ✓ Run `arela harden` (CI + VSCode settings)
8. ✓ Create profile and rubric if missing
9. ✓ Run `doctor --eval` and save baseline report
10. ✓ Update `.gitignore` for `.arela/.last-report.json`
11. ✓ Optionally build semantic index (if Ollama present)
12. ✓ Commit all changes with single bootstrap commit

## Fast Flags

### Accept All Defaults
```bash
npx @newdara/preset-cto setup --yes
```

### CI/Non-Interactive Mode
```bash
npx @newdara/preset-cto setup --non-interactive --yes --skip-rag
```

### Skip Specific Steps
```bash
# Skip RAG indexing
npx @newdara/preset-cto setup --skip-rag

# Skip CI workflow
npx @newdara/preset-cto setup --skip-ci

# Skip Husky hooks
npx @newdara/preset-cto setup --skip-hooks

# Combine flags
npx @newdara/preset-cto setup --yes --skip-rag --skip-ci
```

## Idempotent & Safe

The setup command is **idempotent** - you can run it multiple times safely:

- Detects existing installations and skips redundant steps
- Won't overwrite custom configurations
- Safe to run mid-project without detonating your repo
- Handles partial setups gracefully

## One-Liner for Shell Scripts

If you need a pure shell one-liner (no npm install required):

```bash
set -e
PM="$(command -v pnpm >/dev/null 2>&1 && echo pnpm || (command -v npm >/dev/null 2>&1 && echo npm || echo yarn))"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || (git init && git add . && git commit -m "chore: repo init" || true)
$PM add -D @newdara/preset-cto@latest
if [ "$PM" = "pnpm" ]; then $PM approve-builds @newdara/preset-cto || true; $PM rebuild || true; fi
npx arela init
command -v husky >/dev/null 2>&1 || ($PM dlx husky-init; $PM install)
npx arela harden
mkdir -p .arela/evals
test -f .arela/profile.json || printf '{"persona":"cto","tone":"direct","humour":"dry","locale":"en-GB"}\n' > .arela/profile.json
test -f .arela/evals/rubric.json || cp node_modules/@newdara/preset-cto/templates/.arela/evals/rubric.json .arela/evals/rubric.json 2>/dev/null || echo '{"thresholds":{"minPass":3.5,"avgPass":4.0},"categories":[{"name":"Context Integrity","weight":1.0}]}' > .arela/evals/rubric.json
npx arela doctor --eval > .arela/.last-report.json || true
git add .arela .husky .github .vscode package.json .gitignore 2>/dev/null || true
git commit -m "chore(arela): setup rules, hooks, CI, baseline" || true
```

## What You Get

After running setup, your repository will have:

### `.arela/` Directory
- `rules/` - Engineering discipline rules
- `workflows/` - Agent workflow prompts
- `profile.json` - Agent persona configuration
- `evals/rubric.json` - Quality evaluation criteria
- `.last-report.json` - Baseline compliance report (gitignored)

### `.husky/` Hooks
- `pre-commit` - Runs `arela doctor --eval` before every commit
- Fails fast if quality thresholds not met

### `.github/workflows/`
- `arela-doctor.yml` - CI workflow that validates PRs

### `.vscode/settings.json`
- Optimized search/exclude patterns for Arela

## Verification

After setup, verify everything works:

```bash
# Check rules and workflows
npx arela doctor

# Check with evaluation
npx arela doctor --eval

# Test pre-commit hook
git add .
git commit -m "test: verify arela hooks"
```

## Troubleshooting

### pnpm Blocks Postinstall

If pnpm blocks the postinstall script:

```bash
pnpm approve-builds @newdara/preset-cto
pnpm rebuild
```

The setup command handles this automatically.

### Husky Hook Not Executable

```bash
chmod +x .husky/pre-commit
```

The setup command sets this automatically.

### Missing Rubric Template

If the rubric template isn't found, setup creates a default one. You can customize it:

```json
{
  "thresholds": {
    "minPass": 3.5,
    "avgPass": 4.0
  },
  "categories": [
    { "name": "Context Integrity", "weight": 1.0 },
    { "name": "Testing Coverage", "weight": 1.0 },
    { "name": "Observability", "weight": 1.0 },
    { "name": "Code Review Gates", "weight": 1.0 }
  ]
}
```

## Advanced Usage

### Custom Working Directory

```bash
npx @newdara/preset-cto setup --cwd /path/to/project
```

### Programmatic Usage

```typescript
import { runSetup } from "@newdara/preset-cto/setup";

await runSetup({
  cwd: process.cwd(),
  yes: true,
  nonInteractive: false,
  skipRag: false,
  skipCi: false,
  skipHooks: false,
});
```

## Next Steps

After setup completes:

1. Review `.arela/rules/` and customize as needed
2. Update `.arela/profile.json` with your preferences
3. Adjust `.arela/evals/rubric.json` thresholds
4. Run `npx arela agent bootstrap` to get the agent prompt
5. Install agent assets: `npx arela agent install --agent windsurf`

## Philosophy

The setup command embodies the Arela philosophy:

- **One command** - No 12-step dance
- **Interactive** - Prompts keep it human
- **Scriptable** - Flags keep it automatable
- **Idempotent** - Safe to re-run
- **Transparent** - Clear feedback at every step
- **Opinionated** - Sensible defaults, easy overrides

Ship it. 🚀
