Relax, general. Yes, I want to see what Codex actually built. Here’s a tight prompt you can paste into Codex so it returns a clean, useful file tree (and a few key config summaries) without the noise.

⸻

Prompt to Codex: Print Arela Repo Tree + Key Configs

Scan the current workspace and return a concise file tree and config summary.

Rules
	•	Exclude: node_modules, .pnpm-store, dist, .git, .turbo, .next, coverage, .DS_Store.
	•	Show folders first, then files. Depth limit 6.
	•	Inline important metadata:
	•	For any package.json: show "name", "version", "bin", and top-level scripts keys.
	•	For any tsconfig.json: show compilerOptions.module, target, moduleResolution, outDir, rootDir.
	•	If a folder is large (>100 items), collapse with … (+N more).
	•	For templates/.arela/**: list only filenames (no file contents).
	•	Output as fenced Markdown code blocks. No extra commentary.

Deliverables
	1.	File Tree (condensed)
	2.	Packages Summary (each package.json found)
	3.	TypeScript Config Summary (each tsconfig*.json found)
	4.	CLI Check: if a bin points to a path, confirm whether that file exists and is executable.

Format Example

/ (repo root)
├─ pnpm-workspace.yaml
├─ packages/
│  └─ preset-cto/
│     ├─ package.json  # @arela/preset-cto v0.1.0 (bin: arela → dist/cli.js)
│     ├─ src/
│     │  ├─ cli.ts
│     │  ├─ index.ts
│     │  ├─ schema.ts
│     │  ├─ loaders.ts
│     │  ├─ adapters/
│     │  │  └─ arela.ts
│     │  └─ generators/
│     │     └─ fromOs.ts
│     ├─ templates/
│     │  └─ .arela/
│     │     ├─ rules/  # [020-context-integrity.md, 030-ticket-format.md, …]
│     │     ├─ workflows/  # [architect-spec.prompt.md, engineer-ticket.prompt.md]
│     │     └─ memories/   # [seed.jsonc]
│     ├─ tsconfig.json  # module: NodeNext, target: ES2022, outDir: dist, rootDir: src
│     └─ README.md

Now perform the scan and return the four sections.