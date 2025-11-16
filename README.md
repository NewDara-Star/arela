# Arela v4.3.0

**Your AI Technical Co-Founder**

> "From code summarization to learning from feedback - Arela uses AI to understand your codebase, learn from your corrections, and handle complex multi-step queries!"

## The Story

Arela was born from a simple frustration: being an "idea person" with no technical co-founder. Friends were busy. Learning to code from scratch would take years. But AI could understand ideas *and* implement them—if it had the right guidance.

Arela is that guidance. Not a linter. Not a framework. **A conversational CTO persona** that helps you think through products and build them to world-class standards.

## ✨ What's New in v4.3.0

### VS Code Extension Monorepo (v5.0.0 Foundation)

The repository now includes the v5.0.0 VS Code extension workspaces under `packages/`. The goal is to keep the lightweight extension sandboxed while a companion Node.js server handles native modules.

```
packages/
├─ extension/   # VS Code entry point, commands, WebView host
└─ server/      # Native helpers (SQLite, Tree-sitter, IPC)
```

**Workflow**
- `npm install` (root) – installs/hoists workspace dependencies using npm workspaces.
- `npm run build` – builds the legacy CLI plus both new packages via `tsconfig.base.json`.
- `npm run lint` / `npm run test` – run repo + workspace scripts (`--workspaces` under the hood).
- `npm run build --workspace arela-extension` – compile only the VS Code extension.
- `npm run build --workspace arela-server` – compile only the native companion server.

Both packages inherit `tsconfig.base.json` (strict mode) and share ESLint/Prettier config. Build outputs live under `packages/*/out` and remain gitignored alongside generated VSIX bundles.

### 🧠 Learning from Feedback

**Arela now learns from your corrections and continuously improves!**

Provide feedback on whether retrieved context was helpful, and Arela automatically adjusts its routing weights:

```bash
# Mark helpful queries
arela feedback --helpful

# Provide corrections
arela feedback --not-helpful --correct-layers vector,graph

# View learning progress
arela feedback:stats
```

**Example Output:**
```
📊 Learning Statistics

Helpful Rate: 80% (16/20 queries)
Accuracy Improvement: +15% (over last 20 queries)

Layer Weights:
  Vector: 1.3 (↑ 30%)
  Graph: 1.2 (↑ 20%)
  Session: 0.9 (↓ 10%)

💡 Arela is getting smarter! Keep providing feedback.
```

**How It Works:**
- Correct layers get +10% weight
- Incorrect layers get -10% weight
- Accuracy improves 10-15% over 20+ queries
- All feedback stored in Governance layer (immutable audit trail)

### 🔍 Multi-Hop Reasoning

**Handle complex queries that require multiple steps!**

Arela now breaks down complex queries into sub-queries and executes them intelligently:

```bash
arela route "How does auth flow work from login to dashboard?" --multi-hop --verbose
```

**Example Output:**
```
🔍 Decomposing query...
Sub-query 1: "What is the login endpoint?"
Sub-query 2: "How is the token generated?"
Sub-query 3: "How is the session created?"
Sub-query 4: "What is the dashboard route?"

🎯 Executing 4 hops (sequential)...
✅ Combined 11 results (deduplicated from 15)
```

**Features:**
- Automatic query decomposition (2-4 sub-queries)
- Sequential or parallel execution
- Intelligent result combination
- Optimized performance (1-2s per hop)

---

## 🎯 Core Features

### 🧠 **Intelligent Code Understanding**

#### Code Summarization (v4.2.0)
- **AST-based extraction** - Parse code structure with tree-sitter
- **LLM synthesis** - Generate summaries using OpenAI/Ollama
- **Semantic caching** - 70-80% cache hit rate, ignores comments
- **5-10x compression** - Reduce token usage dramatically
- **Auto-fallback** - OpenAI → Ollama → Local deterministic
- **Cost-effective** - ~$0.0001 per summary, <3s with LLM

```bash
arela summarize src/auth/auth-service.ts
# Main Responsibility: Handles user authentication with JWT tokens
# Public API: authenticateUser, verifyToken, refreshToken
# Dependencies: bcrypt, jsonwebtoken, database
```

#### Learning from Feedback (v4.3.0)
**Arela continuously improves by learning from your corrections:**

