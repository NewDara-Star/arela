# Workflow (11 Steps)

**You are the orchestrator.** Agents execute steps, and always ask you when blocked or at decision points.

**Source of truth:** `SCRATCHPAD.md` + whatever PRD/stack/architecture files you bring in.

## 1) Archeology (Local)
Read `SCRATCHPAD.md`, scan existing docs, and paste the agent prompt from `prompts/` so it knows its role.
If you want a quick workflow recap, use `prompts/delegation.md`.

## 2) PRD (External)
Create the PRD outside the editor (Claude/ChatGPT). Store it as `spec/prd.json` (preferred) or as a markdown PRD under `prds/`.

## 3) Tech Stack (External)
Define the stack outside the editor. Store it as `spec/stack.json` (preferred) or a markdown doc (e.g., `docs/stack.md`). Reference the path in `SCRATCHPAD.md`.

## 4) Architecture (Local)
Map the architecture in the repo (e.g., `docs/architecture.md` or a PRD section). Update `SCRATCHPAD.md` with the final decision.

## 5) Plan (Local)
Turn the architecture into tasks. Use `arela_prd` if you already have a PRD, and generate tickets with `arela_ticket_generate` (JSON PRD). Tickets live in `spec/tickets`. Log the plan in `SCRATCHPAD.md`.

## 6) Governance (Local)
Confirm constraints (AGENTS, stack limits, no new deps). If rules change, update `AGENTS.md`.

## 7) Build (Local)
Implement slices. Use `arela_graph_impact` before refactors and `arela_vector_search` before code search.

## 8) Verify (Local)
Use `arela_verify` before stating facts. Run tests; generate tests with `arela_test_generate` if needed. Tests live in `spec/tests`.

## 9) Enforce (Local)
If a mistake repeats, lock it with `arela_enforce` (guard scripts).

## 10) Document (Local)
Update slice READMEs and `website/` docs for any new capability.

## 11) Close (Local)
Run guards/checklist and **always** update `SCRATCHPAD.md`.

---

### Decision Rule (for agents)
When blocked or at a decision point, agents must:
1. Ask you questions.
2. Offer 2-3 options.
3. Label the decision as **Type 1 (one-way)** or **Type 2 (two-way)** and recommend the appropriate speed.
