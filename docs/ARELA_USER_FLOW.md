# 🚀 Arela Complete User Flow & Architecture

**Generated:** 2025-11-15  
**Modules Analyzed:** 24  
**Files:** 143  
**Functions:** 1,023  
**Imports:** 404  

---

## 📊 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Entry                            │
│                       (src/cli.ts)                           │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├──> Setup & Initialization
               ├──> Memory Management (Hexi-Memory)
               ├──> Code Analysis & Intelligence
               ├──> Multi-Agent Orchestration
               ├──> Visual Testing (Web + Mobile)
               └──> Code Summarization (NEW v4.2.0)
```

---

## 🎯 Core Feature Flows

### 1. **Project Initialization Flow**

```
User: arela init
    ↓
src/setup/init.ts
    ↓
├─> Detect project type (startup/enterprise/solo)
├─> Create .arela/ directory structure
├─> Install git hooks (auto-indexing)
├─> Initialize memory layers
│   ├─> Session Memory (.arela/memory/session.db)
│   ├─> Project Memory (.arela/memory/project.db)
│   ├─> User Memory (~/.arela/user.db)
│   ├─> Vector Memory (.arela/.rag-index.json)
│   ├─> Graph Memory (.arela/memory/graph.db)
│   └─> Governance Memory (.arela/memory/audit.db)
└─> Generate initial config (.arela/config.json)
```

**Key Files:**
- `src/setup/init.ts` - Main initialization
- `src/setup/preset-detector.ts` - Project type detection
- `src/memory/hexi-memory.ts` - 6-layer memory orchestrator

---

### 2. **Code Indexing Flow (RAG)**

```
User: arela index
    ↓
src/rag/index.ts
    ↓
├─> Scan codebase (fast-glob)
├─> Filter files (.ragignore)
├─> Chunk files (50 lines per chunk)
├─> Generate embeddings (Ollama: nomic-embed-text)
├─> Store in vector DB (.arela/.rag-index.json)
└─> Enable semantic search (arela_search)
```

**Auto-Indexing (Git Hooks):**
```
Git commit
    ↓
.git/hooks/post-commit
    ↓
src/utils/auto-index.ts
    ↓
├─> Detect changed files
├─> Check triggers (1000+ lines, 10+ files, 1h elapsed)
├─> Incremental index (only changed files)
└─> Update .arela/.rag-index.json
```

**Key Files:**
- `src/rag/index.ts` - Main indexing logic
- `src/rag/chunker.ts` - File chunking
- `src/utils/auto-index.ts` - Incremental indexing
- `src/utils/ragignore.ts` - File filtering

---

### 3. **Graph Database Ingestion Flow**

```
User: arela ingest codebase
    ↓
src/ingest/index.ts
    ↓
├─> Scan directory (src/ingest/file-scanner.ts)
├─> Analyze files (src/ingest/static-analyzer.ts)
│   ├─> Extract functions
│   ├─> Extract imports
│   ├─> Extract API endpoints
│   └─> Extract function calls
├─> Build graph (src/ingest/graph-builder.ts)
│   ├─> Files → Nodes
│   ├─> Imports → Edges
│   ├─> Function calls → Edges
│   └─> API calls → Edges
├─> Store in SQLite (src/ingest/storage.ts)
│   └─> .arela/memory/graph.db
└─> Update metadata (last_ingest_time)
```

**Auto-Refresh (Session Start):**
```
Any CLI command
    ↓
src/cli.ts (session start)
    ↓
src/ingest/auto-refresh.ts
    ↓
├─> Check staleness (>24h old?)
├─> If stale: Background refresh
└─> Continue with command (non-blocking)
```

**Key Files:**
- `src/ingest/index.ts` - Orchestrator
- `src/ingest/static-analyzer.ts` - AST analysis
- `src/ingest/graph-builder.ts` - Graph construction
- `src/ingest/storage.ts` - SQLite operations
- `src/ingest/auto-refresh.ts` - Auto-refresh logic

---

### 4. **Code Summarization Flow (v4.2.0 NEW)**

```
User: arela summarize <file>
    ↓
