# MCP Tools Reference

Arela provides a suite of MCP tools that extend AI capabilities. These tools are automatically available when you connect Arela to your IDE.

### 🛡️ Session Guard & Filesystem
| Tool | Purpose |
|------|---------|
| [log_symptom](/tools/guard) | Start investigation |
| [register_hypothesis](/tools/guard) | Formalize theory |
| [confirm_hypothesis](/tools/guard) | Unlock write access |
| [edit_file](/tools/fs) | Edit code (Guarded) |
| [write_file](/tools/fs) | Create files (Guarded) |
| ... and 5 others | See [FS Docs](/tools/fs) |

### 🚀 Feature Management
| Tool | Purpose |
|------|---------|
| [arela_prd](/tools/prd) | Manage PRDs (Specs) |
| [arela_ticket_generate](/tools/ticket-generate) | Generate implementation tickets |

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
| [arela_checklist](/tools/checklist) | **Enforcement Gatekeeper** |

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

### 📊 Dashboard
| Tool | Purpose |
|------|---------|
| [arela_dashboard_export](/tools/dashboard-export) | Export dashboard data |

### 🎯 AI Enhancement
| Tool | Purpose |
|------|---------|
| [arela_focus](/tools/focus) | Compress long context |

### 🧰 CLI Helpers
| Tool | Purpose |
|------|---------|
| [arela init](/tools/init) | Create or update .mcp.json for the current repo |

### 🧪 Tests & Enforcement
| Tool | Purpose |
|------|---------|
| [arela_test_generate](/tools/test-generate) | Generate tests from PRDs |
| [arela_test_run](/tools/test-run) | Run generated tests |
| [arela_enforce](/tools/enforce) | Generate regression guards |

## Mandatory Workflows

As defined in `AGENTS.md`, AI must use certain tools before taking action:

```
1. Searching?     → arela_vector_search FIRST
2. Refactoring?   → arela_graph_impact FIRST
3. Stating Facts? → arela_verify FIRST
4. Planning?      → use arela_prd if a PRD exists
```

This governance model ensures AI behavior is grounded and verified.
