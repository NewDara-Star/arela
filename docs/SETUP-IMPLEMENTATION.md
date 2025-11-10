# Arela Setup Command Implementation

## Summary

Implemented a comprehensive `npx arela setup` command that orchestrates the entire Arela bootstrap process in one interactive wizard, with fast flags for automation.

## What Was Built

### 1. Core Setup Command (`src/setup.ts`)

A fully-featured orchestration module that:

- **Detects package manager** (pnpm > npm > yarn) automatically
- **Ensures git repository** exists (offers to init if missing)
- **Installs preset** if not present, with pnpm build approval handling
- **Runs arela init** to copy rules and workflows
- **Installs Husky** and configures pre-commit hooks with pure Arela content
- **Runs arela harden** for CI workflow and VSCode settings
- **Creates profile.json** and **evals/rubric.json** with sensible defaults
- **Runs doctor --eval** and saves baseline report
- **Updates .gitignore** to exclude .last-report.json
- **Optional RAG indexing** (if Ollama detected)
- **Commits all changes** with single bootstrap commit

### 2. CLI Integration (`src/cli.ts`)

Added `setup` command with full option support:

```bash
npx arela setup [options]

Options:
  --yes              Accept sensible defaults without prompts
  --non-interactive  No prompts, fail on missing deps (for CI)
  --skip-rag         Don't build semantic index
  --skip-ci          Don't write GitHub Action
  --skip-hooks       Don't touch Husky
  --cwd <dir>        Directory to operate in
```

### 3. Shell Script Alternative (`scripts/bootstrap.sh`)

Pure bash implementation for curl-pipe-bash usage:

```bash
curl -fsSL https://raw.githubusercontent.com/newdara/preset-cto/main/scripts/bootstrap.sh | bash
```

### 4. Comprehensive Documentation

- **SETUP.md** - Complete setup guide with examples, troubleshooting, and philosophy
- **README.md** - Updated to feature setup command as primary installation method
- **CHANGELOG.md** - Detailed v0.4.0 release notes

## Key Features

### Idempotent & Safe

- Detects existing installations and skips redundant steps
- Won't overwrite custom configurations
- Safe to run mid-project without breaking anything
- Handles partial setups gracefully

### Interactive & Scriptable

- **Interactive mode**: Prompts for confirmation at each step
- **`--yes` flag**: Accept all defaults automatically
- **`--non-interactive`**: Fail fast on missing deps (CI mode)
- **Skip flags**: Fine-grained control over what gets installed

### Handles Edge Cases

- **pnpm build approval**: Automatically runs `pnpm approve-builds` and `pnpm rebuild`
- **Missing git repo**: Offers to initialize git if not present
- **Missing Husky**: Installs and configures automatically
- **Missing rubric template**: Creates sensible default if template not found
- **Ollama detection**: Only prompts for RAG if Ollama is available

### Pure Arela Hook Content

The Husky pre-commit hook uses pure Arela logic (no append/prepend):

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

set -e
if [ -f node_modules/@newdara/preset-cto/dist/cli.js ]; then
  node node_modules/@newdara/preset-cto/dist/cli.js doctor --eval
elif [ -f node_modules/@arela/preset-cto/dist/cli.js ]; then
  node node_modules/@arela/preset-cto/dist/cli.js doctor --eval
else
  echo "Arela CLI not found. Failing pre-commit." >&2
  exit 1
fi
```

## Usage Examples

### Basic Interactive Setup

```bash
npx @newdara/preset-cto setup
```

Prompts for confirmation at each step.

### Accept All Defaults

```bash
npx @newdara/preset-cto setup --yes
```

No prompts, uses sensible defaults.

### CI/Non-Interactive Mode

```bash
npx @newdara/preset-cto setup --non-interactive --yes --skip-rag
```

Fails fast if dependencies missing, skips RAG indexing.

### Skip Specific Steps

```bash
# Skip RAG and CI
npx @newdara/preset-cto setup --skip-rag --skip-ci

