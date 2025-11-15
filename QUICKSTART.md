# Arela v4.2.0 - Quickstart Guide

## ✨ What's New in v4.2.0

### 🚀 Advanced Code Summarization

**AI-powered code understanding with semantic caching for 5-10x token reduction!**

Transform large code files into concise technical summaries:

```bash
arela summarize src/auth/auth-service.ts

# Output:
# Main Responsibility: Handles user authentication with JWT tokens
# Public API: authenticateUser, verifyToken, refreshToken
# Dependencies: bcrypt, jsonwebtoken, database
# Side Effects: Writes to database, generates tokens
# Performance: ~50ms avg, 3 DB calls
```

**Key Features:**
- 🎯 **AST-based extraction** - Parse code structure with tree-sitter
- 🤖 **LLM synthesis** - Generate summaries using OpenAI/Ollama
- 💾 **Semantic caching** - 70-80% cache hit rate, ignores comments
- ⚡ **Fast** - <3s with LLM, <100ms on cache hit
- 💰 **Cost-effective** - ~$0.0001 per summary
- 🔄 **Auto-fallback** - OpenAI → Ollama → Local deterministic

### 🔄 Auto-Refresh Graph DB

**Keep your dependency graph fresh automatically!**

Arela now automatically detects when your graph database is stale (>24 hours) and refreshes it in the background on session start. No manual intervention needed!

---

## Installing Arela in an Existing Project

### **Step 1: Install Arela**

```bash
npm install -g arela
```

---

### **Step 2: Initialize in Your Project**

Choose your personality and initialize:

```bash
cd your-project
arela init --personality fun
```

**What this does:**
- Creates `.windsurf/rules/` with CTO persona + 11 rules (startup preset)
- Creates `.arela/tickets/` directory structure
- Sets up agent-specific folders (codex, claude, ollama, etc.)

**Choose a preset:**
```bash
arela init --preset startup --personality fun      # Default: Fast-moving startups (11 rules)
arela init --preset enterprise --personality fun   # Full rule set (23 rules)
arela init --preset solo --personality fun         # Lightweight for solo devs (9 rules)
```

**Choose your CLI personality:**
```bash
--personality professional    # Clean, informative output (default)
--personality fun             # 🎯 Emojis, encouraging messages
--personality dbrand          # Savage honesty, direct feedback
```

**Fun Mode Example Output:**
```
🎯 Arela v3.3.0 - Your AI CTO is here to help!
🚀 startup mode activated!
🎉 Boom! Your AI CTO is ready
📦 Unpacked:  - .windsurf/rules/
  - arela-cto.md
📚 What's next:  1. Run: arela agents
```

---

### **Step 3: Configure OpenAI (Optional but Recommended)**

For faster, smarter query classification:

```bash
# Create .env file
echo "OPENAI_API_KEY=sk-proj-your-key-here" >> .env
```

**Get your API key:** https://platform.openai.com/api-keys

**Benefits:**
- ⚡ Fast classification (700-1500ms)
- 💰 Cheap (~$0.0001 per query)
- 🎯 Smart memory routing
- 🔄 Auto-fallback to Ollama if unavailable

**Without OpenAI:**
- Uses Ollama (local, free, private)
- Slightly slower (600-2200ms)
- Still works great!

---

### **Step 4: Verify Setup**

```bash
arela doctor --personality fun
```

**Output (Fun Mode):**
```
🏥 Arela Doctor - Here to make your project awesome!

✅ Project structure is valid! Nailed it!
```

If there are issues:
```bash
arela doctor --fix --personality fun
```

---

### **Step 4: Discover Your AI Agents**

```bash
arela agents --verbose --personality fun
```

**Output (Fun Mode):**
```
🔍 Discovering your AI team...

Found 4 agent(s):

✅ OpenAI (Codex) - Ready to code!
   Command: codex
   Cost: $0.002/1k tokens
   Best for: simple tasks, CRUD operations, boilerplate

✅ Claude (Anthropic) - Your architecture guru!
   Command: claude
   Cost: $0.015/1k tokens
   Best for: complex tasks, refactoring, architecture

✅ Ollama (Local Models) - Offline hero!
   Command: ollama
   Cost: $0/1k tokens
   Best for: offline work, privacy-sensitive

✅ Windsurf (Cascade) - Your IDE buddy!
   Command: windsurf
   Type: ide
```

---

### **Step 5: Build RAG Index (Recommended)**

For semantic codebase search - **Arela handles everything automatically!**

```bash
arela index --personality fun
```

