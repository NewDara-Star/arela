# arela_vector_search

Search code by meaning, not just keywords.

## Purpose

Semantic search that understands **what you want**, not just exact text matches.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | What you're looking for |
| `limit` | number | No | Max results (default: 5) |

## Returns

```
🔍 Semantic Results for "authentication logic":

📄 src/auth/login.ts (Score: 0.89)
```
// Authentication handler
async function verifyCredentials(email, password) {
  ...
}
```

📄 src/middleware/session.ts (Score: 0.75)
```
// Session validation middleware
...
```
```

## Example Usage

Finding where something is implemented:

```json
{
  "name": "arela_vector_search",
  "arguments": {
    "query": "where do we handle user login",
    "limit": 3
  }
}
```

## How It Works

1. Your query is converted to an embedding (vector)
2. Compared against all code embeddings
3. Results ranked by cosine similarity

## Engine

- **Model:** `nomic-embed-text` (via Ollama)
- **Storage:** `.arela/.rag-index.json`
- **Auto-updates:** Yes (watches file changes)

## Requires

- Ollama installed and running
- Index built (runs automatically on first use)

## Implementation

Located in `slices/vector/ops.ts`.

## Related Tools

- [arela_vector_index](/tools/vector-index) — Manual reindex
- [arela_verify](/tools/verify) — Check specific files
