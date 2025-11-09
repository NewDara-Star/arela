# Arela Setup Flow

## Visual Flow for Non-Technical Users

```
┌─────────────────────────────────────────┐
│  User runs:                             │
│  npx @newdara/preset-cto setup          │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  🔍 Detect Package Manager              │
│  ✓ Found: pnpm / npm / yarn             │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  🔍 Check Git Repository                │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
    ❌ Not Found           ✅ Found
        │                       │
        ▼                       │
┌──────────────────┐            │
│ ? Initialize git?│            │
│   (Y/n)          │            │
└──────────────────┘            │
        │                       │
        ▼                       │
    git init                    │
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  🔍 Check Preset Installed              │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
    ❌ Not Found           ✅ Found
        │                       │
        ▼                       │
┌──────────────────┐            │
│ ? Install preset?│            │
│   (Y/n)          │            │
└──────────────────┘            │
        │                       │
        ▼                       │
  pnpm add -D                   │
  @newdara/preset-cto           │
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  📋 Run: arela init                     │
│  ✓ Copy rules to .arela/rules/          │
│  ✓ Copy workflows to .arela/workflows/  │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  🪝 Setup Husky Hooks                   │
│  (unless --skip-hooks)                  │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
    ❌ Not Found           ✅ Found
        │                       │
        ▼                       │
  Install Husky                 │
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  ✍️  Write .husky/pre-commit            │
│  → Runs: arela doctor --eval            │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  🛡️  Run: arela harden                  │
│  ✓ Create GitHub Actions workflow       │
│  ✓ Configure VSCode settings            │
│  (unless --skip-ci)                     │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  📝 Create Config Files                 │
│  ✓ .arela/profile.json                  │
│  ✓ .arela/evals/rubric.json             │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  🩺 Run: arela doctor --eval            │
│  ✓ Save baseline to                     │
│    .arela/.last-report.json             │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  🔍 Check Ollama (for RAG)              │
│  (unless --skip-rag)                    │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
    ❌ Not Found           ✅ Found
        │                       │
        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│ ? Install Ollama?│   │ 🔍 Check Model   │
│   (y/N)          │   └──────────────────┘
└──────────────────┘            │
        │              ┌────────┴────────┐
        ▼              │                 │
  Show download        ▼                 ▼
  instructions     ❌ No Model      ✅ Has Model
        │              │                 │
        │              ▼                 │
        │    ┌──────────────────┐       │
        │    │ ? Pull model?    │       │
        │    │   (~274MB)       │       │
        │    │   (y/N)          │       │
        │    └──────────────────┘       │
        │              │                 │
        │              ▼                 │
        │        ollama pull             │
        │        nomic-embed-text        │
        │              │                 │
        └──────────────┴─────────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ ? Build index?   │
              │   (y/N)          │
              └──────────────────┘
                       │
                       ▼
              npx arela index
              (stub for now)
                       │
                       ▼
┌─────────────────────────────────────────┐
│  💾 Git Commit                          │
│  git add .arela .husky .github ...      │
│  git commit -m "chore(arela): setup"    │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  ✅ Setup Complete!                     │
│                                         │
│  Your repository now has:               │
│  • Rules and workflows in .arela/       │
│  • Pre-commit hooks via Husky           │
│  • GitHub Actions CI workflow           │
│  • Baseline evaluation report           │
└─────────────────────────────────────────┘
```

## Decision Points

### 1. Git Repository
- **If missing:** Offers to run `git init`
- **If exists:** Continues

### 2. Preset Package
- **If missing:** Installs `@newdara/preset-cto`
- **If exists:** Skips installation

### 3. Husky Hooks
- **If `--skip-hooks`:** Skips entirely
- **If missing:** Installs Husky
- **If exists:** Only updates pre-commit hook

### 4. CI Workflow
- **If `--skip-ci`:** Skips entirely
- **Otherwise:** Creates `.github/workflows/arela-doctor.yml`

### 5. RAG Setup
- **If `--skip-rag`:** Skips entirely
- **If `--non-interactive`:** Skips with warning
- **If Ollama missing:** Offers installation instructions
- **If Ollama present, no model:** Offers to pull model
- **If model present:** Uses it automatically

## Flags for Automation

### `--yes`
Accept all defaults without prompts

### `--non-interactive`
Fail fast on missing dependencies (for CI)

### `--skip-rag`
Skip RAG indexing entirely

### `--skip-ci`
Skip GitHub Actions workflow

### `--skip-hooks`
Skip Husky pre-commit hooks

## Example Flows

### New User (Nothing Installed)
```
npx @newdara/preset-cto setup
→ Initialize git? Y
→ Install preset? Y
→ Install Ollama? N (skip for now)
✅ Done in ~30 seconds
```

### Experienced User (Has Everything)
```
npx @newdara/preset-cto setup --yes
→ Detects git ✓
→ Detects preset ✓
→ Detects Ollama ✓
→ Detects model ✓
→ Builds index
✅ Done in ~10 seconds
```

### CI/CD Pipeline
```
npx @newdara/preset-cto setup --non-interactive --yes --skip-rag
→ Fails fast if dependencies missing
→ No prompts
→ Skips optional features
✅ Done in ~15 seconds
```

### Minimal Setup (No Hooks, No CI)
```
npx @newdara/preset-cto setup --yes --skip-hooks --skip-ci --skip-rag
→ Only installs rules and workflows
→ No git hooks
→ No CI
→ No RAG
✅ Done in ~5 seconds
```

## What Gets Created

```
your-project/
├── .arela/
│   ├── rules/                    # 12 discipline rules
│   ├── workflows/                # 4 workflow prompts
│   ├── profile.json              # AI persona config
│   ├── evals/
│   │   └── rubric.json          # Quality criteria
│   └── .last-report.json        # Baseline (gitignored)
├── .husky/
│   └── pre-commit               # Runs doctor --eval
├── .github/
│   └── workflows/
│       └── arela-doctor.yml     # CI validation
├── .vscode/
│   └── settings.json            # Search optimization
└── .gitignore                   # Updated with .arela/.last-report.json
```

## Time Estimates

- **First-time setup:** ~30-60 seconds
- **Re-run (idempotent):** ~5-10 seconds
- **With model pull:** ~2-3 minutes (one-time download)
- **CI mode:** ~15-20 seconds

## Non-Interactive Behavior

When `--non-interactive` is set:
- ❌ No prompts
- ❌ Fails if git missing
- ❌ Fails if preset not installed
- ⚠️  Warns and skips Ollama/RAG
- ✅ Continues with core setup

Perfect for CI/CD pipelines.
