# Checklist Slice 🛑

The "Pre-Flight Check" for Arela. This slice enforces the "Update Protocol" (Definition of Done).

## Purpose
To programmatically verify that the agent has performed all necessary hygiene steps before declaring a task complete.

## Features
- **Guard Verification:** Runs `npm run test:guards`.
- **Git Awareness:** Checks if `docs/` and `spec/tests/` are updated.
- **Graph Awareness:** Checks for cascading dependency impacts.
- **Hygiene:** Checks `SCRATCHPAD.md` and `task.md` freshness.

## Usage
Called via `arela_checklist`.
