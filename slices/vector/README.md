# Vector Slice (RAG) 🧠

## Purpose
Provides Semantic Search capabilities. Allows the AI to find code based on "meaning" rather than exact keyword matches.

## Engine
- **Model:** `nomic-embed-text` (via Ollama)
- **Storage:** `.arela/.rag-index.json` (Simple JSON store)
- **Logic:** Cosine Similarity

## Setup
1. Install Ollama: [ollama.ai](https://ollama.ai)
2. Run `arela_vector_index` to download the model and index the code.

## MCP Tools
| Tool | Description |
|------|-------------|
| `arela_vector_index` | Indexes the codebase (Warning: slow on first run). |
| `arela_vector_search` | Search for code by meaning. |
