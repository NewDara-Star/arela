# Husky Pre-Commit Fix

Fixed the useless `npm test` command haunting pre-commit. Now runs actual Arela doctor check.

## Problem

The `arela harden` command was **appending** the doctor check to the existing husky hook, which meant:

1. `npm test` ran first (and failed with "Error: no test specified")
2. Commit blocked before Arela doctor even ran
3. Useless error message confused users

## Solution

**Replace** the entire hook content instead of appending.

### Changes Made

**File:** `packages/preset-cto/src/loaders.ts`

```typescript
// Added proper hook content
const HUSKY_HOOK_CONTENT = `#!/usr/bin/env sh
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
`;

// Updated function to replace instead of append
async function appendHuskyDoctorHook(cwd: string): Promise<"appended" | "already" | "skipped"> {
  const hookPath = path.join(cwd, ".husky", "pre-commit");
  if (!(await fs.pathExists(hookPath))) {
    return "skipped";
  }

  const content = await fs.readFile(hookPath, "utf8");
  
  // Check if already has the proper Arela hook
  if (content.includes("Arela CLI not found")) {
    return "already";
  }

  // Replace entire hook content with Arela check
  await fs.writeFile(hookPath, HUSKY_HOOK_CONTENT);
  await fs.chmod(hookPath, 0o755);
  return "appended";
}
```

## How It Works

1. **Checks for CLI** - Tries `@newdara/preset-cto` first, then `@arela/preset-cto`
2. **Runs doctor --eval** - Validates rules, workflows, and evaluation rubric
3. **Fails fast** - If CLI not found, blocks commit immediately
4. **No npm test** - Completely replaces the default husky hook

## Usage

### Fresh Install
```bash
pnpm dlx husky-init -y
pnpm install
npx arela harden
```

**Output:**
```
Files identical 3
  - .arela/BOOTSTRAP.readme.md
  - .github/workflows/arela-doctor.yml
  - .vscode/settings.json
Husky hook: appended
Harden complete.
```

### Test It Works
```bash
# Break a rule
printf "broken\n" > .arela/rules/030-ticket-format.md
git add .arela/rules/030-ticket-format.md
git commit -m "test: should fail"
```

**Expected output:**
```
Rule issues:
  • .arela/rules/030-ticket-format.md: Invalid frontmatter
husky - pre-commit hook exited with code 1 (error)
```

**Commit blocked!** ✅

### Fix and Retry
```bash
# Restore the rule
git checkout -- .arela/rules/030-ticket-format.md

# Commit succeeds
git add .arela/rules/030-ticket-format.md
git commit -m "chore: valid commit"
```

## What Changed

### Before (Broken)
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm test  # <-- FAILS HERE
node node_modules/@arela/preset-cto/dist/cli.js doctor  # <-- NEVER RUNS
```

### After (Fixed)
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

## Benefits

✅ **No npm test** - Removed useless command
✅ **Runs doctor --eval** - Validates everything
✅ **Fails fast** - Clear error if CLI missing
✅ **Idempotent** - Running `arela harden` multiple times is safe
✅ **Package agnostic** - Works with both `@newdara` and `@arela` scopes

## Build Status

✅ **TypeScript compiled**
✅ **Hook content updated**
✅ **Ready to ship**

## Philosophy

**The bouncer's at the door.**

No more sneaking bad code past Arela. Pre-commit hook now:
- Validates rules and workflows
- Checks evaluation rubric
- Blocks commits on failure
- No useless npm test noise

**Zero drama. Maximum enforcement.** 🎯
