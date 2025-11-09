Cool. Fresh start. Here’s a single, clean master prompt you can paste into Codex to scaffold Arela from zero to “publishable npm with CLI.” It’s self-contained, step-by-step, and leaves no room for vibes.

⸻

Prompt for Codex: Scaffold Arela (@arela/preset-cto) NPM + CLI

Goal: Create a TypeScript package named @arela/preset-cto that ships opinionated CTO rules/workflows and a CLI called arela to init, sync, upgrade, and doctor a project’s .arela/ folder.

Constraints
	•	Node ≥ 18, ESM only.
	•	Use pnpm.
	•	Zero external network calls.
	•	Clean, documented code. Compile before finishing.

⸻

1) Repo & Package

Create a monorepo root arela with one package packages/preset-cto.

Root files
	•	.gitignore for Node/TS (node_modules, dist, .DS_Store, .pnpm-store, coverage).
	•	pnpm-workspace.yaml with packages: ["packages/*"].
	•	Minimal root README.md.

Inside packages/preset-cto
	•	package.json:
	•	"name": "@arela/preset-cto"
	•	"version": "0.1.0"
	•	"type": "module"
	•	"bin": { "arela": "dist/cli.js" }
	•	"exports": { ".": "./dist/index.js" }
	•	"engines": { "node": ">=18" }
	•	scripts:
	•	"build": "tsc -p tsconfig.json"
	•	"dev": "tsx src/cli.ts"
	•	"typecheck": "tsc -p tsconfig.json --noEmit"
	•	"lint": "eslint ."
	•	"prepublishOnly": "pnpm run build"
	•	dependencies: commander, fs-extra, gray-matter, yaml, picocolors, glob, semver, zod
	•	devDependencies: typescript, tsx, @types/node, eslint, prettier
	•	tsconfig.json: ESM, module/moduleResolution = NodeNext, target = ES2022, rootDir = src, outDir = dist, declaration = true, skipLibCheck = true.
	•	ESLint + Prettier basic configs.

⸻

2) Folder Structure

packages/preset-cto/
├─ src/
│  ├─ cli.ts
│  ├─ index.ts
│  ├─ schema.ts
│  ├─ loaders.ts
│  ├─ adapters/arela.ts
│  └─ generators/fromOs.ts
├─ templates/.arela/
│  ├─ rules/
│  ├─ workflows/
│  └─ memories/
├─ README.md
└─ .gitignore


⸻

3) Types & Schemas (src/schema.ts)
	•	Implement Zod schemas + TS types:

import { z } from "zod";

export const RuleSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  version: z.string().default("1.0.0"),
  priority: z.enum(["highest","high","normal","low"]).optional(),
  appliesTo: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  body: z.string()
});
export type ArelaRule = z.infer<typeof RuleSchema>;

export const WorkflowSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  placeholders: z.array(z.string()).optional(),
  body: z.string()
});
export type ArelaWorkflow = z.infer<typeof WorkflowSchema>;

export type LoadResult<T> = { items: T[]; errors: string[] };

	•	Export parseFrontMatter(md: string) using gray-matter returning { data, content }.

⸻

4) CLI (src/cli.ts)
	•	Shebang #!/usr/bin/env node.
	•	Use commander to implement commands:

arela init [--from <osJsonPath>] [--dry-run]
	•	Creates .arela/{rules,workflows,memories} if missing.
	•	Copies templates from templates/.arela/.
	•	If --from is provided, read JSON and call generator in generators/fromOs.ts to emit additional rules; do not overwrite existing files.

arela sync [--force] [--dry-run]
	•	Copies any new template files. If destination exists and differs:
	•	default: write *.new alongside.
	•	with --force: overwrite.

arela upgrade [--dry-run]
	•	Three-way merge using .arela/.last-sync.json:
	•	If both preset and local changed since last sync, abort and print conflict list.
	•	Otherwise overwrite and update hashes.

