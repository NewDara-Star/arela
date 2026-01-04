# arela_verify

Fact-check claims before stating them.

## Purpose

Prevents AI hallucinations by **verifying claims against actual file content** before stating them as facts.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `claim` | string | Yes | Human-readable claim to verify |
| `path` | string | Yes | Relative path to file |
| `type` | string | Yes | Verification method |
| `pattern` | string | No | Pattern to search for |

## Verification Types

### `file_exists`

Check if a file exists:

```json
{
  "claim": "theme.css exists",
  "path": "src/theme.css",
  "type": "file_exists"
}
```

### `contains`

Check if file contains a substring:

```json
{
  "claim": "File uses useState",
  "path": "src/App.tsx",
  "type": "contains",
  "pattern": "useState"
}
```

### `regex`

Check if file matches a regex pattern:

```json
{
  "claim": "File exports a function",
  "path": "src/utils.ts",
  "type": "regex",
  "pattern": "export (function|const)"
}
```

## Returns

```
✅ VERIFICATION RESULT: true
Reason: Pattern found at line 15

❌ VERIFICATION RESULT: false
Reason: File does not exist
```

## Example Usage

Before saying "The project uses React Query":

```json
{
  "name": "arela_verify",
  "arguments": {
    "claim": "Project uses React Query",
    "path": "package.json",
    "type": "contains",
    "pattern": "react-query"
  }
}
```

## The Gatekeeper Pattern

This tool enforces **truth over confidence**. 

When AI is unsure:
1. Call `arela_verify` with the claim
2. If true → state the fact
3. If false → correct course ("I checked and it doesn't use React Query")

## Implementation

Located in `slices/verification/gatekeeper.ts`.

## Related Tools

- [arela_context](/tools/context) — Read project files
- [arela_graph_impact](/tools/graph-impact) — Check dependencies
