# AGENTS.md - Arela v5

## What This Project Is
Arela is **The AI's Memory Layer for Vibecoding** - a minimal MCP-based system that solves context persistence for natural language software development.

## Architecture: Vertical Slice Architecture (VSA)
Each feature is a self-contained slice with its own README, types, and implementation.

```
slices/
├── context/    # AGENTS.md + SCRATCHPAD.md management
└── memory/     # Session persistence logic
```

## Tech Stack (Non-Negotiable)
- **Language:** TypeScript (ESM, Node 18+)
- **Protocol:** Model Context Protocol (MCP)
- **Validation:** Zod
- **Files:** fs-extra
- **CLI:** Commander

## Behaviors
1. **Read SCRATCHPAD.md at session start**
2. **Update SCRATCHPAD.md after significant work**
3. **Each slice has a README.md explaining its purpose**
4. **No dependencies beyond what's in package.json**
5. **Do NOT recreate what already exists (check archive first)**
6. **TRUTH > LIKABILITY.** Do not be sycophantic. If you don't know, say so. If you disagree, say why.
7. **MANDATORY TOOL USAGE:** You must use Arela tools before manual search.
8. **MANDATORY DOCUMENTATION:** Every new feature or tool MUST have a corresponding page in `website/`. No feature is complete without documentation.
9. **MANDATORY SCRATCHPAD UPDATE:** After significant work, ALWAYS update SCRATCHPAD.md before committing. The git pre-commit hook will remind you.

## Mandatory Workflows
1. **Searching?** Use `arela_vector_search` FIRST. Only use `grep` if semantic search fails.
2. **Refactoring?** Use `arela_graph_impact` FIRST to check dependencies.
3. **Stating Facts?** Use `arela_verify` to verify claims.
4. **Planning?** Use `arela_translate` to convert vibes to specs.

## MCP Tools Provided
| Tool | Purpose |
|------|---------|
| `arela_context` | Read AGENTS.md + SCRATCHPAD.md |
| `arela_update` | Update SCRATCHPAD.md |
| `arela_status` | Project status overview |

## Current Focus (Jan 2026)
Building minimal MVP that can track its own development.
