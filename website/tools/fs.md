# Guarded Filesystem Tools

Arela v5 replaces standard unsafe filesystem operations with **Guarded Tools**. These tools are integrated with the [Session Guard](/tools/guard) to prevent authorized code changes.

## Overview

| Tool | State Requirement | Description |
|------|-------------------|-------------|
| `read_file` | None (Tracked) | Read file content. Logs usage as evidence. |
| `list_dir` | None | List files in a folder. |
| `edit_file` | `IMPLEMENTATION` | Apply patch edits. **Blocked** in Discovery/Analysis. |
| `write_file` | `IMPLEMENTATION` | Create/Overwrite file. **Blocked** in Discovery/Analysis. |
| `delete_file` | `IMPLEMENTATION` | Delete file. **Blocked** in Discovery/Analysis. |
| `create_dir` | `IMPLEMENTATION` | Create folder. **Blocked** in Discovery/Analysis. |
| `move_file` | `IMPLEMENTATION` | Move/Rename. **Blocked** in Discovery/Analysis. |

## Why these are special

Standard MCP servers provide raw filesystem access. Arela prevents this.
If you try to use `edit_file` while in `DISCOVERY` mode, the tool will **reject** the request and tell you to investigate first.

## Tool References

### `edit_file`
Apply one or more edits to a text file.
```json
{
  "path": "src/utils.ts",
  "edits": [
    { "oldText": "foo", "newText": "bar" }
  ]
}
```

### `write_file`
Write full content to a file.
```json
{
  "path": "src/new-feature.ts",
  "content": "..."
}
```

### `read_file`
Read a file's content.
```json
{
  "path": "src/config.ts"
}
```

### `list_dir`
See what's in a folder.
```json
{
  "path": "src"
}
```

### `delete_file`
Permanently remove a file.
```json
{
  "path": "src/legacy.ts"
}
```
