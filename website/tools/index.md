# MCP Tools Reference

Arela provides 10 MCP tools that extend AI capabilities. These tools are automatically available when you connect Arela to your IDE.

## Categories

### 🔍 Context & Memory
| Tool | Purpose |
|------|---------|
| [arela_context](/tools/context) | Load project identity |
| [arela_update](/tools/update) | Save session memory |
| [arela_status](/tools/status) | Quick health check |

### ✅ Verification
| Tool | Purpose |
|------|---------|
| [arela_verify](/tools/verify) | Fact-check claims |

### 🕸️ Code Analysis
| Tool | Purpose |
|------|---------|
| [arela_graph_impact](/tools/graph-impact) | Analyze dependencies |
| [arela_graph_refresh](/tools/graph-refresh) | Re-index codebase |

### 🧠 Semantic Search
| Tool | Purpose |
|------|---------|
| [arela_vector_search](/tools/vector-search) | Search by meaning |
| [arela_vector_index](/tools/vector-index) | Build embeddings |

### 🎯 AI Enhancement
| Tool | Purpose |
|------|---------|
| [arela_focus](/tools/focus) | Compress long context |
| [arela_translate](/tools/translate) | Convert vibes to plans |

## Mandatory Workflows

As defined in `AGENTS.md`, AI must use certain tools before taking action:

```
1. Searching?     → arela_vector_search FIRST
2. Refactoring?   → arela_graph_impact FIRST
3. Stating Facts? → arela_verify FIRST
4. Planning?      → arela_translate FIRST
```

This governance model ensures AI behavior is grounded and verified.
