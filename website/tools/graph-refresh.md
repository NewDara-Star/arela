# arela_graph_refresh

Force a complete re-index of the codebase graph.

## Purpose

Rebuilds the dependency graph from scratch. Use when:
- Graph seems out of date
- After major refactoring
- After pulling new code

## What It Indexes

- Static imports/exports
- Dynamic `import()` and CommonJS `require()`
- TypeScript `baseUrl` + `paths` aliases from `tsconfig.json`
- Common file resolution (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, plus `index.*`)
- Respects `.arelaignore`

## Parameters

None.

## Returns

```
✅ Graph refreshed. Indexed 25 files.
```

## When to Use

- After `git pull` with significant changes
- When impact analysis returns unexpected results
- After batch file operations

## Note

The graph auto-updates on file changes, so you rarely need this. It's mainly for:
- Initial setup
- Recovery from corruption
- Manual verification

## Implementation

Located in `slices/graph/gatekeeper.ts` and `slices/graph/indexer.ts`.

## Related Tools

- [arela_graph_impact](/tools/graph-impact) — Analyze dependencies