```bash
# Provide feedback on retrieved context
arela feedback --helpful
arela feedback --not-helpful --correct-layers vector,graph

# View learning progress
arela feedback:stats
```

**Example Output:**
```
📊 Learning Statistics

Helpful Rate: 80% (16/20 queries)
Accuracy Improvement: +15% (over last 20 queries)

Layer Weights:
  Vector: 1.3 (↑ 30%)
  Graph: 1.2 (↑ 20%)
  Session: 0.9 (↓ 10%)

Common Mistakes:
  - PROCEDURAL queries incorrectly routed to User layer (3 times)
  - FACTUAL queries missing Vector layer (2 times)

💡 Arela is getting smarter! Keep providing feedback.
```

**How It Works:**
1. Arela routes your query using current weights
2. You provide feedback on whether the context was helpful
3. Weights adjust automatically (+10% for correct, -10% for incorrect)
4. Accuracy improves over time as Arela learns your patterns
5. All feedback stored in Governance layer (immutable audit trail)

**Benefits:**
- 🎯 Better routing accuracy over time (10-15% improvement)
- 🧠 Learns your specific patterns and preferences
- 📈 Measurable improvement tracking
- 🔄 Automatic weight adjustment
- 📊 Transparent decision-making

#### Multi-Hop Reasoning (v4.3.0)
**Handle complex queries that require multiple steps:**

```bash
# Enable multi-hop for complex queries
arela route "How does auth flow work from login to dashboard?" --multi-hop --verbose
```

**Example Output:**
```
🔍 Decomposing query...
Sub-query 1: "What is the login endpoint?"
Sub-query 2: "How is the token generated after login?"
Sub-query 3: "How is the session created with the token?"
Sub-query 4: "What is the dashboard route?"

🎯 Executing 4 hops (sequential)...

Hop 1: Login Endpoint ✅ Found 3 results
Hop 2: Token Generation ✅ Found 2 results
Hop 3: Session Creation ✅ Found 4 results
Hop 4: Dashboard Route ✅ Found 2 results

✅ Combined 11 results (deduplicated from 15)
```

**Features:**
- 🔍 Automatic query decomposition (2-4 sub-queries)
- 🎯 Sequential or parallel execution
- 🧩 Intelligent result combination
- 📊 Deduplication and narrative building
- ⚡ Optimized performance (1-2s per hop)

**Use Cases:**
- Understanding complex flows (auth, payment, data processing)
- Tracing multi-step processes
- Following dependencies across modules
- Analyzing end-to-end user journeys

#### Meta-RAG Context Routing (v4.0.2)
- **OpenAI classification** - 700-1500ms, ~$0.0001 per query
- **Smart routing** - Only queries relevant memory layers
- **Query types** - Procedural, Factual, Architectural, Historical
- **Auto-fallback** - Uses Ollama if OpenAI unavailable
- **Privacy option** - 100% local classification available

### 🤖 **Multi-Agent Orchestration**

#### Agent Discovery & Management
- **4 agents supported** - Codex, Claude, DeepSeek, Ollama
- **Cost optimization** - Smart routing ($0.001-$0.015/1k tokens)
- **Ticket system** - Markdown-based task management
- **Parallel execution** - Run multiple tickets simultaneously
- **Status tracking** - Real-time progress monitoring

```bash
arela agents                    # Discover available agents
arela orchestrate --parallel    # Run all pending tickets
arela status --verbose          # Check ticket progress
```

### 🧠 **Hexi-Memory System (6 Layers)**

#### Memory Architecture
1. **Session Memory** - Current conversation context
2. **Project Memory** - Codebase-specific knowledge
3. **User Memory** - Personal preferences and patterns
4. **Vector Memory** - Semantic code search (RAG)
5. **Graph Memory** - Structural dependencies (SQLite)
6. **Governance Memory** - Audit trail and decisions

#### Capabilities
- **Cross-session persistence** - Never lose context
- **Intelligent routing** - Right memory for right query
- **Auto-refresh** - Detects staleness (>24h) and updates
- **Multi-repo support** - Analyze mobile + backend together

### 🧪 **Visual Testing & Analysis**

#### Web Testing (v3.2.0)
- **Playwright integration** - Automated browser testing
- **Flow execution** - YAML-based test scenarios
- **Screenshot capture** - Visual regression testing
- **AI analysis** - Moondream-powered UX insights

