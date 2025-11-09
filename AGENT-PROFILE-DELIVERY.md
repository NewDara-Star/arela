# Agent Profile Delivery

Agents see your profile because we shove it in their face. Three delivery paths, all clean.

## Quick Start

```bash
# Method 1: Inline (works everywhere)
npx arela agent bootstrap | pbcopy

# Method 2: File-based (Cursor/Windsurf)
npx arela agent install --agent=cursor

# Method 3: Env vars (CI/headless)
eval "$(npx arela agent env)"
```

## Delivery Methods

### 1. Inline Bootstrap (Universal)

Profile and answers embedded directly in the system prompt.

**Command:**
```bash
npx arela agent bootstrap
```

**Output:**
```
SYSTEM: Arela Bootstrap (arela)

Load `.arela/rules/*` and `.arela/workflows/*`. If any file is missing, ask for it before proceeding.

Rules:
- .arela/rules/020-context-integrity.md
- .arela/rules/030-ticket-format.md
...

Workflows:
- .arela/workflows/engineer-ticket.prompt.md
...

Enforce: arela.context_integrity, arela.ticket_format, arela.code_review_gates, arela.testing_trophy, arela.observability_minimums.

=== PROFILE ===
{
  "tone": "direct",
  "humour": "dry",
  "style": "naija",
  "ask_before_fix": true,
  "max_questions": 8
}

=== ANSWERS ===
{
  "deploy.envs": ["local", "render"],
  "ci.provider": "github-actions",
  "tests.strategy": "trophy"
}
```

**Usage:**
```bash
# Copy to clipboard
npx arela agent bootstrap | pbcopy

# Paste into Claude, ChatGPT, or any agent
# Profile is already embedded
```

**Pros:**
- ✅ Works everywhere
- ✅ No file dependencies
- ✅ Self-contained

**Cons:**
- ⚠️ Manual copy/paste
- ⚠️ Must re-copy if profile changes

### 2. File-Based (IDE Agents)

Profile references written to IDE-specific files.

**Command:**
```bash
# Cursor
npx arela agent install --agent=cursor

# Windsurf
npx arela agent install --agent=windsurf
```

**Files Created:**

**`.cursor/rules.md`:**
```markdown
# Arela Bootstrap

Load and respect these files:
- .arela/profile.json
- .arela/answers.json
- .arela/rules/*
- .arela/workflows/*

If a value is missing, ask via "Arela Q&A".

SYSTEM: Arela Bootstrap (arela)
...
```

**`.windsurf/cascade.bootstrap.md`:**
```markdown
# Arela Bootstrap

Load and respect these files:
- .arela/profile.json
- .arela/answers.json
- .arela/rules/*
- .arela/workflows/*

If a value is missing, ask via "Arela Q&A".

SYSTEM: Arela Bootstrap (arela)
...
```

**Usage:**
```bash
# Install once
npx arela agent install --agent=cursor

# IDE agent loads files automatically every session
# No manual copying needed
```

**Pros:**
- ✅ Automatic loading
- ✅ Always up-to-date
- ✅ No manual steps

**Cons:**
- ⚠️ IDE-specific
- ⚠️ Must be at repo root

### 3. Environment Variables (CI/Headless)

Profile and answers exported as base64 env vars.

**Command:**
```bash
npx arela agent env
```

**Output:**
```bash
export ARELA_PROFILE_B64='eyJ0b25lIjoiZGlyZWN0IiwiaHVtb3VyIjoiZHJ5Iiwic3R5bGUiOiJuYWlqYSIsImFza19iZWZvcmVfZml4Ijp0cnVlLCJtYXhfcXVlc3Rpb25zIjo4fQ=='
export ARELA_ANSWERS_B64='eyJkZXBsb3kuZW52cyI6WyJsb2NhbCIsInJlbmRlciJdLCJjaS5wcm92aWRlciI6ImdpdGh1Yi1hY3Rpb25zIiwidGVzdHMuc3RyYXRlZ3kiOiJ0cm9waHkifQ=='
```

**Usage:**
```bash
# In shell
eval "$(npx arela agent env)"

# In CI
- name: Load Arela Config
  run: eval "$(npx arela agent env)"

# Agent decodes
const profile = JSON.parse(
  Buffer.from(process.env.ARELA_PROFILE_B64 || "e30=", "base64").toString("utf8")
);
```

**Pros:**
- ✅ CI-friendly
- ✅ No file dependencies
- ✅ Scriptable

**Cons:**
- ⚠️ Requires shell eval
- ⚠️ Base64 encoding

## Guardrails

### Doctor Check

Arela doctor now checks for missing profile:

```bash
$ npx arela doctor

Configuration issues:
  • Missing .arela/profile.json (run `npx arela configure`)

Rules OK (12)
Workflows OK (4)
```

**Prevents blind sessions.** If profile is missing, you'll know.

### Safe to Commit

All three methods are safe:

- ✅ **profile.json** - No secrets, just preferences
- ✅ **answers.json** - No secrets, just answers
- ✅ **assumptions.json** - No secrets, just audit trail

**Commit them:**
```bash
git add .arela/profile.json .arela/answers.json .arela/assumptions.json
git commit -m "chore(arela): captured config"
```

## Complete Workflow

### First-Time Setup

```bash
# 1. Configure
npx arela configure

# 2. Choose delivery method
npx arela agent bootstrap | pbcopy  # OR
npx arela agent install --agent=cursor  # OR
eval "$(npx arela agent env)"

# 3. Commit config
git add .arela/*.json
git commit -m "chore(arela): captured config"
```

### Daily Usage

**Method 1 (Inline):**
```bash
# Re-copy if profile changed
npx arela agent bootstrap | pbcopy
```

**Method 2 (File-based):**
```bash
# Nothing to do - IDE loads automatically
```

**Method 3 (Env vars):**
```bash
# Re-export if profile changed
eval "$(npx arela agent env)"
```

## Troubleshooting

### Agent Claims It Didn't See Profile

**Check:**
1. Are you at repo root?
2. Does `.arela/profile.json` exist?
3. Did you use the right delivery method?

**Fix:**
```bash
# Verify profile exists
cat .arela/profile.json

# Re-run delivery
npx arela agent bootstrap | pbcopy
```

### Profile Not Updating

**Method 1 (Inline):**
```bash
# Must re-copy
npx arela agent bootstrap | pbcopy
```

**Method 2 (File-based):**
```bash
# Restart IDE or re-install
npx arela agent install --agent=cursor --force
```

**Method 3 (Env vars):**
```bash
# Re-export
eval "$(npx arela agent env)"
```

### Wrong Working Directory

**Problem:** Agent launched in subdirectory, can't find `.arela/`

**Fix:**
```bash
# Always launch from repo root
cd /path/to/repo
npx arela agent bootstrap | pbcopy
```

Or use absolute paths in bootstrap.

## Examples

### Claude Desktop

```bash
# Copy bootstrap
npx arela agent bootstrap | pbcopy

# Paste into Claude
# Profile is embedded in system prompt
```

### Cursor

```bash
# Install once
npx arela agent install --agent=cursor

# Cursor loads .cursor/rules.md automatically
# Which references .arela/profile.json
```

### Windsurf

```bash
# Install once
npx arela agent install --agent=windsurf

# Windsurf loads .windsurf/cascade.bootstrap.md
# Which references .arela/profile.json
```

### GitHub Actions

```yaml
name: Arela Agent Task
on: [workflow_dispatch]
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm i
      
      - name: Load Arela Config
        run: eval "$(npx arela agent env)"
      
      - name: Run Agent
        run: |
          # Agent can now access profile
          echo $ARELA_PROFILE_B64 | base64 -d
```

### Shell Script

```bash
#!/bin/bash
set -e

# Load config
eval "$(npx arela agent env)"

# Decode profile
PROFILE=$(echo "$ARELA_PROFILE_B64" | base64 -d)
ANSWERS=$(echo "$ARELA_ANSWERS_B64" | base64 -d)

echo "Profile: $PROFILE"
echo "Answers: $ANSWERS"

# Use in agent calls
curl -X POST https://api.example.com/agent \
  -H "Content-Type: application/json" \
  -d "{\"profile\": $PROFILE, \"answers\": $ANSWERS}"
```

## Commands Reference

### `arela agent bootstrap`

Print bootstrap prompt with embedded profile/answers.

**Options:**
- `--cwd <dir>` - Directory to operate in

**Output:** System prompt text

### `arela agent install --agent <name>`

Install bootstrap files for specific IDE.

**Options:**
- `--agent <name>` - `cursor`, `windsurf`, `claude`, `generic` (required)
- `--cwd <dir>` - Directory to operate in

**Output:** Files written to `.cursor/` or `.windsurf/`

### `arela agent env`

Export profile and answers as base64 env vars.

**Options:**
- `--cwd <dir>` - Directory to operate in

**Output:** Shell export statements

### `arela doctor`

Check for missing profile and other issues.

**Options:**
- `--cwd <dir>` - Directory to operate in
- `--eval` - Also check evaluation rubric

**Output:** Configuration issues, rule/workflow status

## Philosophy

**Agents see the profile because we shove it in their face.**

Three paths:
1. **Inline** - Embedded in prompt
2. **File-based** - Referenced in IDE files
3. **Env vars** - Exported as base64

No excuses. No "I didn't see it." No confusion.

If an agent claims ignorance, it's not the profile, it's attitude.

**Zero drama. Maximum clarity.** 🎯