# Skip hooks only
npx @newdara/preset-cto setup --skip-hooks

# Accept defaults but skip RAG
npx @newdara/preset-cto setup --yes --skip-rag
```

### Custom Working Directory

```bash
npx @newdara/preset-cto setup --cwd /path/to/project
```

## Dependencies Added

```json
{
  "dependencies": {
    "execa": "^9.0.0",
    "prompts": "^2.4.2"
  },
  "devDependencies": {
    "@types/prompts": "^2.4.9"
  }
}
```

## Files Created/Modified

### New Files
- `src/setup.ts` - Setup orchestration logic (280 lines)
- `SETUP.md` - Comprehensive setup documentation
- `scripts/bootstrap.sh` - Shell script alternative
- `SETUP-IMPLEMENTATION.md` - This document

### Modified Files
- `src/cli.ts` - Added setup command
- `package.json` - Added dependencies, bumped to v0.4.0
- `README.md` - Featured setup command as primary method
- `CHANGELOG.md` - Added v0.4.0 release notes

## Technical Details

### Package Manager Detection

```typescript
async function detectPackageManager(cwd: string): Promise<PackageManager> {
  // Check for lock files first
  if (await fs.pathExists(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (await fs.pathExists(path.join(cwd, "package-lock.json"))) return "npm";
  if (await fs.pathExists(path.join(cwd, "yarn.lock"))) return "yarn";

  // Fall back to checking installed binaries
  try {
    await execa("pnpm", ["--version"], { cwd });
    return "pnpm";
  } catch { /* ... */ }
  
  return "npm"; // default
}
```

### Git Repository Check

```typescript
async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await execa("git", ["rev-parse", "--is-inside-work-tree"], { cwd });
    return true;
  } catch {
    return false;
  }
}
```

### pnpm Build Approval

```typescript
async function approveBuildsIfPnpm(pm: PackageManager, cwd: string): Promise<void> {
  if (pm !== "pnpm") return;

  try {
    await execa("pnpm", ["approve-builds", "@newdara/preset-cto"], { cwd });
    await execa("pnpm", ["rebuild"], { cwd });
  } catch {
    // Non-fatal, may not be needed
  }
}
```

### Baseline Report Generation

```typescript
async function runDoctorBaseline(cwd: string): Promise<void> {
  const { rules, workflows, evalResult } = await doctorTask({ cwd, evalMode: true });
  
  const report = {
    timestamp: new Date().toISOString(),
    rules: { count: rules.items.length, errors: rules.errors },
    workflows: { count: workflows.items.length, errors: workflows.errors },
    evaluation: evalResult || { status: "skipped" },
  };
  
  await fs.writeJson(path.join(cwd, ".arela", ".last-report.json"), report, { spaces: 2 });
}
```

## Philosophy

The setup command embodies the Arela philosophy:

1. **One command** - No 12-step dance through multiple commands
2. **Interactive** - Prompts keep it human-friendly
3. **Scriptable** - Flags keep it automatable for CI
4. **Idempotent** - Safe to re-run without side effects
5. **Transparent** - Clear feedback at every step
6. **Opinionated** - Sensible defaults, easy overrides

## Verification

After implementation, verified:

✅ Command appears in `arela --help`  
✅ All flags work correctly  
✅ TypeScript compiles without errors  
✅ Dependencies installed successfully  
✅ Documentation complete and accurate  

## Next Steps for Users

After running setup:

1. Review `.arela/rules/` and customize as needed
2. Update `.arela/profile.json` with preferences
3. Adjust `.arela/evals/rubric.json` thresholds
4. Run `npx arela agent bootstrap` to get agent prompt
5. Install agent assets: `npx arela agent install --agent windsurf`

## Version

Released as **v0.4.0** on 2024-11-09

---

**Ship it.** 🚀