#### Mobile Testing (v3.3.0)
- **Appium integration** - iOS + Android support
- **Expo auto-detection** - Seamless React Native testing
- **Web fallback** - Works without simulators
- **Mobile viewport** - Accurate device dimensions

#### AI-Powered Analysis (v3.4.0)
- **FREE vision analysis** - Moondream via Ollama
- **WCAG compliance** - AA/AAA contrast checking
- **Touch targets** - 44x44px minimum validation
- **Accessibility scoring** - 0-100 rating

```bash
arela run web --flow signup --analyze
arela run mobile --platform ios
arela run mobile --web-fallback  # No simulator needed!
```

### 🏗️ **Architecture Analysis**

#### Vertical Slice Detection (v3.8.0)
- **Infomap algorithm** - Optimal slice boundary detection
- **Cohesion scoring** - 0-100% quality metrics
- **Multi-repo analysis** - Analyze entire system
- **Smart naming** - Pattern-based slice identification

#### Code Flow Analysis (v3.5.0)
- **Entry point discovery** - API routes, handlers, components
- **Execution tracing** - Follow code paths
- **25 standards checking** - Security, UX, Architecture, Performance
- **Refactor proposals** - Priority-ranked, effort-estimated

#### Universal Language Support (v3.7.0)
- **15+ languages** - TypeScript, Python, Go, Rust, Java, C#, etc.
- **Blazing fast** - 3,585 files in 3.91 seconds
- **Regex-based** - No AI needed, pure pattern matching
- **Graph database** - SQLite at `.arela/memory/graph.db`

```bash
arela detect slices                    # Find optimal boundaries
arela analyze flow "user-login"        # Trace execution
arela analyze architecture             # Full system analysis
arela ingest codebase                  # Build dependency graph
```

### 📝 **API Contract Management**

#### Contract Generation (v3.8.0)
- **OpenAPI 3.0** - Generate from code
- **Schema drift detection** - Frontend/backend mismatches
- **Fuzzy matching** - Levenshtein distance
- **Per-slice organization** - Vertical slice contracts

#### Client Generation (v3.9.0)
- **TypeScript clients** - Type-safe API consumption
- **Zod schemas** - Runtime validation
- **Axios-based** - Bearer token authentication
- **Batch processing** - 30 specs in <5 seconds

#### Contract Validation (v3.10.0)
- **Dredd integration** - Industry-standard validation
- **Auto-start server** - Retry logic included
- **CI/CD workflows** - GitHub Actions templates
- **Drift prevention** - Catch breaking changes early

#### API Versioning (v3.10.0)
- **Breaking change detection** - Git-aware comparison
- **Schema regression** - Field/type changes
- **Version creation** - Auto-generate v2, v3 slices
- **CI/CD integration** - Fail builds on drift

```bash
arela generate contracts /mobile /backend
arela generate client --contract openapi/api.yaml
arela validate contracts
arela version detect-drift
arela version create workout --version 2
```

### 🧪 **Test Strategy & Quality**

#### Test Analysis (v3.8.0)
- **Quality scoring** - Analyze test effectiveness
- **Mock detection** - Identify overuse
- **Testcontainers** - Recommend real dependencies
- **Coverage gaps** - Find untested code
- **Slice-aware** - Per-feature testing

```bash
arela analyze tests --dir src
# 🧪 247 tests analyzed
# 🔴 Mock overuse: 142 tests (57%)
# 💡 Recommendation: Adopt Testcontainers
```

### 🔄 **Structured Workflows**

#### Research-Driven Decisions
- **Systematic approach** - Evidence-based choices
- **Multi-source research** - ChatGPT + Gemini
- **Documented rationale** - ADR-style records
- **Implementation tracking** - From research to code

```bash
# In Windsurf Cascade
/research-driven-decision
```

---

## 🚀 Previous Releases

### v4.0.2 - OpenAI Integration

**Intelligent query classification for faster, smarter context routing!**

```bash
# Set up OpenAI (optional but recommended)
echo "OPENAI_API_KEY=sk-proj-..." >> .env

# Arela automatically uses OpenAI for classification
# Falls back to Ollama if unavailable
```

**Benefits:**
- ⚡ **Fast classification:** 700-1500ms (consistent and reliable)
- 💰 **Cheap:** ~$0.0001 per query (~$0.01 per 100 queries)
- 🎯 **Smart routing:** Only queries relevant memory layers
- 🔄 **Auto-fallback:** Uses Ollama if OpenAI unavailable
- 🔒 **Privacy option:** Use Ollama for 100% local classification