src/summarization/code-summarizer.ts
    ↓
Stage 1: Extract Semantic Contract
    ↓
src/summarization/extractor/ast-extractor.ts
    ├─> Parse with tree-sitter
    ├─> Extract exports (functions, classes, types)
    ├─> Extract imports
    ├─> Extract JSDoc
    └─> Output: SemanticContract JSON
    ↓
Stage 2: Check Cache
    ↓
src/summarization/cache/semantic-cache.ts
    ├─> Compute semantic hash (src/summarization/cache/semantic-hash.ts)
    │   └─> Hash only: exports, imports, signatures (ignore comments)
    ├─> Check .arela/cache/summaries/<hash>.json
    └─> If HIT: Return cached summary
    ↓
Stage 3: Synthesize Summary (if cache miss)
    ↓
src/summarization/synthesizer/llm-synthesizer.ts
    ├─> Build prompt (src/summarization/synthesizer/prompts.ts)
    ├─> Call LLM (OpenAI → Ollama → Local fallback)
    ├─> Parse JSON response
    ├─> Validate with Zod schema
    └─> Output: TechnicalSummary
    ↓
Stage 4: Store in Cache
    ↓
src/summarization/cache/semantic-cache.ts
    ├─> Save to .arela/cache/summaries/<hash>.json
    ├─> Track hits/misses
    └─> Calculate savings
```

**Key Files:**
- `src/summarization/code-summarizer.ts` - Main orchestrator
- `src/summarization/extractor/ast-extractor.ts` - AST extraction
- `src/summarization/synthesizer/llm-synthesizer.ts` - LLM synthesis
- `src/summarization/cache/semantic-cache.ts` - Caching layer
- `src/summarization/cache/semantic-hash.ts` - Hash computation

---

### 5. **Multi-Agent Orchestration Flow**

```
User: arela orchestrate
    ↓
src/agents/orchestrate.ts
    ↓
├─> Discover agents (src/agents/discovery.ts)
│   ├─> Check API keys (OpenAI, Claude, DeepSeek)
│   ├─> Check Ollama availability
│   └─> Return available agents + costs
├─> Discover tickets (src/agents/discovery.ts)
│   ├─> Scan .arela/tickets/<agent>/
│   ├─> Parse ticket markdown
│   └─> Return pending tickets
├─> Dispatch tickets (src/agents/dispatch.ts)
│   ├─> Build prompt for agent
│   ├─> Include context (arela_search)
│   ├─> Call agent API
│   └─> Save response
└─> Report status (src/agents/status.ts)
```

**Ticket Format:**
```markdown
# AGENT-###-description.md

**Agent:** codex | claude | cascade
**Priority:** high | medium | low
**Complexity:** simple | medium | complex

## Context
Why this task exists

## Requirements
- [ ] Must have
- [ ] Should have

## Acceptance Criteria
- [ ] Test 1
- [ ] Test 2
```

**Key Files:**
- `src/agents/orchestrate.ts` - Main orchestrator
- `src/agents/discovery.ts` - Agent & ticket discovery
- `src/agents/dispatch.ts` - Ticket execution
- `src/agents/status.ts` - Status reporting

---

### 6. **Meta-RAG Context Routing Flow**

```
User Query: "How does auth work?"
    ↓
src/meta-rag/context-router.ts
    ↓
Stage 1: Classify Query
    ↓
src/meta-rag/classifier.ts
    ├─> Detect intent (code_search, architecture, debug, etc.)
    ├─> Determine complexity (simple, medium, complex)
    ├─> Select memory layers (session, project, vector, graph)
    └─> Output: Classification
    ↓
Stage 2: Route to Memory Layers
    ↓
