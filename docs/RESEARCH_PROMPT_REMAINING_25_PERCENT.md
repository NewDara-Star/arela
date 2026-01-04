# Research Prompt: Implementing the Remaining 25% of the PhD Vision

**Date:** 2026-01-04  
**Project:** Arela v5  
**Objective:** Research how to implement the remaining 25% of the Natural Language Programming paradigm using our existing system.

---

## 🎯 Research Mission

You are tasked with deep research on how to complete Arela v5's implementation of the PhD-level "Natural Language Programming" framework. We have built 75% of the vision. This research will define how to build the remaining 25%.

**Current Date:** Please note the current date when researching. Use ISO 8601 format (YYYY-MM-DD). Reject any sources older than 2024 unless they are foundational computer science papers.

---

## 📋 What We Have Already (The 75%)

### 1. Core Infrastructure
| Component | File | What It Does |
|-----------|------|--------------|
| **MCP Server** | `src/mcp/server.ts` | Exposes 10 tools via Model Context Protocol |
| **Session Guard** | `src/mcp/server.ts` | Blocks all tools until `arela_context` is called |
| **VSA Architecture** | `slices/*` | Vertical Slice Architecture with 8 slices |

### 2. Context & Memory Slice
| Tool | Purpose |
|------|---------|
| `arela_context` | Reads AGENTS.md + SCRATCHPAD.md at session start |
| `arela_update` | Persists session memory (append-only default, smart merge for JSON) |
| `arela_status` | Quick health check |

**Files:** `slices/context/`, `slices/memory/`

### 3. Verification Slice
| Tool | Purpose |
|------|---------|
| `arela_verify` | Fact-checks claims with contains/regex/file_exists |

**Files:** `slices/verification/gatekeeper.ts`

### 4. Graph Analysis Slice
| Tool | Purpose |
|------|---------|
| `arela_graph_impact` | Shows upstream/downstream dependencies |
| `arela_graph_refresh` | Re-indexes codebase |

**Files:** `slices/graph/db.ts`, `slices/graph/indexer.ts`, `slices/graph/schema.ts`  
**Database:** SQLite at `.arela/graph.db`  
**Auto-Update:** Yes, via `chokidar` file watcher in `slices/graph/ops.ts`

### 5. Vector Search Slice (RAG)
| Tool | Purpose |
|------|---------|
| `arela_vector_search` | Semantic search using embeddings |
| `arela_vector_index` | Builds vector index |

**Files:** `slices/vector/ops.ts`  
**Model:** `nomic-embed-text` via Ollama  
**Storage:** `.arela/.rag-index.json`  
**Auto-Update:** Yes, via `chokidar` file watcher

### 6. Focus Slice (Compression)
| Tool | Purpose |
|------|---------|
| `arela_focus` | Summarizes long SCRATCHPAD to save context window |

**Files:** `slices/focus/ops.ts`  
**Model:** OpenAI `gpt-4o-mini`

### 7. Translate Slice (Vibecoding)
| Tool | Purpose |
|------|---------|
| `arela_translate` | Converts natural language "vibes" to structured plans |

**Files:** `slices/translate/ops.ts`  
**Model:** OpenAI `gpt-4o-mini`  
**Output:** JSON with summary, filesToCreate, filesToEdit, steps

### 8. Governance Layer
| Component | File |
|-----------|------|
| **AGENTS.md** | Project rules (10 rules including persona) |
| **SCRATCHPAD.md** | Session memory |
| **Session Guard** | `server.ts` - blocks tools until context read |
| **Pre-commit Hook** | `.git/hooks/pre-commit` - reminds to update SCRATCHPAD |
| **Doc Coverage Checker** | `scripts/check_doc_coverage.js` |
| **System Prompt Injection** | `~/.gemini/GEMINI.md` (Antigravity) |

### 9. Documentation
| Component | Location |
|-----------|----------|
| **VitePress Site** | `website/` |
| **Getting Started** | `website/guide/getting-started.md` |
| **IDE Integration** | `website/guide/ide-integration.md` |
| **Tool Reference** | `website/tools/*.md` (10 pages) |

---

## 🔴 What We're Missing (The 25%)

Based on the PhD Framework (`docs/PHD_FRAMEWORK_NATURAL_LANGUAGE_PROGRAMMING.md`) and Research Analysis (`docs/RESEARCH_ANALYSIS_2026-01-03.md`), these are the gaps:

### Gap 1: PRD.md Template & Management

**What the PhD says:**
> "Specification GENERATES the source code. The AGENTS.md and PRD.md files become the 'source code' that humans maintain. The actual code becomes an artifact generated from these specifications."

**What we need:**
- A formal `PRD.md` template in the project
- An `arela_prd` tool that parses the PRD and extracts:
  - User stories
  - Feature requirements
  - Acceptance criteria
  - Technical constraints
- Integration with `arela_translate` to generate implementation plans FROM the PRD

**Research Questions:**
1. What is the optimal format for a machine-parseable PRD? (YAML frontmatter? Structured markdown?)
2. How do existing AI coding tools handle PRD parsing? (Cursor, Copilot Workspace, Devin)
3. Should the PRD be one file or multiple (one per feature)?
4. How do we version the PRD alongside code?

---

### Gap 2: Spec-to-Test Compiler

**What the PhD says:**
> "Automatically generate Playwright tests FROM the PRD. The human doesn't read the code. They verify the behavior through tests."

**What we need:**
- A tool that reads PRD sections and generates Playwright test stubs
- Mapping between PRD user stories and test cases
- Auto-run tests on code changes