**Query types detected:**
- **PROCEDURAL:** "Continue working on auth" → Session + Project + Graph
- **FACTUAL:** "What is JWT?" → Vector search only
- **ARCHITECTURAL:** "Show dependencies" → Graph + Vector
- **USER:** "My preferred framework?" → User preferences
- **HISTORICAL:** "Why did we choose X?" → Governance + Project

---

## 🎯 Previous Releases

### v3.10.0 - Contract Validation & API Versioning

**Prevent API drift and manage breaking changes automatically!**

### 1. Contract Validation with Dredd

Automatically validate OpenAPI contracts against running API servers:

```bash
# Validate all contracts
arela validate contracts

# Validate specific contract
arela validate contracts --contract openapi/workout-api.yaml

# Custom server URL
arela validate contracts --server-url http://localhost:8080
```

**What it prevents:**
- ✅ API drift between spec and implementation
- ✅ Breaking changes shipping to production
- ✅ Undocumented endpoints
- ✅ Schema mismatches

### 2. API Versioning & Drift Detection

Detect breaking changes and manage API versions safely:

```bash
# Detect API drift
arela version detect-drift

# Create v2 of a slice
arela version create workout --version 2
```

**What it detects:**
- 🔴 Removed endpoints (CRITICAL)
- 🔴 Removed operations (CRITICAL)
- 🟠 Missing responses (HIGH)
- 🟡 Schema field/type changes (MEDIUM)

### 3. Windsurf Workflow Integration

Structured processes for common development tasks:

```
# In Windsurf Cascade
/research-driven-decision
```

Systematic approach to making evidence-based technical decisions.

---

## Previous Release: v3.9.0

### 🎨 TypeScript Client Generator

**Generate type-safe API clients from OpenAPI contracts - eliminate API drift at compile time!**

#### **TypeScript Client Generator**
Auto-generate production-ready API clients from OpenAPI 3.0 specifications:

```bash
# Generate client from single contract
arela generate client --contract openapi/workout-api.yaml

# Generate clients for all contracts
arela generate client --contract-dir openapi/ --output src/api/

# Preview without writing files
arela generate client --contract-dir openapi/ --dry-run
```

**What you get:**
- ✅ Type-safe TypeScript interfaces from schemas
- ✅ Zod schemas for runtime validation
- ✅ Axios-based HTTP clients with Bearer token auth
- ✅ 4 files per service (types, schemas, client, index)
- ✅ Production-ready code in < 5 seconds

**Example usage:**
```typescript
import { WorkoutApiClient } from './api/workout';

const client = new WorkoutApiClient({
  baseURL: 'https://api.stride.app',
  token: user.authToken
});

const workouts = await client.getWorkouts(); // Fully typed!
```

**Real-world results:**
- 30 OpenAPI specs → 120 files (2,274 lines)
- Full IDE autocomplete and type checking
- Eliminates API drift at compile time

---

## ✨ What's in v3.8.0

### 🧠 Phase 2 - Intelligence (Autonomous Analysis & Recommendations)

**Arela now autonomously detects architecture issues and provides actionable recommendations!**

#### **1. Autonomous Slice Boundary Detection**
- Louvain algorithm detects optimal vertical slice boundaries
- Cohesion scoring (0-100%) measures slice quality
- Multi-repo support for analyzing mobile + backend together
- Intelligent naming with pattern recognition

```bash
# Detect optimal slices
arela detect slices

# Output:
🔍 Detected 4 optimal vertical slices:
  1. 🔐 authentication (23 files, cohesion: 87%)
  2. 💪 workout (45 files, cohesion: 82%)
  3. 🥗 nutrition (31 files, cohesion: 79%)
  4. 👥 social (28 files, cohesion: 75%)
```

#### **2. API Contract Generator**
- Generates OpenAPI 3.0 specs from code
- Detects schema drift between frontend/backend
- Fuzzy matching with Levenshtein distance
- Per-slice contract organization

```bash
# Generate contracts
arela generate contracts /mobile /backend

# Output:
✅ Found 103 endpoints, 87 calls
❌ Schema Drift: 3 issues
📝 Generated 4 OpenAPI specs
```

