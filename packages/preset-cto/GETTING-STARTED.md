# Getting Started with Arela

**For Non-Technical Users**

Arela is your AI coding assistant's rulebook. It ensures your AI follows best practices, writes quality code, and maintains discipline across your project.

**New in v1.1.0:** Arela now learns from your mistakes and shares knowledge across all your projects!

## What You Get

- ✅ **21 Rules** - CTO-level engineering best practices
- ✅ **9 Workflows** - Step-by-step guides for common tasks
- ✅ **Auto-Activation** - Rules suggest themselves based on context
- ✅ **Learning System** - Tracks violations, learns patterns, applies to new projects
- ✅ **Pre-commit Hooks** - Automatic quality checks before every commit
- ✅ **CI Validation** - GitHub Actions that verify pull requests
- ✅ **Quality Reports** - Baseline metrics to track improvement
- ✅ **RAG Search** - Semantic search across your codebase (optional)
- ✅ **Browser Automation** - AI-powered QA testing (optional)

## Prerequisites

Before you start, you need:

### 1. Node.js (version 18 or higher)

**Check if installed:**
```bash
node --version
```

**If not installed:**
1. Go to https://nodejs.org
2. Download the **LTS version** (Long Term Support)
3. Run the installer
4. Verify: `node --version` should show v18 or higher

### 2. Git

**Check if installed:**
```bash
git --version
```

**If not installed:**
- **Mac:** Already installed or install via Xcode Command Line Tools
- **Windows:** Download from https://git-scm.com
- **Linux:** `sudo apt install git` or `sudo yum install git`

### 3. Package Manager

**Comes with Node.js!** You automatically get `npm`.

**Optional:** Install `pnpm` (faster, recommended):
```bash
npm install -g pnpm
```

---

## Installation (3 Steps)

### Step 1: Open Terminal

**Mac:**
- Press `Cmd + Space`
- Type "Terminal"
- Press Enter

**Windows:**
- Press `Win + R`
- Type "cmd"
- Press Enter

### Step 2: Navigate to Your Project

```bash
cd path/to/your/project
```

Replace `path/to/your/project` with your actual project folder.

**Example:**
```bash
cd ~/Documents/my-app
```

### Step 3: Run Setup Command

Copy and paste this command:

```bash
npx @newdara/preset-cto@latest setup
```

Press Enter and follow the prompts.

## What the Setup Wizard Will Ask

### 1. Git Repository
```
Not a git repository. Initialize now? (Y/n)
```
**Answer:** Press `Y` (or just Enter)

**What it does:** Creates version control for your project

---

### 2. Install Preset
```
Install @newdara/preset-cto? (Y/n)
```
**Answer:** Press `Y` (or just Enter)

**What it does:** Downloads the Arela rules and tools

---

### 3. Husky Pre-Commit Hooks (Automatic)

**No prompt - automatically installed!**

**What it does:** 
- Installs Husky (a git hooks manager)
- Creates a pre-commit hook that runs quality checks
- Blocks commits that don't meet quality standards

**Can skip with:** `--skip-hooks` flag

---

### 4. CI Workflow (Automatic)

**No prompt - automatically created!**

**What it does:**
- Creates `.github/workflows/arela-doctor.yml`
- Runs quality checks on every pull request
- Shows results in GitHub PR interface

**Can skip with:** `--skip-ci` flag

---

### 5. Ollama for AI Features (Optional)
```
Ollama not found. Would you like to install it for RAG indexing? (y/N)
```
**Answer:** Press `N` (skip for now)

**What it does:** Ollama enables advanced AI features. You can add this later.

---

### 6. Embedding Model (If Ollama Installed)
```
No embedding model found. Pull nomic-embed-text (~274MB)? (y/N)
```
**Answer:** Press `Y` if you want AI semantic search

**What it does:** Downloads a small AI model for intelligent code search

---

## After Setup Completes

You'll see:
```
✅ Arela setup complete!

Your repository now has:
  • Rules and workflows in .arela/
  • Pre-commit hooks via Husky
  • GitHub Actions CI workflow
  • Baseline evaluation report
```

## What Happens Next?

### Every Time You Commit Code