src/memory/hexi-memory.ts
    ├─> Query Session (recent context)
    ├─> Query Project (project-specific)
    ├─> Query Vector (semantic search via arela_search)
    ├─> Query Graph (dependency analysis)
    └─> Query Governance (audit logs)
    ↓
Stage 3: Fusion & Ranking
    ↓
src/fusion/index.ts
    ├─> Deduplicate results (src/fusion/dedup.ts)
    ├─> Score relevance (src/fusion/scorer.ts)
    ├─> Merge results (src/fusion/merger.ts)
    └─> Rank by score
    ↓
Stage 4: Compression (if needed)
    ↓
src/compression/json-compressor.ts
    ├─> Remove redundant data
    ├─> Compress JSON
    └─> Fit within token budget
    ↓
Output: Ranked, compressed context
```

**Key Files:**
- `src/meta-rag/context-router.ts` - Main router
- `src/meta-rag/classifier.ts` - Query classification
- `src/memory/hexi-memory.ts` - Memory orchestrator
- `src/fusion/index.ts` - Result fusion
- `src/compression/json-compressor.ts` - Compression

---

### 7. **Visual Testing Flow (Web + Mobile)**

```
User: arela run web
    ↓
src/run/web.ts
    ↓
├─> Start Playwright
├─> Load test flows (.arela/flows/*.yml)
├─> Execute flows
│   ├─> Navigate to URL
│   ├─> Perform actions (click, type, etc.)
│   ├─> Take screenshots
│   └─> Capture console logs
├─> Analyze screenshots (src/analysis/vision.ts)
│   ├─> Moondream (Ollama) - FREE vision analysis
│   ├─> WCAG contrast checking
│   ├─> Touch target validation (44x44px)
│   ├─> Alt text verification
│   └─> Heading hierarchy
└─> Generate report
```

**Mobile Testing:**
```
User: arela run mobile
    ↓
src/run/mobile.ts
    ↓
├─> Check for simulators/emulators
├─> Fallback to web mode if not available
├─> Start Appium (if available)
├─> Execute mobile flows
└─> Generate report
```

**Key Files:**
- `src/run/web.ts` - Web testing
- `src/run/mobile.ts` - Mobile testing
- `src/analysis/vision.ts` - AI-powered screenshot analysis

---

### 8. **Vertical Slice Detection Flow**

```
User: arela detect slices
    ↓
src/detect/index.ts
    ↓
├─> Load graph (src/detect/graph-loader.ts)
├─> Run community detection
│   ├─> Louvain algorithm (src/detect/louvain.ts)
│   ├─> Infomap algorithm (src/detect/infomap.ts)
│   └─> Calculate modularity (src/detect/modularity.ts)
├─> Name slices (src/detect/slice-namer.ts)
│   ├─> Analyze file names
│   ├─> Analyze function names
│   └─> Suggest slice names
└─> Generate report (src/detect/reporter.ts)
```

**Key Files:**
- `src/detect/index.ts` - Main detector
- `src/detect/louvain.ts` - Louvain community detection
- `src/detect/infomap.ts` - Infomap algorithm
- `src/detect/slice-namer.ts` - Slice naming

---

### 9. **API Contract Analysis Flow**

```
User: arela contracts analyze
    ↓
src/contracts/index.ts
    ↓
├─> Extract API endpoints (src/contracts/endpoint-extractor.ts)
│   ├─> Express: app.get(), router.post()
│   ├─> Fastify: fastify.route()
│   └─> NestJS: @Get(), @Post()
├─> Extract API calls (src/contracts/call-extractor.ts)
│   ├─> fetch()
│   ├─> axios.get()
│   └─> http.request()
├─> Match calls to endpoints (src/contracts/matcher.ts)
├─> Detect drift (src/contracts/drift-detector.ts)
│   └─> Calls to non-existent endpoints
└─> Generate OpenAPI spec (src/contracts/openapi-generator.ts)
```

**Key Files:**
- `src/contracts/endpoint-extractor.ts` - Extract endpoints
- `src/contracts/call-extractor.ts` - Extract calls
- `src/contracts/matcher.ts` - Match calls to endpoints
- `src/contracts/drift-detector.ts` - Detect drift

---

### 10. **Architecture Analysis Flow**

```
User: arela analyze architecture
    ↓
src/analyze/architecture.ts
    ↓
├─> Calculate coupling (src/analyze/coupling.ts)
│   ├─> Afferent coupling (incoming dependencies)
│   ├─> Efferent coupling (outgoing dependencies)
│   └─> Instability = Ce / (Ca + Ce)
├─> Calculate cohesion (src/analyze/cohesion.ts)
│   ├─> LCOM (Lack of Cohesion of Methods)
│   └─> Cohesion score
├─> Detect patterns (src/analyze/patterns.ts)
│   ├─> Singleton
│   ├─> Factory
│   ├─> Observer
│   └─> Strategy
└─> Generate report (src/analyze/reporter.ts)
```

**Key Files:**
- `src/analyze/architecture.ts` - Main analyzer
- `src/analyze/coupling.ts` - Coupling metrics
- `src/analyze/cohesion.ts` - Cohesion metrics
- `src/analyze/patterns.ts` - Pattern detection

---

## 🔄 Complete User Journey

### **Scenario: New Developer Onboarding**

```
Day 1: Setup
    ↓
1. arela init
   └─> Creates .arela/, initializes memory, installs hooks

2. arela index
   └─> Builds RAG index for semantic search

3. arela ingest codebase
   └─> Builds graph DB for dependency analysis

Day 2: Understanding Codebase
    ↓
4. arela detect slices
   └─> Discovers vertical slices (features)

5. arela analyze architecture
   └─> Understands coupling/cohesion

6. arela contracts analyze
   └─> Maps API endpoints and calls

7. arela summarize src/auth/auth-service.ts
   └─> Gets high-level summary of auth logic

Day 3: Development
    ↓
8. Create ticket: .arela/tickets/codex/CODEX-###-new-feature.md

9. arela orchestrate
   └─> AI agent implements feature

10. arela run web
    └─> Visual testing of new feature

11. Git commit
    └─> Auto-index triggers, updates RAG + Graph DB

12. arela doctor
    └─> Validates project structure
```

---

## 📁 Module Breakdown

### **Core Modules (24)**

| Module | Purpose | Key Files | Lines |
|--------|---------|-----------|-------|
| **agents/** | Multi-agent orchestration | orchestrate.ts, discovery.ts, dispatch.ts | ~800 |
| **analysis/** | Vision analysis (screenshots) | vision.ts | ~300 |
| **analyze/** | Architecture analysis | coupling.ts, cohesion.ts, patterns.ts | ~1200 |
| **compression/** | Context compression | json-compressor.ts | ~200 |
| **contracts/** | API contract analysis | endpoint-extractor.ts, drift-detector.ts | ~900 |
| **detect/** | Vertical slice detection | louvain.ts, infomap.ts | ~800 |
| **flow/** | User flow analysis | tracer.ts, analyzer.ts | ~600 |
| **fusion/** | Result fusion & ranking | merger.ts, scorer.ts, dedup.ts | ~500 |
| **generate/** | Client generation | client-generator.ts, typescript-generator.ts | ~700 |
| **ingest/** | Graph DB ingestion | static-analyzer.ts, graph-builder.ts | ~1500 |
| **mcp/** | MCP server (arela_search) | server.ts | ~400 |
| **memory/** | Hexi-Memory (6 layers) | hexi-memory.ts, session.ts, project.ts | ~2000 |
| **meta-rag/** | Context routing | context-router.ts, classifier.ts | ~600 |
| **persona/** | AI persona templates | templates/ | ~500 |
| **rag/** | Vector indexing | index.ts, chunker.ts | ~800 |
| **refactor/** | Code refactoring | index.ts | ~400 |
| **run/** | Visual testing | web.ts, mobile.ts | ~1000 |
| **setup/** | Project initialization | init.ts, preset-detector.ts | ~600 |
| **summarization/** | Code summarization (NEW) | code-summarizer.ts, ast-extractor.ts | ~1200 |
| **tickets/** | Ticket management | parser.ts, auto-generate.ts | ~400 |
| **utils/** | Utilities | auto-index.ts, api-key-helper.ts | ~1500 |
| **validate/** | Contract validation | dredd-runner.ts | ~300 |
| **version/** | Version drift detection | drift-detector.ts | ~400 |
| **cli.ts** | Main CLI entry | All commands | ~1400 |

---

## 🎯 Key Statistics

- **Total Modules:** 24
- **Total Files:** 143
- **Total Functions:** 1,023
- **Total Imports:** 404
- **Total Lines:** ~18,000
- **Languages:** TypeScript (100%)
- **Memory Layers:** 6 (Session, Project, User, Vector, Graph, Governance)
- **AI Agents:** 4 (Codex, Claude, DeepSeek, Ollama)
- **Test Coverage:** 16 tests (Summarization module)

---

## 🚀 Feature Completion Status

| Feature | Status | Version |
|---------|--------|---------|
| Hexi-Memory (6 layers) | ✅ Complete | v4.0.0 |
| RAG Indexing | ✅ Complete | v4.0.0 |
| Graph DB Ingestion | ✅ Complete | v4.0.0 |
| Meta-RAG Routing | ✅ Complete | v4.0.0 |
| Multi-Agent Orchestration | ✅ Complete | v4.0.0 |
| Visual Testing (Web) | ✅ Complete | v3.2.0 |
| Visual Testing (Mobile) | ✅ Complete | v3.3.0 |
| AI Vision Analysis | ✅ Complete | v3.4.0 |
| Vertical Slice Detection | ✅ Complete | v4.0.0 |
| API Contract Analysis | ✅ Complete | v4.0.0 |
| Architecture Analysis | ✅ Complete | v4.0.0 |
| **Code Summarization** | ✅ **Complete** | **v4.2.0** |
| Auto-Refresh Graph DB | ✅ Complete | v4.2.0 |
| Learning from Feedback | ⏳ Planned | v4.2.0 |
| Multi-Hop Reasoning | ⏳ Planned | v4.2.0 |

---

## 📊 Dependency Graph (Top-Level)

```
cli.ts
├─> setup/ (init)
├─> memory/ (hexi-memory)
├─> rag/ (indexing)
├─> ingest/ (graph DB)
├─> meta-rag/ (routing)
│   ├─> memory/ (query)
│   ├─> fusion/ (merge)
│   └─> compression/ (compress)
├─> agents/ (orchestration)
│   ├─> discovery/ (find agents)
│   └─> dispatch/ (execute)
├─> summarization/ (NEW v4.2.0)
│   ├─> extractor/ (AST)
│   ├─> synthesizer/ (LLM)
│   └─> cache/ (semantic cache)
├─> run/ (visual testing)
│   └─> analysis/ (vision)
├─> detect/ (slices)
├─> analyze/ (architecture)
├─> contracts/ (API analysis)
└─> utils/ (helpers)
```

---

## 🎓 Learning Path for New Users

### **Beginner (Week 1)**
1. `arela init` - Setup project
2. `arela index` - Build search index
3. `arela doctor` - Validate setup
4. `arela summarize <file>` - Understand code

### **Intermediate (Week 2-3)**
5. `arela ingest codebase` - Build graph
6. `arela detect slices` - Find features
7. `arela analyze architecture` - Understand structure
8. `arela contracts analyze` - Map APIs

### **Advanced (Week 4+)**
9. `arela orchestrate` - Multi-agent development
10. `arela run web` - Visual testing
11. Custom tickets - AI-powered development
12. MCP integration - Semantic search in IDE

---

**Generated by:** Arela Graph DB Analysis  
**Last Updated:** 2025-11-15  
**Next Update:** After v4.2.0 release