**Output (Fun Mode with Auto-Installation):**
```
📚 Building your RAG brain...
🔧 I'll automatically set up Ollama and required models if needed...

🔧 Ollama not found. Installing...
📦 Installing Ollama via Homebrew...
✅ Ollama installed successfully!

🔧 Model 'nomic-embed-text' not found. Pulling...
📦 Pulling nomic-embed-text model...
✅ Model 'nomic-embed-text' pulled successfully!

Scanning codebase...
Found 247 files to index

Indexing: [████████████████████] 100% (247/247) - 24.5 files/sec

🎉 Boom! Indexed 247 files (1,234 chunks)
Duration: 10.1s
Your codebase is now searchable by AI!
```

**What Arela does automatically:**
- ✅ Checks if Ollama is installed
- ✅ Installs Ollama if missing (macOS via Homebrew, Linux via official script)
- ✅ Starts Ollama server in background
- ✅ Pulls nomic-embed-text model if needed
- ✅ Builds your semantic search index

**No manual setup required!**

---

### **Step 6: Ingest Codebase (Recommended)**

Build the dependency graph for architecture analysis:

```bash
arela ingest codebase --personality fun
```

**Output (Fun Mode):**
```
📊 Scanning your codebase...
Found 247 files to analyze

Ingesting: [████████████████████] 100% (247/247) - 63.2 files/sec

🎉 Boom! Ingested 247 files
   - 1,234 functions
   - 567 imports
   - 89 API endpoints

Duration: 3.9s
Your codebase is now mapped!
```

**What this enables:**
- ✅ Vertical slice detection
- ✅ Dependency analysis
- ✅ Architecture scoring
- ✅ API contract generation

---

### **Step 7: Summarize Code (NEW in v4.2.0)**

Get AI-powered summaries of any code file:

```bash
arela summarize src/auth/auth-service.ts --personality fun
```

**Output (Fun Mode):**
```
📝 Summarizing src/auth/auth-service.ts...

✨ Summary:
Main Responsibility: Handles user authentication with JWT tokens
Public API: authenticateUser, verifyToken, refreshToken
Dependencies: bcrypt, jsonwebtoken, database
Side Effects: Writes to database, generates tokens
Performance: ~50ms avg, 3 DB calls

💾 Cache Stats: New summary, $0.0001 cost
⚡ Duration: 2.8s
```

**Features:**
- 🎯 AST-based extraction (tree-sitter)
- 🤖 LLM synthesis (OpenAI/Ollama)
- 💾 Semantic caching (70-80% hit rate)
- ⚡ Fast (<3s with LLM, <100ms on cache hit)
- 💰 Cost-effective (~$0.0001 per summary)

**Commands:**
```bash
# Summarize any file
arela summarize src/your-file.ts

# Force re-summarization (skip cache)
arela summarize src/your-file.ts --no-cache

# JSON output
arela summarize src/your-file.ts --output json
```

---

### **Step 8: Start Using Arela**

#### **Option A: Talk to Arela in Windsurf**

The CTO persona is now active in Windsurf! Just start chatting:

```
YOU: "Should I use Postgres or MongoDB?"

ARELA: "What's your data model? If it's relational, Postgres. 
If it's document-based, MongoDB. Don't overthink this.

*uses arela_search to check your current setup*

I see you're already using Prisma with SQL schemas. Why are 
we even having this conversation? Stick with Postgres."
```

#### **Option B: Create Tickets for Multi-Agent Work**

Create a ticket in `.arela/tickets/codex/CODEX-001.md`:

```markdown
# CODEX-001: Create Login Component

**Agent:** codex
**Priority:** high
**Complexity:** simple

## Description
Build login form with email/password validation

## Tasks
- [ ] Email input
- [ ] Password input
- [ ] Form validation
- [ ] Error handling
```

Then run:
```bash
arela orchestrate
```

---

### **Step 7: Test Your App Visually**

Run your app and let Arela test it like a real user:

```bash
# Start your dev server
npm run dev

# In another terminal, test it
arela run web

# Or test a specific flow
arela run web --flow signup
```

**Create a flow:**
```yaml
# .arela/flows/signup.yml
name: User Signup Flow
steps:
  - action: navigate
    target: /signup
  - action: click
    selector: button[data-testid="signup-button"]
  - action: type
    selector: input[name="email"]
    value: test@example.com
  - action: click
    selector: button[type="submit"]
```

**Output:**
```
🌐 Starting web app testing...
🧪 Running user flow: signup
  ✅ Navigate to /signup
  ✅ Click signup button
  ❌ Email field not visible
  
💡 Recommendations:
  1. Fix z-index on signup modal
```

