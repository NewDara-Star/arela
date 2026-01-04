# Graph Analysis Slice 🕸️

## Purpose
Provides a "God View" of the codebase by tracking relationships between files, symbols, and concepts. Powered by a local SQLite database for speed and perfect recall.

## Philosophy
"Abstraction is Perfection." The user (and Agent) shouldn't care about SQL. They just ask "What depends on this?" and get a perfect answer.

## Components
- **Database:** `better-sqlite3` instance at `.arela/graph.db`.
- **Indexer:** Scans the codebase to map Imports/Exports.
- **Query Engine:** Answers impact analysis questions.

## MCP Tools
| Tool | Description |
|------|-------------|
| `arela_graph_impact` | "If I touch this file, what breaks?" |
| `arela_graph_refresh` | Force a re-index of the codebase. |

## Schema (Simplified)
- `files` (id, path, hash)
- `imports` (source_id, target_id, type)
- `symbols` (file_id, name, line_number)