**Husky runs automatically** and checks:
- ✅ Code follows best practices
- ✅ Tests are present
- ✅ Documentation is updated
- ✅ Quality thresholds are met

**If checks pass:** Commit succeeds ✅  
**If checks fail:** Commit is blocked ❌ (with clear error message)

**Example:**
```bash
$ git commit -m "add feature"

Running Arela doctor...
Rules OK (12)
Workflows OK (4)
✗ Evaluation failed: Testing Coverage 2.5 (threshold 3.5)

Commit blocked. Fix issues and try again.
```

This is **Husky** protecting your codebase. It's like a bouncer at the door.

### Every Pull Request

GitHub Actions runs:
- ✅ Full quality audit
- ✅ Rule compliance check
- ✅ Evaluation against baseline

Your team sees the results before merging.

## Using Arela with Your AI Assistant

### Windsurf / Cursor / Claude

After setup, tell your AI:

```
Load the Arela rules from .arela/ and follow them for all code changes.
```

Or run:
```bash
npx arela agent install --agent windsurf
```

This automatically configures your AI to follow Arela rules.

## Common Questions

### "Do I need to be a developer?"

**No.** The setup wizard guides you through everything. Just answer Y/N questions.

### "Will this break my project?"

**No.** Arela only adds files, never modifies your existing code. It's 100% safe.

### "Can I undo this?"

**Yes.** Just delete these folders:
- `.arela/`
- `.husky/`
- `.github/workflows/arela-doctor.yml`

### "What is Husky?"

**Husky** is a tool that runs scripts before git actions (like commits).

Think of it as a **quality gate** - it checks your code before letting it into the repository.

Without Husky: Bad code can be committed ❌  
With Husky: Bad code is caught immediately ✅

### "Can I skip Husky?"

**Yes.** Run setup with:
```bash
npx @newdara/preset-cto setup --skip-hooks
```

But we **strongly recommend** keeping it. It's your first line of defense.

### "Can I bypass Husky temporarily?"

**Yes.** Use `--no-verify` flag:
```bash
git commit -m "WIP" --no-verify
```

⚠️ **Warning:** Only do this for work-in-progress commits. Never push unverified code to main.

### "What if I don't have Node.js?"

Install it first:
1. Go to https://nodejs.org
2. Download the LTS version
3. Run the installer
4. Then run the Arela setup

### "What if I get stuck?"

Run this command to check everything:
```bash
npx arela doctor
```

It tells you exactly what's wrong and how to fix it.

## Quick Reference

### Check if Arela is working
```bash
npx arela doctor
```

### Check quality score
```bash
npx arela doctor --eval
```

### Update Arela rules
```bash
npx arela sync
```

### Re-run setup (safe, idempotent)
```bash
npx @newdara/preset-cto setup
```

## Fast Setup (For Experienced Users)

Accept all defaults:
```bash
npx @newdara/preset-cto@latest setup --yes
```

Skip optional features:
```bash
npx @newdara/preset-cto@latest setup --yes --skip-rag
```

## What's in .arela/?

```
.arela/
├── rules/                    # Engineering discipline rules
│   ├── 010-pragmatic-visionary.md
│   ├── 020-context-integrity.md
│   ├── 030-ticket-format.md
│   ├── 040-code-review-gates.md
│   ├── 070-testing-pyramid.md
│   ├── 080-observability-minimums.md
│   └── ...
├── workflows/                # AI workflow prompts
│   ├── engineer-ticket.prompt.md
│   ├── architect-spec.prompt.md
│   └── cto-decision-adr.prompt.md
├── profile.json             # Your AI's personality
└── evals/
    └── rubric.json          # Quality evaluation criteria
```

You can read and customize any of these files!

## Philosophy

Arela is **opinionated** but **flexible**:

- ✅ **Opinionated** - Enforces best practices by default
- ✅ **Flexible** - You can customize any rule
- ✅ **Transparent** - Everything is in plain text files
- ✅ **Safe** - Never touches your code, only adds guardrails

## Need Help?

- 📖 Read [SETUP.md](./SETUP.md) for detailed documentation
- 🚀 Read [QUICKSTART.md](./QUICKSTART.md) for command reference
- 💬 Ask your AI assistant: "Explain Arela setup to me"

---

**Welcome to disciplined AI-assisted development.** 🎯