---

### **Step 8: Test Your Mobile App**

Test iOS or Android apps with Appium:

```bash
# Start your Expo app
npx expo start

# In another terminal, test it
arela run mobile

# Or test Android
arela run mobile --platform android
```

**Create a mobile flow:**
```yaml
# .arela/flows/onboarding.yml
name: Mobile Onboarding Flow
steps:
  - action: click
    selector: ~get-started-button  # iOS accessibility ID
  - action: swipe
    direction: left
  - action: click
    selector: ~next-button
  - action: screenshot
    name: onboarding-complete
```

**Output:**
```
📱 Starting mobile app testing...
🍎 Launching iOS Simulator (iPhone 15 Pro)

🧪 Running user flow: onboarding
  ✅ Tap get-started button
  ✅ Swipe left
  ✅ Tap next button
  ✅ Captured screenshot
  
📊 Results:
  - 4 steps passed

📸 Screenshots saved to .arela/screenshots/mobile/
```

---

## **Complete Command Reference**

```bash
arela agents              # Discover AI agents
arela agents --verbose    # Show costs & capabilities

arela init                # Initialize (startup preset)
arela init --preset enterprise  # Full rule set
arela init --preset solo        # Lightweight

arela doctor              # Validate project structure
arela doctor --fix        # Auto-fix issues

arela orchestrate         # Run all tickets
arela orchestrate --parallel    # Run in parallel
arela orchestrate --agent codex # Run specific agent

arela status              # Show ticket status
arela status --verbose    # Detailed view

arela index               # Build RAG index
arela index --parallel    # Faster (more memory)

arela mcp                 # Start MCP server (for Windsurf)
```

---

## **What Gets Created**

```
your-project/
├── .windsurf/
│   └── rules/
│       ├── arela-cto.md              # CTO CTO persona
│       ├── 010-pragmatic-visionary.md
│       ├── 015-modular-monolith.md
│       ├── 020-context-integrity.md
│       ├── 025-two-way-door-decisions.md
│       ├── 030-ticket-format.md
│       ├── 060-security-first.md
│       ├── 070-testing-pyramid.md
│       ├── 080-observability-minimums.md
│       ├── 100-multi-agent-orchestration.md
│       └── 150-investigate-failures.md
│
└── .arela/
    ├── tickets/
    │   ├── codex/      # Simple tasks
    │   ├── claude/     # Complex tasks
    │   ├── deepseek/   # Optimization
    │   ├── ollama/     # Offline/free
    │   └── cascade/    # IDE-integrated
    │
    └── .rag-index.json # (after running arela index)
```

---

## **Typical Workflow**

### **Day 1: Setup**
```bash
cd your-project
arela init --preset startup --personality fun
arela doctor --personality fun
arela agents --personality fun
arela index --personality fun  # Auto-installs Ollama + models
```

### **Daily: Building Features**

**Talk to Arela in Windsurf:**
```
YOU: "I need to build a design system with 14 components"

ARELA: "Breaking this down:
- CLAUDE-001: System architecture ($0.060, 30min)
- CODEX-001 to CODEX-014: Components ($0.056, 20min parallel)

Total: $0.116, 30 minutes
87% cheaper than all-Claude

Should I dispatch to the team?"

YOU: "Yes"

ARELA: *creates tickets automatically*
```

**Or create tickets manually:**
```bash
# Create .arela/tickets/codex/CODEX-001.md
arela orchestrate --parallel
arela status
```

---

## **Presets Explained**

### **Startup (Default)**
**11 rules** - Fast-moving, pragmatic
- Pragmatic Visionary
- Modular Monolith
- Trunk-Based Dev
- Context Integrity
- Two-Way Door Decisions
- Ticket Format
- Security First
- Testing Pyramid
- Observability Minimums
- Multi-Agent Orchestration
- Investigate Failures

### **Enterprise**
**23 rules** - Comprehensive, quality-focused
- All startup rules +
- DORA Metrics
- Code Review Gates
- Technical Debt Management
- Blameless Culture
- ADR Discipline
- Responsible AI
- Context Engineering
- Performance Budget
- Async-First Communication
- Automated QA
- Current Context Awareness

### **Solo**
**9 rules** - Lightweight, essential
- Pragmatic Visionary
- Modular Monolith
- Context Integrity
- Two-Way Door Decisions
- Security First
- Testing Trophy (not Pyramid)
- Observability Minimums
- Multi-Agent Orchestration
- Investigate Failures

---

## **Troubleshooting**

