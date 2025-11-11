# Arela v3.3.0 - Quickstart Guide

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

### **Step 3: Verify Setup**

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

## **Next Steps**

1. ✅ Install: `npm install -g arela`
2. ✅ Initialize: `arela init --personality fun`
3. ✅ Verify: `arela doctor --personality fun`
4. ✅ Discover agents: `arela agents --personality fun`
5. ✅ Build index: `arela index --personality fun`
6. ✅ Start building with your AI CTO in Windsurf!

**Questions?** Check the full docs or ask Arela directly in Windsurf! 🚀
