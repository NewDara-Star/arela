# Session Guard & File System

Arela v5.0 introduces the **Session Guard**, a mechanism that enforces rigorous investigation before allowing code modifications. This prevents "vibe coding" (making changes based on guesses) and ensures all changes are grounded in evidence.

## Investigation State Machine (ISM)

The session moves through strict states. Write access to the filesystem is **BLOCKED** in the early states.

| State | Write Access | Purpose |
|-------|--------------|---------|
| `DISCOVERY` | 🔒 Blocked | Explore codebase, read documentation. |
| `ANALYSIS` | 🔒 Blocked | Analyze findings, formulate hypotheses. |
| `VERIFICATION` | 🔒 Blocked | Test hypotheses without changing code. |
| `IMPLEMENTATION` | ✅ GRANTED | Apply fixes and features. |
| `REVIEW` | ✅ GRANTED | Verify the fix works. |

## Session Guard Tools

Tools to manage the investigation lifecycle.

### `log_symptom`
Start an investigation by logging a symptom or error.
- **Input:** `error_message`, `context`
- **Transition:** `DISCOVERY` → `ANALYSIS`

### `register_hypothesis`
Formalize your theory about the root cause.
- **Input:** `suspected_root_cause`, `evidence_files`, `reasoning_chain`, `verification_plan`
- **Transition:** `ANALYSIS` → `VERIFICATION`
- **Note:** Requires evidence files to have been read previously.

### `confirm_hypothesis`
Confirm your hypothesis was correct after testing.
- **Input:** `verification_result`
- **Transition:** `VERIFICATION` → `IMPLEMENTATION` (Unlocks Write Access)

### `reject_hypothesis`
Discard a disproven hypothesis.
- **Transition:** `VERIFICATION` → `ANALYSIS` (Try again)

### `escalate`
Request human assistance when stuck.
- **Input:** `summary`, `attempts_made`
- **Transition:** Resets session.

### `guard_status`
Check current state and write access status.

---

## Guarded File System

Standard filesystem tools are wrapped to enforce the Session Guard.

### Guarded Tools (Blocked in Early States)
These tools throw an error if used before `IMPLEMENTATION` state.
- `edit_file`
- `write_file`
- `delete_file`
- `create_dir`
- `move_file`

### Unguarded Tools (Always Allowed)
- `read_file`: Readings are tracked as "Evidence".
- `list_dir`: Exploration is always allowed.

## Example Workflow

1. **Discovery:** `read_file('src/buggy.ts')` → logic error found.
2. **Log:** `log_symptom(error="Index out of bounds")`.
3. **Hypothesis:** `register_hypothesis(cause="Off by one error in loop")`.
4. **Verify:** Run reproduction script (using `run_command`).
5. **Confirm:** `confirm_hypothesis(result="Script confirmed crash")`.
6. **Fix:** `edit_file('src/buggy.ts')` (Now allowed!).