arela doctor
	•	Validate all .arela/rules/*.md and .arela/workflows/*.md against schemas.
	•	Print colored results and exit with code 1 on error.
	•	Common options: --cwd to target another directory (default process.cwd()).

Use picocolors for output, fs-extra for file ops.

⸻

5) Loaders & Utilities (src/loaders.ts)

Implement:
	•	hashFile(path): Promise<string> sha1.
	•	ensureDirs(cwd): creates .arela/{rules,workflows,memories}.
	•	loadLocalRules(cwd): Promise<LoadResult<ArelaRule>>:
	•	Read rules/*.md, parse front-matter, validate with Zod, store errors.
	•	loadLocalWorkflows(cwd): Promise<LoadResult<ArelaWorkflow>>.
	•	copyTemplates({ cwd, force, dryRun }): Promise<void>.
	•	threeWayMerge({ cwd }): Promise<{ conflicts: string[] }> using .arela/.last-sync.json file with { presetVersion, files: { [relPath]: { templateHash, localHash }}}.
	•	init, sync, upgrade, doctor functions that the CLI calls.

⸻

6) Programmatic API (src/index.ts)

Re-export init, sync, upgrade, doctor, loadLocalRules, loadLocalWorkflows, types.

⸻

7) Arela Adapter (src/adapters/arela.ts)

Helpers:
	•	writeRule(cwd, rule: ArelaRule) → writes markdown with YAML front-matter then body.
	•	writeWorkflow(cwd, wf: ArelaWorkflow) → same.
	•	readTemplateDir() to resolve templates/.arela regardless of ESM path.

⸻

8) OS Converter Stub (src/generators/fromOs.ts)

Export:

export function emitRulesFromOs(os: any): ArelaRule[] { ... }

Map:
	•	OS context integrity directive → rule arela.context_integrity.
	•	Engineering ticket schema → rule arela.ticket_format.
	•	Testing philosophy → rule arela.testing_pyramid.
Return simple safe defaults. Use front-matter.

⸻

9) Templates: Seed Content

Create the following files under templates/.arela/ with exact contents.

rules/020-context-integrity.md

---
id: arela.context_integrity
title: Context Integrity Protocol
version: 1.0.0
priority: highest
tags: [process, quality]
---
At session start:
1) Re-read the latest project state note.
2) Ingest new inputs from THIS turn first.
3) Sanity-check the next action matches the last approved ticket or milestone.
If inconsistent: stop, state the inconsistency, and request correction before proceeding.

rules/030-ticket-format.md

---
id: arela.ticket_format
title: Engineering Ticket Format
version: 1.0.0
tags: [execution]
---
Tickets must include:
1) Context (the why) in 3–5 lines.
2) Technical task (the what) with explicit references.
3) Acceptance criteria as a checklist.
4) Files to modify.
5) Mandatory report: summary, confirmation of each acceptance item, test outputs, and (if UI) a screenshot or GIF.

rules/040-code-review-gates.md

---
id: arela.code_review_gates
title: Code Review Quality Gates
version: 1.0.0
tags: [qa, review]
---
Gate the PR on:
- Static checks clean; types precise; security warnings resolved.
- Tests: unit for business logic; integration for contracts; smoke e2e for core journeys.
- Simplicity over cleverness; invariants documented near code.
- Observability in critical paths (structured logs/traces).
- Rollback ready with release tag or flag.

rules/070-testing-pyramid.md

---
id: arela.testing_pyramid
title: Testing Pyramid Minimums
version: 1.0.0
tags: [qa]
---
Targets:
- Unit: fast, isolated, deterministic. Target ≥85% for critical modules.
- Integration: real DB or container, no mocks on public contracts.
- E2E: few, stable smoke tests for the top user journeys.
All tests must run in CI and be reproducible locally.

rules/080-observability-minimums.md

---
id: arela.observability_minimums
title: Observability Minimums
version: 1.0.0
tags: [ops]
---
- Structured JSON logs with correlation IDs.
- Golden signals tracked: latency, traffic, errors, saturation.
- Tracing enabled for cross-service calls and slow endpoints.
- Define SLOs for critical routes and alert on budget burn.

workflows/architect-spec.prompt.md

---
id: workflow.architect_spec
title: Architect Spec Writer
placeholders: ["mission","constraints","stack"]
---
You are the Architect. Produce a rigorous spec with:
- Mermaid architecture diagram
- Folder tree
- SQL schema (CREATE TABLE with FKs)
- API contracts (method, path, request/response)
- Data models
- Known pitfalls
Inputs: {mission}, {constraints}, {stack}. Prefer boring, scalable choices.

workflows/engineer-ticket.prompt.md

---
id: workflow.engineer_ticket
title: Engineer Ticket Executor
placeholders: ["context","task","acceptance","files"]
---
You are the Lead Engineer. Implement the task.
Return a report with:
- Summary of changes
- Confirmation of each acceptance item
- Test results (unit/integration)
- (If UI) screenshot/GIF path

memories/seed.jsonc

{ "//": "Optional minimal seed; projects should keep this tiny." }


⸻

10) README (packages/preset-cto/README.md)

Include:
	•	What is Arela.
	•	Install and use:

pnpm add -D @arela/preset-cto
npx arela init
npx arela sync
npx arela upgrade
npx arela doctor

	•	Local overrides rule: any *.local.md next to a preset file is never overwritten.
	•	CI example:

# .github/workflows/arela-doctor.yml
name: Arela Doctor
on: [pull_request]
jobs:
  doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm i
      - run: npx arela doctor


⸻

11) Finalize
	•	Ensure dist/cli.js is executable.
	•	Build and typecheck:
	•	pnpm i
	•	pnpm -F @arela/preset-cto build
	•	Local smoke:
	•	From repo root, run node packages/preset-cto/dist/cli.js init
	•	Verify .arela/ is created with files.
	•	Run node packages/preset-cto/dist/cli.js doctor and ensure exit code 0.

Return:
	•	File tree
	•	Key file contents inline
	•	Exact commands I should run to build and test locally

⸻

End of prompt. Now do it.