### **"arela: command not found"**
```bash
npm install -g arela
```

### **"Ollama not running" (for indexing)**
**No longer an issue!** Arela v3.3.0+ handles this automatically:

```bash
arela index  # Will install and start Ollama if needed
```

If you prefer manual setup:
```bash
# Install Ollama: https://ollama.ai
ollama serve
```

### **"No agents discovered"**
Install at least one:
- Codex: `npm install -g @openai/codex`
- Claude: `npm install -g @anthropic-ai/claude`
- Ollama: https://ollama.ai

### **Structure issues**
```bash
arela doctor --fix --personality fun
```

---

## **CLI Personalities**

All commands support the `--personality` flag:

### **Professional (default)**
```bash
arela init --personality professional
```
Clean, informative output - standard CLI experience

### **Fun** 
```bash
arela init --personality fun
```
🎯 Emojis, encouraging messages, "Nailed it!" style

### **DBrand**
```bash
arela init --personality dbrand
```
Savage honesty, direct feedback, no-nonsense

**Example comparison:**
```
# Professional
✅ Arela initialized successfully!

# Fun
🎉 Boom! Your DBrand CTO is ready

# DBrand
✅ Done. Now go build something useful
```

---

## **NEW in v3.10.0: Quality & Governance**

### **Validate API Contracts with Dredd**

Prevent API drift by validating OpenAPI contracts against running servers:

```bash
# Validate all contracts
arela validate contracts

# Validate specific contract
arela validate contracts --contract openapi/workout-api.yaml

# Custom server URL
arela validate contracts --server-url http://localhost:8080

# Watch mode (re-validate on changes)
arela validate contracts --watch
```

**What it prevents:**
- ✅ API drift between spec and implementation
- ✅ Breaking changes shipping to production
- ✅ Undocumented endpoints
- ✅ Schema mismatches

**Example output:**
```
🔍 Validating contracts...

✅ openapi/workout-api.yaml
   GET /api/workouts - PASS
   POST /api/workouts - PASS
   GET /api/workouts/:id - PASS

❌ openapi/user-api.yaml
   POST /api/users - FAIL
   Expected: { name, email, password }
   Got: { name, email }
   Missing required field: password

💡 Fix the implementation or update the contract
```

### **Detect API Drift & Manage Versions**

Catch breaking changes before they reach production:

```bash
# Detect drift in all contracts
arela version detect-drift

# Detect drift in specific contract
arela version detect-drift --contract openapi/workout-api.yaml

# Create v2 of a slice when breaking changes needed
arela version create workout --version 2
```

**What it detects:**
- 🔴 Removed endpoints (CRITICAL)
- 🔴 Removed operations (CRITICAL)
- 🟠 Missing responses (HIGH)
- 🟡 Schema field changes (MEDIUM)
- 🟡 Type changes (MEDIUM)

**Example output:**
```
🚨 Breaking changes detected!

openapi/workout-api.yaml:
  🔴 CRITICAL: Removed endpoint DELETE /api/workouts/:id
  🟠 HIGH: Missing 404 response for GET /api/workouts/:id
  🟡 MEDIUM: Field 'duration' changed from number to string

💡 Create v2: arela version create workout --version 2
```

### **Use Workflows in Windsurf**

Structured processes for common development tasks:

```
# In Windsurf Cascade
/research-driven-decision
```

**What it does:**
1. Identifies decision points
2. Generates structured research prompts
3. Guides you through ChatGPT + Gemini research
4. Reviews findings together
5. Implements with documented rationale
6. Creates memory of the decision

**Example use case:**
- Choosing between algorithms (Louvain vs Infomap)
- Evaluating new technologies
- Architectural decisions
- Performance-critical choices

---

## **Previous Release: v3.9.0 - Contract-Driven Development**

### **Generate Type-Safe API Clients**

Automatically generate TypeScript clients from OpenAPI contracts:

```bash
# Generate client from single contract
arela generate client --contract openapi/workout-api.yaml

# Generate clients for all contracts
arela generate client --contract-dir openapi/ --output src/api/

# Preview without writing files
arela generate client --contract-dir openapi/ --dry-run

# Custom base URL
arela generate client --contract openapi/api.yaml --base-url https://api.stride.app
```

**What you get:**
- Type-safe TypeScript interfaces
- Zod schemas for runtime validation
- Axios-based HTTP clients
- Bearer token authentication
- 4 files per service (types, schemas, client, index)

**Example usage:**
```typescript
import { WorkoutApiClient } from './api/workout';

const client = new WorkoutApiClient({
  baseURL: 'https://api.stride.app',
  token: user.authToken
});

const workouts = await client.getWorkouts(); // Fully typed!
```

