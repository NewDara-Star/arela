# arela_dashboard_export

Export the repo dashboard data to `.arela/dashboard.json` and `website/public/dashboard.json`.

## Parameters

None.

## Returns

JSON with the full dashboard payload.

## Notes
- The dashboard uses **metadata only** by default.
- Sources: graph DB (`.arela/graph.db`), PRD (`spec/prd.json`), tickets (`spec/tickets`), tests (`spec/tests`), git changes, and test results (`.arela/test-results.json`).

## Related
- `arela_graph_refresh`
- `arela_vector_index`
