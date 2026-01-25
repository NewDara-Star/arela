# Dashboard Slice

Exports a per-repo dashboard JSON that powers the live dashboard site.

## Sources of Truth
- Graph DB: `.arela/graph.db`
- PRD: `spec/prd.json`
- Tickets: `spec/tickets/*.md`
- Tests: `spec/tests/**/*.feature`
- Test results: `.arela/test-results.json`
- Git changes: `git status` + `git log`

## Output
- `.arela/dashboard.json` (canonical)
- `website/public/dashboard.json` (dashboard site)

## Watchers
The MCP server starts a dashboard watcher to re-export on spec/test/ticket changes.