**Research Questions:**
1. What is the state of the art for spec-to-test generation in 2026?
2. Does Playwright have any built-in spec parsing or story-to-test features?
3. How do we handle the gap between high-level specs ("user can login") and concrete test steps?
4. Can we use LLMs to generate the test code from specs? What prompts work best?
5. How do we handle edge cases not specified in the PRD?

**Existing Asset to Leverage:**
- We already have `arela_translate` which converts vibes → plans
- Could we create `arela_test_generate` that converts PRD → test stubs?

---

### Gap 3: Continuous Verification Agent

**What the PhD says:**
> "Background agent runs tests after every code change, blocks if broken."

**What we need:**
- A file watcher (we already have `chokidar` for graph/vector)
- Test runner integration (Playwright, Vitest)
- Notification system when tests fail
- Optional: Block git commit if tests fail

**Research Questions:**
1. How do tools like Wallaby.js or Continuous Testing extensions work?
2. Should this be a separate service or integrated into the MCP server?
3. How do we prevent running tests on every keystroke? (Debouncing strategies)
4. What's the UX for showing test status? (IDE status bar? Toast notification?)
5. Should we integrate with existing CI/CD or replace it for local dev?

**Existing Asset to Leverage:**
- `startAutoIndexer` in `slices/vector/ops.ts` - same pattern can be used for test watcher
- `startGraphWatcher` in `slices/graph/ops.ts` - same chokidar pattern

---

### Gap 4: Intent Version Control

**What the PhD says:**
> "Git tracks code, not intent. Track changes to specification files, link code changes to spec changes."

**What we need:**
- Auto-generate commit messages that reference which PRD section changed
- Link code file changes to the PRD requirement that triggered them
- Possibly a custom git hook or wrapper

**Research Questions:**
1. How do tools like Conventional Commits or Commitizen handle structured commits?
2. Can we auto-detect which PRD section relates to which code file?
3. Should we use git notes, commit body, or a sidecar file for intent tracking?
4. How do AI-native IDEs (Cursor, Windsurf) handle commit message generation?
5. Is there academic research on "intent-based version control"?

**Existing Asset to Leverage:**
- We have pre-commit hook infrastructure
- `arela_graph_impact` knows which files are related
- Could combine: Which PRD section + which files changed → auto-commit message

---

### Gap 5: Multi-Agent Isolation

**What the PhD says:**
> "Separate concerns in multi-agent systems. Sandboxed agent contexts."

**What we need:**
- Ability to run specialized agents (e.g., "SecurityAgent", "TestAgent", "DocsAgent")
- Each agent has its own context (different AGENTS.md section? Different slices?)
- Router that directs requests to appropriate agent
- Prevention of context pollution between agents

**Research Questions:**
1. How do multi-agent frameworks like AutoGen, CrewAI, or LangGraph handle isolation?
2. What's the MCP pattern for multi-server architectures?
3. Should we have one MCP server with multiple personas, or multiple MCP servers?
4. How do we maintain a "shared memory" while keeping contexts separate?
5. What are the failure modes of multi-agent systems? (Conflicting instructions, infinite loops)

**Existing Asset to Leverage:**
- Our VSA (Vertical Slice Architecture) already separates concerns by feature
- Could each slice become a "mini-agent"?
- The `arela_translate` and `arela_verify` tools are already specialized

---

## 🔬 Research Methodology

For each gap, research the following:

### 1. State of the Art (2024-2026)
- What tools exist today that solve this problem?
- What academic papers address this?
- What are the leading AI labs (Anthropic, OpenAI, Google) saying about this?

### 2. Implementation Patterns
- How have others implemented this in open source?
- What are the common architectures?
- What are the failure modes and how to avoid them?

### 3. Fit with Arela v5
- Can we leverage existing slices/tools?
- What new files/tools need to be created?
- Does this require new dependencies?
- Estimated implementation effort (hours/days)?

### 4. MVP Definition
- What is the absolute minimum to validate the concept?
- What can we defer to v5.2+?

---

## 📚 Required Reading

Before researching, read these documents from our project:

1. **PhD Framework:** `/docs/PHD_FRAMEWORK_NATURAL_LANGUAGE_PROGRAMMING.md`
2. **Research Analysis:** `/docs/RESEARCH_ANALYSIS_2026-01-03.md`
3. **Current Architecture:** `/AGENTS.md`
4. **Session History:** `/SCRATCHPAD.md`

---

## 📤 Deliverable Format

For each of the 5 gaps, provide:

```markdown
## Gap [N]: [Name]

### Research Findings
- [Key finding 1]
- [Key finding 2]
- [Key finding 3]

### Recommended Approach
[1-2 paragraphs on the best implementation strategy]

### Implementation Spec
- **New Files:** [list]
- **Modified Files:** [list]
- **New Tools:** [list]
- **Dependencies:** [list]
- **Estimated Effort:** [hours/days]

### MVP Definition
[What's the minimum to validate this works?]

### Open Questions
[What needs further investigation?]
```

---

## 🚀 Priority Order

Research in this order (based on value vs complexity):

1. **PRD Template** - Foundation for everything else
2. **Spec-to-Test Compiler** - Enables "trust but verify"
3. **Continuous Verification** - Catches regressions
4. **Intent Version Control** - Improves traceability
5. **Multi-Agent Isolation** - Future architecture

---

## ✅ Success Criteria

This research is successful if:

1. Each gap has a clear implementation path
2. We've validated our existing features can support the new capabilities
3. We have MVPs defined that can be built in <1 day each
4. Open questions are documented for future research

---

**GO DEEP. BE EXHAUSTIVE. CHALLENGE OUR ASSUMPTIONS.**

The goal is not just to build features, but to validate that our architecture can support the full Natural Language Programming paradigm.
