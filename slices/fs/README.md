# Guarded Filesystem Slice

This slice implements filesystem operations (`edit_file`, `write_file`, etc.) that are guarded by the Session Guard's Investigation State Machine.

## Purpose

Instead of using an external, unguarded filesystem MCP server, Arela internally implements these tools. This allows us to intercept every write operation and block it if the agent has not completed the investigation phase.

## Tools Provided

| Tool | Guarded | Purpose |
|------|---------|---------|
| `edit_file` | ✅ YES | Modify existing files |
| `write_file` | ✅ YES | Create or overwrite files |
| `read_file` | ❌ NO | Read file content (Tracked as Evidence) |
| `list_directory` | ❌ NO | Explore file structure |
| `delete_file` | ✅ YES | Delete files |
| `create_directory` | ✅ YES | Create directories |
| `move_file` | ✅ YES | Rename/move files |

## Security Implementation

Every write operation calls `checkWriteAccessOp(toolName)` from `slices/guard/ops.ts`.
- If Arela is in `DISCOVERY`, `ANALYSIS`, or `VERIFICATION` state, the operation throws an error.
- If Arela is in `IMPLEMENTATION` or `REVIEW` state, the operation proceeds.

## Path Safety

All operations use strict path validation:
- Must be absolute paths
- Must resolve to strings (no nulls)
- Must not traverse outside allowed CWD (future enhancement)
