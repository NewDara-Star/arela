# Arela v3.0 - Quickstart Guide

## Installing Arela in an Existing Project

### **Step 1: Install Arela**

```bash
npm install -g arela
```

---

### **Step 2: Initialize in Your Project**

```bash
cd your-project
arela init
```

**What this does:**
- Creates `.windsurf/rules/` with CTO persona + 11 rules (startup preset)
- Creates `.arela/tickets/` directory structure
- Sets up agent-specific folders (codex, claude, ollama, etc.)

**Choose a preset:**
```bash
arela init --preset startup      # Default: Fast-moving startups (11 rules)
arela init --preset enterprise   # Full rule set (23 rules)
arela init --preset solo         # Lightweight for solo devs (9 rules)
```

---

### **Step 3: Verify Setup**

```bash
arela doctor
```

**Output:**
```
🏥 Arela Doctor

✅ Project structure is valid!
```

If there are issues:
```bash
arela doctor --fix
```

---

### **Step 4: Discover Your AI Agents**

```bash
arela agents --verbose
```

**Output:**
```
🔍 Discovering AI Agents...

Found 4 agent(s):

✅ OpenAI (Codex) - Available
   Command: codex
   Cost: $0.002/1k tokens
   Best for: simple tasks, CRUD operations, boilerplate

✅ Claude (Anthropic) - Available
   Command: claude
   Cost: $0.015/1k tokens
   Best for: complex tasks, refactoring, architecture

✅ Ollama (Local Models) - Available
   Command: ollama
   Cost: $0/1k tokens
   Best for: offline work, privacy-sensitive

✅ Windsurf (Cascade) - Available
   Command: windsurf
   Type: ide
```

---

### **Step 5: (Optional) Build RAG Index**

For semantic codebase search:

```bash
arela index
```

**Output:**
```
📚 Building RAG Index...

Scanning codebase...
Found 247 files to index

Indexing: [████████████████████] 100% (247/247) - 24.5 files/sec

✅ Indexed 247 files (1,234 chunks)
Duration: 10.1s
```

**Note:** Requires Ollama running locally.

---

### **Step 6: Start Using Arela**

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
arela init --preset startup
arela doctor
arela agents
arela index  # Optional but recommended
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
arela doctor --fix
```

---

## **Next Steps**

1. ✅ Install: `npm install -g arela`
2. ✅ Initialize: `arela init`
3. ✅ Verify: `arela doctor`
4. ✅ Discover agents: `arela agents`
5. ✅ Start building with Arela in Windsurf!

**Questions?** Check the full docs or ask Arela directly in Windsurf! 🚀