#### **3. Test Strategy Optimizer**
- Analyzes test quality and coverage
- Recommends Testcontainers over mocks
- Identifies slow tests and coverage gaps
- Slice-aware testing recommendations

```bash
# Analyze tests
arela analyze tests --dir src

# Output:
🧪 247 tests analyzed
🔴 Mock overuse: 142 tests (57%)
💡 Recommendation: Adopt Testcontainers
```

---

## ✨ Previous Releases

### 🌍 Phase 1 - Foundation (v3.7.0)

**Arela now analyzes codebases in 15+ programming languages!**

#### **1. Multi-Repo Architecture Analyzer**
- Detects horizontal (layered) vs vertical (feature-sliced) architecture
- Calculates coupling/cohesion scores (0-100)
- Analyzes multiple repositories together (mobile + backend)
- Identifies critical issues and provides VSA migration recommendations
- Estimates effort, breakeven, and 3-year ROI

```bash
# Analyze single repository
arela analyze architecture

# Analyze multiple repositories together
arela analyze architecture /path/to/mobile /path/to/backend

# Export detailed report
arela analyze architecture --json report.json
```

#### **2. Universal Codebase Ingestion**
- **15+ languages supported:** TypeScript, JavaScript, Python, Go, Rust, Ruby, PHP, Java, C#, C/C++, Swift, Kotlin
- **Blazing fast:** 3,585 files in 3.91 seconds
- **Regex-based extraction:** No AI needed, pure pattern matching
- **Tracks everything:** Imports, functions, API endpoints, calls
- **Graph database:** Stores in SQLite at `.arela/memory/graph.db`

```bash
# Ingest current directory
arela ingest codebase

# Ingest specific repository
arela ingest codebase --repo /path/to/repo

# Re-ingest with refresh
arela ingest codebase --refresh
```

#### **3. Tri-Memory System**
- **Vector DB:** Semantic search (wraps existing RAG)
- **Graph DB:** Structural dependencies (from ingestion)
- **Governance Log:** Audit trail at `.arela/memory/audit.db`
- **Unified interface:** Query all three memory types

```bash
# Initialize all three memory types
arela memory init

# Semantic search
arela memory query "authentication logic"

# Dependency analysis
arela memory impact src/auth/login.ts

# Audit trail
arela memory audit --commit abc123

# Health check
arela memory status
```

### 🎯 Real-World Results

**Stride Mobile + API Analysis:**
- 3,668 total files scanned (83 TypeScript + 3,585 Python)
- 103 API endpoints detected in Python backend
- 23,502 imports mapped
- 56,957 functions identified
- Architecture: 100% Horizontal (critical issues found)
- Migration estimate: 24-28 weeks, 277% 3-year ROI

## ✨ Previous Releases

### 🔍 End-to-End Flow Analysis (v3.5.0)

### 🔍 End-to-End Flow Analysis

**Arela now UNDERSTANDS your code and tells you exactly what's wrong!**

**"I don't even know when code is messy, that's why I need a CTO"** - Now you know!

#### **Complete Code Flow Tracing**
- Discovers entry points (API routes, event handlers, components)
- Traces execution paths through your codebase
- Maps dependencies and data flows
- Identifies circular dependencies

#### **25 Standards Checking**
- 🔐 **Security** (5): Input validation, auth, secrets, SQL injection
- 🎨 **UX** (5): Loading states, error messages, accessibility
- 🏗️ **Architecture** (5): Module cohesion, dependency injection, types
- ⚡ **Performance** (5): Memoization, lazy loading, debouncing

#### **Actionable Refactor Proposals**
- Priority-ranked by impact (1-10)
- Effort estimates (hours)
- Specific implementation steps
- Grouped by file and category

### 🤖 FREE AI-Powered Quality Analysis (v3.4.0)

**Arela ANALYZES your app and tells you what's wrong - for FREE!**

#### **Vision Analysis with Moondream**
- **FREE** - Runs locally via Ollama (no API costs)
- **Private** - Screenshots never leave your machine
- **Smart** - AI understands UX and accessibility issues
- **Fast** - Lightweight 1.8B parameter model

#### **WCAG Compliance Checking**
- **Contrast Ratios** - Automatic WCAG AA/AAA validation
- **Touch Targets** - Ensures 44x44px minimum size
- **Alt Text** - Verifies screen reader compatibility
- **Heading Hierarchy** - Checks proper document structure
- **Accessibility Scores** - 0-100 rating for your app

