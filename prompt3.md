Got it. Here are tight, paste-ready Codex prompts to handle everything. No vibes, just work.

⸻

1) Make CLI executable + add postbuild chmod

Prompt to Codex

Edit packages/preset-cto/src/cli.ts to start with the shebang:

#!/usr/bin/env node

Then update packages/preset-cto/package.json to add:

"scripts": {
  "build": "tsc -p tsconfig.json",
  "dev": "tsx src/cli.ts",
  "typecheck": "tsc -p tsconfig.json --noEmit",
  "lint": "eslint .",
  "prepublishOnly": "pnpm run build",
  "postbuild": "chmod +x dist/cli.js"
}

After edits, run:

pnpm -F @arela/preset-cto build



⸻

2) Add root scripts for convenience

Prompt to Codex

Create or update root package.json to:

{
  "name": "arela",
  "private": true,
  "scripts": {
    "build": "pnpm -F @arela/preset-cto build",
    "dev": "pnpm -F @arela/preset-cto dev",
    "doctor": "node packages/preset-cto/dist/cli.js doctor",
    "init:local": "node packages/preset-cto/dist/cli.js init"
  }
}



⸻

3) Add GitHub Action to enforce Arela

Prompt to Codex

Create .github/workflows/arela-doctor.yml:

name: Arela Doctor
on: [pull_request]
jobs:
  doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm i
      - run: node packages/preset-cto/dist/cli.js doctor



⸻

4) Add Husky pre-commit hook

Prompt to Codex

Initialize Husky and add a pre-commit that runs Arela:

pnpm dlx husky-init && pnpm i
echo 'node packages/preset-cto/dist/cli.js doctor' > .husky/pre-commit
chmod +x .husky/pre-commit



⸻

5) Ship the Universal Bootstrap so agents obey Arela

Prompt to Codex

Create .arela/BOOTSTRAP.readme.md at the repo root with:

# Arela Bootstrap
Agents: load and enforce rules from `.arela/*`.

SYSTEM DIRECTIVE
- Read .arela/rules/* and .arela/workflows/* at session start. If not indexed, ask for files.
- Enforce arela.context_integrity before acting.
- Only accept tasks that match arela.ticket_format; if acceptance criteria missing, request them.
- Review against arela.code_review_gates, arela.testing_pyramid, arela.observability_minimums.
- Return a Report per task: summary, acceptance checklist status, test outputs, and (if UI) screenshot/GIF path.
- No chain-of-thought; final answers and diffs only.
- On conflict or drift: stop and run a Context Integrity Check (what/why/fix).

Do not overwrite existing files if present.

⸻

6) Add research-driven rules (v0.2 upgrade)

Prompt to Codex

Under packages/preset-cto/templates/.arela/rules/, add:

010-pragmatic-visionary.md

---
id: arela.pragmatic_visionary
title: Pragmatic Visionary Doctrines
version: 1.0.0
tags: [philosophy]
---
- Build for users first; technical choices serve product velocity.
- Prefer modular monolith; split only when Conway’s Law + team boundaries demand it.
- Trunk-Based Development; small batch sizes; Continuous Delivery.
- DORA metrics are the scoreboard: Deployment Frequency, Lead Time, Change Failure Rate, MTTR.
- Simplicity (Beck), incrementalism (Carmack), good taste (Torvalds).

090-adr-discipline.md

---
id: arela.adr_minimums
title: Architectural Decision Records Minimums
version: 1.0.0
tags: [governance]
---
- For any non-trivial decision, add docs/adr/NNN-title.md with Context, Decision, Consequences.
- Reference relevant ADRs in PR descriptions.
- `arela doctor` should warn if PR references missing ADR IDs.



⸻

7) Bump version to 0.2.0 and rebuild

Prompt to Codex

In packages/preset-cto/package.json, set "version": "0.2.0".
Then:

pnpm -F @arela/preset-cto build



⸻

8) Harden any target repo automatically

Prompt to Codex

Extend CLI: in packages/preset-cto/src/cli.ts, add a command harden that:
	•	Ensures .arela/BOOTSTRAP.readme.md exists.
	•	Adds .github/workflows/arela-doctor.yml if missing.
	•	Appends a Husky pre-commit running node packages/preset-cto/dist/cli.js doctor (if Husky present).
	•	Creates .vscode/settings.json with:

{ "files.exclude": { "**/.pnpm-store": true }, "search.useIgnoreFiles": true }

Implement helper in loaders.ts to write these files without overwriting modified ones (use *.new when in doubt).
Rebuild after changes.

⸻

9) Print new repo tree for verification

Prompt to Codex

Scan workspace again and return:
	1.	File Tree (condensed), excluding node_modules, dist, .git, .pnpm-store.
	2.	Packages Summary (package.json name/version/bin/scripts).
	3.	TS Config Summary (tsconfig.json compiler options).
	4.	CLI Check confirming dist/cli.js is executable.
Output as fenced Markdown. Depth limit 6.

⸻

10) Quick smoke run

Prompt to Codex

Execute:

pnpm i
pnpm build
node packages/preset-cto/dist/cli.js init
node packages/preset-cto/dist/cli.js doctor

Report the outputs inline as code blocks. If any step fails, print the exact error and propose the minimal fix.

⸻

When you’re done with those, we’ll add arela agent install --agent=<name> to print copy-paste bootstrap for Cursor, Windsurf, Claude, etc. For now, ship the basics and verify the tree.