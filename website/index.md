---
layout: home

hero:
  name: "Arela v5"
  text: "The AI's Memory Layer"
  tagline: Context persistence for Vibecoding
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/NewDara-Star/arela

features:
  - icon: 🧠
    title: Persistent Memory
    details: AI sessions remember context across conversations. No more repeating yourself.
  - icon: ✅
    title: Verified Truth
    details: Built-in fact-checking prevents hallucinations. The AI must verify before stating.
  - icon: 🕸️
    title: Code Graph
    details: Track dependencies and understand impact of changes before making them.
  - icon: 🔍
    title: Semantic Search
    details: Find code by meaning, not just keywords. "Where's the login logic?"
  - icon: 🎯
    title: Vibecoding Interface
    details: Describe what you want in natural language. Arela translates to execution plans.
  - icon: 📜
    title: Self-Governing
    details: Rules in AGENTS.md bind AI behavior. Your project, your rules.
---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/NewDara-Star/arela.git
cd arela

# Install dependencies
npm install

# Build
npm run build

# Configure your IDE
# Add to .mcp.json
```

## The 10 MCP Tools

| Tool | Purpose |
|------|---------|
| `arela_context` | Load project identity (AGENTS.md + SCRATCHPAD.md) |
| `arela_update` | Persist session memory |
| `arela_status` | Quick project health check |
| `arela_verify` | Fact-check before stating |
| `arela_graph_impact` | Analyze code dependencies |
| `arela_graph_refresh` | Re-index the codebase |
| `arela_vector_search` | Semantic code search |
| `arela_vector_index` | Build embeddings |
| `arela_focus` | Summarize long context |
| `arela_translate` | Convert vibes to plans |
