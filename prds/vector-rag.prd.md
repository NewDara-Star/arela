---
id: REQ-009
title: Vector Search (RAG)
type: feature
status: implemented
author: Arela
created: 2026-01-04
last_updated: 2026-01-04
---

# Vector Search (RAG)

## Problem
Keyword search (`grep`) fails when you don't know the exact term (e.g., finding "auth logic" when it's named "Gatekeeper"). We need semantic search.

## Solution
Use Ollama to generate embeddings for code chunks and store them in a local vector index for semantic retrieval.

## User Stories

### US-001: Indexing
- **As an** Agent
- **I want to** call `arela_vector_index`
- **So that** the codebase is scanned and embeddings are created.

### US-002: Semantic Search
- **As an** Agent
- **I want to** call `arela_vector_search` with a concept (e.g. "memory persistence")
- **So that** I find relevant files even if they don't contain those exact words.

## Technical Specs
- **Files:** `slices/vector/ops.ts`
- **Logic:**
  - `buildVectorIndex()`: Chunks files -> Ollama -> Vector Store.
  - `searchVectorIndex()`: Query -> Ollama -> Cosine Similarity.
