---
id: REQ-010
title: Dependency Graph (Impact Analysis)
type: feature
status: implemented
author: Arela
created: 2026-01-04
last_updated: 2026-01-04
---

# Dependency Graph (Impact Analysis)

## Problem
Refactoring usage of a shared utility (e.g. `logger`) is risky because we don't know who uses it. `grep` misses re-exports.

## Solution
Static analysis (AST-based) dependency graph that tracks imports/exports to determine precise impact radius.

## User Stories

### US-001: Impact Analysis
- **As a** Developer
- **I want to** call `arela_graph_impact` on a file
- **So that** I see what imports it (Upstream) and what it imports (Downstream).

### US-002: Graph Refresh
- **As a** Developer
- **I want to** call `arela_graph_refresh`
- **So that** the graph is rebuilt after my changes.

## Technical Specs
- **Files:** `slices/graph/ops.ts`, `slices/graph/parser.ts`
- **Logic:**
  - `dependency-cruiser` or custom AST walk.
  - Store graph in-memory (singleton) or JSON cache.
