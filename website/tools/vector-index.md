# arela_vector_index

Build embeddings for the entire codebase.

## Purpose

Scans all code files and creates embeddings for semantic search.

## Parameters

None.

## Returns

```
✅ Indexed 150 chunks. Ready for search.
```

## When to Use

- First-time setup
- After major codebase changes
- If search results seem stale

## Warning

⏱️ **This can be slow** (1-2 minutes for large codebases).

The index auto-updates on file changes, so you rarely need manual reindexing.

## What Gets Indexed

```
**/*.{ts,md,json}
```

Excluded:
- `node_modules/`
- `dist/`
- `build/`
- `.arela/`
- `.git/`
- Anything listed in `.arelaignore`

## Engine

- **Model:** `nomic-embed-text`
- **Auto-pull:** Yes (Arela downloads if missing)
- **Auto-start:** Yes (starts Ollama if not running)

## Implementation

Located in `slices/vector/ops.ts`.

## Related Tools

- [arela_vector_search](/tools/vector-search) — Use the index
