# Configure Arela

Arela asks before it judges. No vibes, just questions with receipts.

## Quick Start

```bash
# First-time setup
npx arela configure

# Reset and reconfigure
npx arela configure --reset

# Configure specific topics only
npx arela configure --only deployment,ci

# CI mode (fails if missing keys)
npx arela configure --noninteractive
```

## What It Does

### 1. Interactive Q&A

Arela asks targeted questions about your setup:

- **Deployment**: Where, how, URLs
- **CI/CD**: Provider, PR checks, test runs
- **Tests**: Strategy, frameworks, coverage
- **Environments**: Staging, secrets, config
- **Agents**: AI usage, preferences, auto-fix

**Answers stored in:** `.arela/answers.json`

### 2. Assumptions Ledger

Every heuristic writes an assumption with:
- **ID**: Unique identifier
- **Assumption**: What Arela thinks
- **Evidence**: File paths that led to it
- **Confidence**: 0-1 score
- **Status**: `assumed` | `confirmed` | `rejected`

**Ledger stored in:** `.arela/assumptions.json`

### 3. Personality Config

Control how Arela talks to you:

```json
{
  "tone": "direct",
  "humour": "dry",
  "style": "naija",
  "ask_before_fix": true,
  "max_questions": 8
}
```

**Config stored in:** `.arela/profile.json`

## Commands

### `arela configure`

Interactive configuration wizard.

**Options:**
- `--reset` - Clear saved answers and reconfigure
- `--only <topics>` - Only ask questions for specific topics (comma-separated)
- `--noninteractive` - Fail if missing keys (for CI)

**Example:**
```bash
$ npx arela configure

Configuring Arela...

Profile: naija / direct / dry

Asking 6 questions:

✔ Quick one: Where is this deployed for testing/staging/prod?   (no long story) › local, render
✔ Staging base URL (if any) › https://staging.example.com
✔ Which CI provider? › github-actions
✔ Does CI run on every PR? › yes
✔ Testing strategy? › trophy
✔ Do you run E2E tests? › no

✓ Configuration saved
  Answers: .arela/answers.json
  Assumptions confirmed: 6
```

### `arela explain <findingId>`

Explain a finding and show related assumptions.

**Example:**
```bash
$ npx arela explain ci.missing_pr_eval

ci.missing_pr_eval

Category: governance
Severity: high

Why:
  PRs skip Arela governance checks

Evidence:
  - .github/workflows/arela-doctor.yml:1

Fix:
  Add 'npx arela doctor --eval' step to PR workflow

Related Assumptions:
  ✓ GitHub Actions detected (confirmed, confidence: 1)
  ? No pre-commit hooks found (assumed, confidence: 0.8)
```

## Data Files

### `.arela/answers.json`

Your answers to configuration questions.

```json
{
  "deploy.envs": ["local", "render"],
  "deploy.staging_url": "https://staging.example.com",
  "ci.provider": "github-actions",
  "ci.runs_on_pr": true,
  "tests.strategy": "trophy",
  "tests.e2e": false
}
```

**Safe to commit.** No secrets stored.

### `.arela/assumptions.json`

Ledger of what Arela assumed vs confirmed.

```json
{
  "ci.provider": {
    "id": "ci.provider",
    "assumption": "GitHub Actions detected",
    "evidence": [".github/workflows/ci.yml"],
    "confidence": 1.0,
    "status": "confirmed",
    "createdAt": "2025-11-09T15:30:00Z",
    "updatedAt": "2025-11-09T15:30:00Z"
  },
  "deploy.envs": {
    "id": "deploy.envs",
    "assumption": "Deployed to local and render",
    "evidence": ["answers.json"],
    "confidence": 1.0,
    "status": "confirmed",
    "createdAt": "2025-11-09T15:30:00Z"
  }
}
```

**Safe to commit.** Provides audit trail.

### `.arela/profile.json`

Personality configuration.

```json
{
  "tone": "direct",
  "humour": "dry",
  "style": "naija",
  "ask_before_fix": true,
  "max_questions": 8
}
```

**Options:**

| Field | Values | Default |
|-------|--------|---------|
| `tone` | `direct`, `friendly`, `formal` | `direct` |
| `humour` | `dry`, `none`, `light` | `dry` |
| `style` | `naija`, `standard`, `terse` | `naija` |
| `ask_before_fix` | `true`, `false` | `true` |
| `max_questions` | 1-20 | 8 |

## Question Packs

Located in `templates/.arela/questions/*.json`

