# Changelog

## 0.3.5 - 2024-11-09

### Added
- **`arela setup` command** - One-command interactive wizard that orchestrates entire bootstrap process
  - Detects package manager (pnpm > npm > yarn)
  - Ensures git repository (offers to init if missing)
  - Installs preset with pnpm build approval handling
  - Runs `arela init` to copy rules/workflows
  - Installs and configures Husky pre-commit hooks
  - Runs `arela harden` for CI + VSCode settings
  - Creates profile.json and evals/rubric.json if missing
  - Runs `doctor --eval` and saves baseline report
  - Updates .gitignore for .last-report.json
  - Optional RAG indexing (if Ollama present)
  - Commits all changes with single bootstrap commit

### Features
- **Fast flags** for non-interactive usage:
  - `--yes` - Accept all defaults without prompts
  - `--non-interactive` - CI mode, fail on missing deps
  - `--skip-rag` - Skip semantic index build
  - `--skip-ci` - Skip GitHub Actions workflow
  - `--skip-hooks` - Skip Husky installation
- **Idempotent** - Safe to re-run, detects existing installations
- **Shell script** alternative at `scripts/bootstrap.sh` for curl-pipe-bash usage

### Dependencies
- Added `execa@^9.0.0` for command execution
- Added `prompts@^2.4.2` for interactive prompts
- Added `@types/prompts@^2.4.9` for TypeScript support

### Documentation
- Created `SETUP.md` with comprehensive setup guide
- Updated `README.md` to feature setup command as primary method
- Added troubleshooting section and advanced usage examples

## 0.3.4 - 2024-11-09
- Husky hook improvements and postinstall handling

## 0.3.0 - 2024-11-24
- Document the mandatory guardrails (context integrity, ticket schema, review gates) directly in the preset README.
- Record the `ARELA_SKIP_POSTINSTALL=1` escape hatch so consumers can opt out of auto-initialization.
- Shipped validation harness updates (doctor `--eval`, `.arela/.last-report.json`) used to verify CI behavior.