**Performance:**
- 30 specs → 120 files in < 5 seconds
- Production-ready TypeScript
- Full IDE autocomplete

---

## **NEW in v3.8.0: Autonomous Intelligence**

### **Detect Optimal Vertical Slices**

Arela now autonomously detects where your vertical slices should be:

```bash
# Detect slices in current repo
arela detect slices

# Multi-repo detection
arela detect slices /path/to/mobile /path/to/backend

# Filter by quality
arela detect slices --min-cohesion 75

# Export results
arela detect slices --json slices.json
```

**What you get:**
- Louvain algorithm clustering
- Cohesion scores (0-100%)
- Intelligent slice naming
- Actionable recommendations

### **Generate API Contracts**

Automatically generate OpenAPI specs and detect schema drift:

```bash
# Generate contracts
arela generate contracts

# Multi-repo (frontend + backend)
arela generate contracts /path/to/mobile /path/to/backend

# Different formats
arela generate contracts --format json
arela generate contracts --format yaml

# Only show drift issues
arela generate contracts --drift-only
```

**What you get:**
- OpenAPI 3.0 specifications
- Schema drift detection
- Frontend/backend matching
- Per-slice organization

### **Optimize Test Strategy**

Analyze test quality and get recommendations:

```bash
# Analyze tests
arela analyze tests

# Specific directory
arela analyze tests --dir src

# Export report
arela analyze tests --json test-report.json

# Verbose output
arela analyze tests --verbose
```

**What you get:**
- Mock overuse detection
- API coverage analysis
- Testcontainers recommendations
- Slice-aware testing guidance

---

## **NEW in v3.7.0: Language-Agnostic Architecture Analysis**

### **Analyze ANY Codebase in ANY Language**

Arela now supports 15+ programming languages for architecture analysis:

```bash
# Analyze single repository
arela ingest codebase
arela analyze architecture

# Analyze multiple repositories (e.g., mobile + backend)
arela ingest codebase --repo /path/to/mobile
arela ingest codebase --repo /path/to/backend
arela analyze architecture /path/to/mobile /path/to/backend

# Export detailed report
arela analyze architecture --json report.json
```

**Supported Languages:**
- TypeScript, JavaScript, Python, Go, Rust
- Ruby, PHP, Java, C#, C/C++
- Swift, Kotlin, and more!

**What you get:**
- Architecture type detection (Horizontal vs Vertical)
- Coupling/cohesion scores (0-100)
- Critical issues identified
- VSA migration recommendations
- ROI estimates (effort, breakeven, 3-year ROI)

### **Tri-Memory System**

Three types of persistent memory for AI agents:

```bash
# Initialize all three memory types
arela memory init

# Semantic search (Vector DB)
arela memory query "authentication logic"

# Dependency analysis (Graph DB)
arela memory impact src/auth/login.ts

# Audit trail (Governance Log)
arela memory audit --commit abc123

# Health check
arela memory status
```

---

## **NEW in v3.6.0: AI Flow Generator**

### **Generate Test Flows with AI**

Let AI read your code and generate comprehensive test flows:

```bash
# Generate flows for a specific goal
arela generate flows --goal "test signup process"

# Specify which files to analyze
arela generate flows --goal "test checkout" --files src/checkout.tsx,src/cart.tsx

# Use different AI model
arela generate flows --goal "test login" --model codex  # Faster
arela generate flows --goal "test login" --model claude # Better quality (default)
```

**What it generates:**
- **Happy path** - Everything works perfectly
- **Validation errors** - Form validation, error handling
- **Edge cases** - Unusual but valid scenarios

**Then run the generated flows:**
```bash
arela run web --flow happy-path-signup --analyze
```

### **Fixed: Ticket Orchestration**

Ticket orchestration now works properly! Create tickets and let AI implement them:

```bash
# Create a ticket in .arela/tickets/claude/YOUR-TICKET.md
# Then run:
arela orchestrate --tickets YOUR-TICKET

# Check the results:
cat logs/claude/YOUR-TICKET-response.txt
```

---

## **Next Steps**

1. ✅ Install: `npm install -g arela`
2. ✅ Initialize: `arela init --personality fun`
3. ✅ Verify: `arela doctor --personality fun`
4. ✅ Discover agents: `arela agents --personality fun`
5. ✅ Build index: `arela index --personality fun`
6. ✅ Start building with your AI CTO in Windsurf!

**Questions?** Check the full docs or ask Arela directly in Windsurf! 🚀