#### **Graceful Fallbacks**
- **Works Without Ollama** - Falls back to rule-based checks
- **Clear Instructions** - Tells you how to get AI analysis
- **Never Blocks** - Always provides value

### 🚀 Usage Examples

```bash
# Analyze code flows (NEW in v3.5.0!)
arela analyze flow "user-login" --cwd /path/to/project

# Output:
📊 Quality Scores:
  security        ████████░░░░░░░░░░░░ 42/100
  ux              ██████████████░░░░░░ 68/100
  architecture    ████████████░░░░░░░░ 55/100
  performance     ████████████████░░░░ 78/100

⚠️  588 violations found
🔨 137 refactor proposals ready

# Test with AI analysis (v3.4.0)
arela run web --flow signup --analyze

❌ Critical Issues (2):
   Low contrast ratio: 2.1:1 (needs 4.5:1)
   💡 Increase text darkness or background lightness

📊 Scores:
   WCAG: 68/100
   UX: 82/100
   Accessibility: 75/100

# Mobile testing (v3.3.0)
arela run mobile --flow onboarding
arela run mobile --platform android
arela run mobile --web-fallback  # Works without simulators!
```

## The Problem

When building with AI agents:
- **Context drift** - Agents lose track as codebases grow
- **Knowledge gaps** - Both you *and* the AI miss critical practices (rate limiting, security, testing)
- **No disagreement** - Agents just say "yes" instead of challenging assumptions
- **Session breaks** - Every conversation starts from scratch

## The Vision (v3.1+)

Arela v3.1+ is a **Windsurf-native CTO persona** that:
- 💬 **Converses naturally** - Discusses ideas, disagrees when needed, asks questions
- 🧠 **Remembers context** - Uses Windsurf Memories to maintain state across sessions
- 🔍 **Searches semantically** - MCP-powered RAG to understand your codebase
- 📚 **Learns patterns** - Tracks what works (and what doesn't) across projects
- 🎯 **Has opinions** - Based on research from successful startup CTOs
- 🚀 **Sets up instantly** - Auto-installs dependencies so you can start immediately
- 🔄 **Structured workflows** - Repeatable processes for research, validation, and deployment

## Quick Start

```bash
# 1. Install
npm install -g arela@latest

# 2. Initialize your project
arela init

# 3. Build semantic index (auto-installs Ollama + models)
arela index

# 4. Ingest codebase into graph database
arela ingest codebase

# 5. NEW: Summarize a code file
arela summarize src/your-file.ts

# 6. Start MCP server for IDE integration (Windsurf/Cursor)
arela mcp

# 7. Discover available AI agents
arela agents

# 8. Run multi-agent orchestration
arela orchestrate
```

### **New in v4.2.0: Code Summarization**

```bash
# Summarize any file
arela summarize src/auth/auth-service.ts

# Force re-summarization (skip cache)
arela summarize src/auth/auth-service.ts --no-cache

# JSON output
arela summarize src/auth/auth-service.ts --output json

# Check cache stats (shown automatically)
# Cache Stats: 100% hit rate, $0.0001 saved
```

## Workflows

Arela includes structured workflows for common development processes:

### `/research-driven-decision`
Systematic approach to making evidence-based technical decisions. Generates research prompts for ChatGPT + Gemini, reviews findings, and implements with documented rationale.

**When to use:**
- Choosing between algorithms/approaches
- Evaluating new technologies
- Architectural decisions
- Performance-critical choices

**Example:** Used in CASCADE-003 to switch from Louvain to Infomap algorithm, resulting in successful slice detection.

See [docs/workflows.md](docs/workflows.md) for complete documentation.

## Current Status

✅ **Live on npm** - v3.3.0 with web + mobile testing

📦 **Archived** - v2.2.0 at `/Users/Star/arela-v2.2.0-archive`

## Research Foundation

Arela's CTO persona is built on research from:
- Pragmatic Visionary principles
- First Principles Reduction
- Two-Way Door decision framework
- Extreme Ownership philosophy
- Progressive Refinement methodology

See `/docs` for complete research papers.

---

**Philosophy**: "Both you and the AI are learning. Arela ensures you're learning toward world-class."
