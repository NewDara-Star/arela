# Enforcement Checklist Tool 🛑

The **Enforcement Checklist** (`arela_checklist`) is the "Pre-Flight Check" for Arela. It programmatically verifies that the agent has performed all necessary hygiene steps before declaring a task complete.

## Usage

```bash
# Run strict checks (Guards, Docs, Tests, Hygiene)
arela check

# OR via MCP
call arela_checklist({ rigorous: true })
```

## Features

### 1. Guard Verification 🛡️
Runs `npm run test:guards` to execute all 20+ barrier scripts.
- **Ensures:** No illegal imports, no `any` types, no console logs, secure filesystem usage.
- **Pass:** All guards return exit code 0.

### 2. Git Awareness 📝
Checks the Git status of documentation and test folders.
- **Ensures:** You didn't just write code without updating docs or tests.
- **Pass:** Changes detected in `*.md` and `spec/tests/`.

### 3. VSA Validation 🏗️
Enforces the Vertical Slice Architecture structure.
- **Ensures:** Every slice in `slices/` has a `README.md`.
- **Pass:** Structure is consistent.

### 4. Graph Awareness 🕸️
Checks for cascading dependency impacts.
- **Ensures:** If you changed `types.ts`, you likely updated `ops.ts`.
- **Pass:** Dependency graph integrity verified.

### 5. Memory Hygiene 🧠
Checks user session memory.
- **Ensures:** `SCRATCHPAD.md` exists and is accessible.
- **Pass:** Memory file is present.

## When to Use
Run this tool **before** calling `notify_user` to finish a task. It is the "Definition of Done".
