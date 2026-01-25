# arela_graph_impact

Analyze code dependencies before making changes.

## Purpose

Answers: **"If I change this file, what else might break?"**

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Relative path to file |

## Returns

```
🕸️ IMPACT ANALYSIS for slices/graph/schema.ts

⬆️ UPSTREAM (Files that import this):
- slices/graph/db.ts

⬇️ DOWNSTREAM (Files this imports):
- None
```

## Example Usage

Before refactoring a utility:

```json
{
  "name": "arela_graph_impact",
  "arguments": {
    "path": "slices/memory/logic.ts"
  }
}
```

## Key Concepts

- **Upstream:** Files that depend on the target (would break if you change it)
- **Downstream:** Files the target depends on

## When to Use

- Before renaming a function or file
- Before deleting code
- Understanding code structure

## Engine

- SQLite database at `.arela/graph.db`
- Updated automatically when files change
- Tracks static imports, dynamic `import()`/`require()`, and `tsconfig` path aliases

## Implementation

Located in `slices/graph/gatekeeper.ts`.

## Related Tools

- [arela_graph_refresh](/tools/graph-refresh) — Force re-index
- [arela_vector_search](/tools/vector-search) — Find by meaning