### deployment.json
- Where deployed (local, render, vercel, etc)
- Staging/prod URLs
- Auto-deploy on merge

### ci.json
- CI provider (GitHub Actions, GitLab CI, etc)
- Runs on PR?
- Blocks merge if failing?
- Runs tests?

### tests.json
- Strategy (pyramid, trophy, ice-cream-cone)
- Frameworks (jest, vitest, pytest, etc)
- Coverage target
- E2E tests?

### environments.json
- Has staging?
- Secrets manager (vault, AWS, GCP, doppler, etc)
- Config format (.env, yaml, json)

### agents.json
- Use AI agents?
- Preferred agents (ollama, openai, anthropic, etc)
- Allow auto-fix?

## Personality Styles

### Naija Style (Default)
```
Quick one: Where is this deployed?  (no long story)
```

- Replaces "Please" with "Quick one"
- Adds "(no long story)" for long prompts
- Direct and efficient

### Standard Style
```
Where is this deployed for testing/staging/prod?
```

- Clean, professional
- No modifications

### Terse Style
```
Where deployed?
```

- Removes "Please"
- Strips "(if any)"
- Minimal words

## Workflow

### First Run
```bash
$ npx arela init
$ npx arela configure

# Arela asks 6-8 questions
# Saves answers to .arela/answers.json
# Records assumptions to .arela/assumptions.json
```

### Subsequent Runs
```bash
$ npx arela audit

# Arela uses saved answers
# Only asks if new keys needed
# Updates assumptions ledger
```

### CI Integration
```bash
# In CI, fail if missing keys
$ npx arela configure --noninteractive

# Or commit answers.json
$ git add .arela/answers.json .arela/assumptions.json .arela/profile.json
$ git commit -m "chore(arela): captured answers and assumptions"
```

## How Auditors Use This

### Before (Assuming)
```typescript
// Auditor just guesses
if (workflowFiles.length === 0) {
  return {
    why: "No CI workflows found",
    // Arela doesn't know if you use CI or not
  };
}
```

### After (Asking)
```typescript
// Auditor records assumption
await recordAssumption(cwd, {
  id: "ci.provider",
  assumption: "No CI provider detected",
  evidence: [".github/workflows/"],
  confidence: 0.9,
  status: "assumed",
});

// If user runs configure, assumption gets confirmed
// Auditor can now make better decisions
```

## Benefits

### 1. No More Guessing
Arela asks instead of assuming. Every heuristic is logged.

### 2. Audit Trail
`.arela/assumptions.json` shows what Arela thinks and why.

### 3. CI-Friendly
Commit `answers.json` once, CI uses it forever.

### 4. Personality Without Cringe
Configurable tone, but always professional.

### 5. Targeted Questions
Only asks what's missing. Max 8 questions per run.

## Example Session

```bash
$ npx arela configure

Configuring Arela...

Profile: naija / direct / dry

Asking 6 questions:

✔ Quick one: Where is this deployed for testing/staging/prod?   (no long story)
  › local, render

✔ Staging base URL (if any)
  › https://staging.example.com

✔ Which CI provider?
  › github-actions

✔ Does CI run on every PR?
  › yes

✔ Testing strategy?
  › trophy

✔ Do you run E2E tests?
  › no

✓ Configuration saved
  Answers: .arela/answers.json
  Assumptions confirmed: 6

$ npx arela audit

Running audit checks...

🟠 ci.missing_pr_eval
   PRs skip Arela governance checks
   Evidence: .github/workflows/arela-doctor.yml:1
   Fix: Add 'npx arela doctor --eval' step to PR workflow

📊 Audit Summary
Score: 73/100

$ npx arela explain ci.missing_pr_eval

ci.missing_pr_eval

Category: governance
Severity: high

Why:
  PRs skip Arela governance checks

Evidence:
  - .github/workflows/arela-doctor.yml:1

Fix:
  Add 'npx arela doctor --eval' step to PR workflow

Related Assumptions:
  ✓ GitHub Actions detected (confirmed, confidence: 1)
```

## Philosophy

**Arela asks before it judges.**

- No vibes
- No assumptions without evidence
- No roasting without receipts
- Just questions, answers, and audit trails

You get:
- 🎯 **Targeted questions** - Only what's missing
- 📋 **Audit trail** - Every assumption logged
- 🔒 **CI-safe** - Commit answers once
- 🗣️ **Personality** - Direct, not annoying

**The senior engineer who actually asks for context.** 🎯
