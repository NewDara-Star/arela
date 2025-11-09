

1) Auto-materialise rules into the repo from the package

So agents can index .arela/** without magic.

Prompt to Codex

Add a postinstall in packages/preset-cto/package.json that runs node dist/cli.js init only if a .arela folder doesn’t exist in the consumer repo (guard with env ARELA_SKIP_POSTINSTALL=1 to opt out).
Implement in src/cli.ts and src/loaders.ts a safe check: if process.env.npm_lifecycle_event === "postinstall" and current dir is inside another project, run init non-destructively. Add clear console output.

2) Universal Bootstrap Prompt command (copy-paste for any agent)

Prompt to Codex

In src/cli.ts, add agent bootstrap that prints a single SYSTEM prompt telling any agent to load .arela/rules/* and .arela/workflows/*, enforce arela.context_integrity, arela.ticket_format, arela.code_review_gates, arela.testing_trophy or arela.testing_pyramid, and arela.observability_minimums, and to return a “Report” per task.
Include repo name in the prompt header and paths to the local rule files.
arela agent bootstrap --json should also output a JSON with {prompt, files:[...]} listing absolute file paths so tools that accept file attachments can ingest directly.

3) Agent-specific adapters (Cursor, Windsurf, Claude)

Prompt to Codex

Add arela agent install --agent=<cursor|windsurf|claude|generic>:
	•	cursor: write .cursor/rules.md with the Universal Bootstrap Prompt and links to .arela files.
	•	windsurf: write .windsurf/README.md and a cascade.bootstrap.md with the prompt.
	•	claude: just print the prompt; Claude needs paste.
	•	generic: print prompt and file list.
Don’t overwrite existing files; create *.new if they differ.

4) Make agents actually respect Arela in CI and locally

Prompt to Codex

Add arela harden command that:
	•	Creates .github/workflows/arela-doctor.yml to run node node_modules/@arela/preset-cto/dist/cli.js doctor on PRs.
	•	If Husky present, appends a pre-commit: node node_modules/@arela/preset-cto/dist/cli.js doctor.
	•	Creates .arela/BOOTSTRAP.readme.md summarising rules and linking each file.
	•	Writes .vscode/settings.json to keep .arela/** visible to workspace search (agents index it better).

5) Pin rules and stay up to date

Prompt to Codex

Implement arela sync and arela upgrade so they:
	•	Pull any new rules/workflows from templates/.arela/** into the project’s .arela/**.
	•	Preserve *.local.md overrides.
	•	Maintain .arela/.last-sync.json with file hashes.
Add postbuild: "chmod +x dist/cli.js" and re-build.

6) Quick usage block (print on init)

Prompt to Codex

After init, print:

Installed Arela rules in .arela/
Next:
1) npx arela agent bootstrap   # copy this into your agent’s system prompt
2) npx arela harden            # add CI + pre-commit guardrails
3) npx arela doctor            # verify

Return non-zero exit if .arela/rules/* missing or unreadable.

7) Sanity checks you’ll run
	•	pnpm i && pnpm -F @arela/preset-cto build
	•	In any app repo:

pnpm add -D @arela/preset-cto
npx arela init
npx arela agent bootstrap   # paste into Cursor/Windsurf/Claude
npx arela harden
npx arela doctor
