# prompt7.md — Arela hardening patch (hooks, gitignore, upgrade conflict, cleanup)

## 1) Make Husky robust in both monorepo and consumer repos
Edit `.husky/pre-commit` to this exact script:

#!/bin/sh
. "$(dirname "$0")/_/husky.sh"
set -e

run_arela() {
  if command -v arela >/dev/null 2>&1; then
    arela doctor --eval
    return
  fi
  if [ -f node_modules/@arela/preset-cto/dist/cli.js ]; then
    node node_modules/@arela/preset-cto/dist/cli.js doctor --eval
    return
  fi
  if [ -f packages/preset-cto/dist/cli.js ]; then
    node packages/preset-cto/dist/cli.js doctor --eval
    return
  fi
  echo "Arela CLI not found. Failing pre-commit." >&2
  exit 1
}

run_arela

## 2) Stop ignoring .arela (commit your rules)
Open the repo root `.gitignore`. Ensure it does NOT ignore `.arela/**`.
- If you must ignore volatile bits, add:
# Arela local-only files
.arela/memories/*
.arela/*.new
.arela/.last-report.json

## 3) Harden upgrade: never clobber local edits
In `packages/preset-cto/src/loaders.ts`, inside the upgrade/sync logic:
- When a target file exists, compare three hashes:
  - templateHash (from the package)
  - recordedLocalHash (from .arela/.last-sync.json)
  - currentLocalHash (compute now)
- If `currentLocalHash !== recordedLocalHash` AND `currentLocalHash !== templateHash`:
  - DO NOT overwrite. Write as `<name>.new` and record a conflict message.
- Append a single-line “Conflicts N (wrote *.new)” summary to stdout.
- Update `.last-sync.json` only for files actually overwritten or newly added.

Also ensure `sync` does the same conservative write when `--force` is not provided.

## 4) Remove demo research rule from runtime
Delete `.arela/rules/fast-deploy-cadence.md` if present and remove its entry from `.arela/research_index.json`.
Also delete the template copy if it was added anywhere besides the sample you intentionally created.

## 5) Rebuild and show quick proof
Run:
pnpm -F @arela/preset-cto build
# show hook file contents and that .gitignore change stuck
sed -n '1,60p' .husky/pre-commit
grep -n ".arela" .gitignore || true
node packages/preset-cto/dist/cli.js upgrade || true

# Demonstrate conflict creation:
echo "# extra line" >> .arela/rules/030-ticket-format.md
node packages/preset-cto/dist/cli.js upgrade || true
ls -1 .arela/rules | grep '030-ticket-format' || true