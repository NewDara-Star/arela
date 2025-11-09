# Changelog

## 1.1.1 - 2024-11-09

### 📚 Documentation Updates

- Updated `BOOTSTRAP.readme.md` with learning system documentation
- Updated `README.md` with v1.1.0 features and learning system guide
- Added learning system commands and architecture diagrams
- Documented auto-activation, global learning, and safe updates

### No Code Changes

This is a documentation-only release.

## 1.1.0 - 2024-11-09

### 🧠 Global Learning System

**Arela now learns from your mistakes and shares knowledge across projects!**

### Added: Global Configuration (~/.arela/)

- **Learning data tracking** - Records violations across all projects
- **Pattern recognition** - Identifies recurring mistakes
- **Cross-project intelligence** - Patterns from project-1 apply to project-2
- **Safe package updates** - User data never lost on updates
- **Conflict resolution** - Interactive merge for custom rules

### New CLI Commands

```bash
# View learned patterns
npx arela patterns

# Check for package updates
npx arela check-updates

# Sync with latest version + patterns
npx arela sync

# Share patterns with team
npx arela export-patterns
npx arela import-patterns --file team-patterns.json

# List all your projects
npx arela projects
```

### How It Works

**First Project:**
```bash
cd project-1
npx arela setup
# ... work on project ...
git commit  # Violation: Missing API tests
# Saved to ~/.arela/learning-data.json
```

**Second Project (Learns!):**
```bash
cd project-2
npx arela setup

🤖 Learned Patterns Available:
- You often miss API tests (5 times in project-1)

Apply this pattern? [Y/n] y

✅ Added custom rule: Require API tests
```

### Safe Updates

**When you update the package:**
```bash
npm update @newdara/preset-cto
npx arela sync

🔔 Arela updated: 1.0.0 → 1.1.0

New base rules:
  - rules/140-new-rule.md

Your custom rules preserved:
  ✅ ~/.arela/custom-rules/ (3 rules)
  ✅ .arela/custom/ (2 rules)
```

### Data Separation

```
~/.arela/                    ← NEVER TOUCHED (user data)
├── config.json              ← Learning data
├── custom-rules/            ← Your custom rules
└── projects.json            ← Project registry

node_modules/@newdara/       ← UPDATED BY NPM
└── preset-cto/
    └── templates/           ← Base rules

.arela/                      ← MERGED (base + custom)
├── rules/                   ← From package
└── custom/                  ← Your overrides
```

### Features

- ✅ **Learns from violations** - Tracks patterns automatically
- ✅ **Cross-project sync** - Knowledge persists
- ✅ **Safe updates** - User data protected
- ✅ **Conflict resolution** - Interactive merging
- ✅ **Team sharing** - Export/import patterns
- ✅ **Version tracking** - Knows what changed
- ✅ **Custom rules** - Auto-generated from patterns

### Breaking Changes

None! Fully backward compatible.

## 1.0.0 - 2024-11-09 🎉

### 🚀 PRODUCTION READY: Auto-Activation System

**Major milestone:** Arela rules now activate automatically based on context!

Inspired by [claude-code-infrastructure-showcase](https://github.com/diet103/claude-code-infrastructure-showcase)

### Added: Auto-Activation System

- **skill-rules.json** - Configuration for automatic rule activation
  - 14 pre-configured activation rules
  - Keyword matching
  - File pattern matching
  - Context detection
  - Priority-based scoring
  
- **Hooks System** - Context-aware activation
  - `auto-activate.js` - Analyzes prompts, suggests rules
  - `file-context.js` - Suggests rules based on file type
  - `pre-commit.js` - Runs arela doctor before commits
  - < 100ms overhead
  - Production-tested patterns
  
- **AUTO-ACTIVATION.md** - Complete integration guide
  - Quick start (3 steps)
  - Configuration examples
  - Use cases (architecture, testing, security, etc.)
  - Customization guide
  - Troubleshooting
  - Performance benchmarks

### The 500-Line Rule

All rules now follow progressive disclosure:
- Main file: < 500 lines (high-level)
- Resources: < 500 lines each (deep dives)
- Faster loading, better context management

### How It Works

```
User: "How should we design authentication?"

Auto-Activate Hook:
- Detects keywords: "design", "authentication"
- Matches context: "new feature"
- Suggests:
  - rules/060-security-first.md (critical)
  - workflows/architect-spec.prompt.md (high)
  
Result: Right rules, right time, zero effort
```

### Integration

**Claude Code:**
```json
{
  "hooks": {
    "UserPromptSubmit": ".arela/hooks/auto-activate.js",
    "FileOpen": ".arela/hooks/file-context.js"
  }
}
```

**Windsurf:**
```json
{
  "arela": {
    "autoActivation": true,
    "hooksPath": ".arela/hooks"
  }
}
```

### Pre-Configured Triggers

- Architecture decisions
- Testing strategy
- Security review
- Performance optimization
- Technical debt
- Incident response
- Code review
- Prioritization
- Hiring
- Multi-agent delegation
- Async communication
- Observability
- Deployment

### Performance

- Hook execution: < 50ms
- Rule matching: < 20ms
- File analysis: < 10ms
- **Total overhead: < 100ms**

### What This Means

**Before v1.0:**
- Manual rule lookup
- Easy to forget rules
- No context awareness
- Rules sit unused

**After v1.0:**
- Automatic suggestions
- Context-aware
- Zero manual lookup
- Rules activate when needed

### Breaking Changes

None! Fully backward compatible.

### Total System

- **21 Rules** (all < 500 lines)
- **9 Workflows** (modular)
- **3 Hooks** (auto-activation)
- **1 Configuration** (skill-rules.json)

## 0.9.0 - 2024-11-09

### 🚀 Browser Automation & QA Testing

Integration with Stagehand (AI browser automation) for natural language QA testing.

### Added Rules

- **130-automated-qa.md**
  - AI-powered browser automation with Stagehand
  - Natural language test instructions
  - Test pyramid integration (smoke/feature/regression)
  - Visual regression testing
  - Performance testing (Core Web Vitals)
  - Accessibility testing (a11y)
  - Security testing (XSS, CSRF)
  - Mobile testing
  - Cost analysis (98% savings vs manual QA)

### Added Workflows

- **qa-automation.prompt.md**
  - Complete QA workflow (5 steps)
  - Test scenario library (auth, e-commerce, forms, search, mobile)
  - CI/CD integration examples
  - Bug report templates
  - Test organization best practices
  - Troubleshooting guide

### Added Documentation

- **BROWSER-AUTOMATION.md**
  - Integration guide for Stagehand + Claude Code
  - Playwright configuration
  - Example tests (smoke, feature, regression)
  - Helper functions (factories, db, stagehand)
  - Arela doctor integration
  - Cost optimization strategies
  - Monitoring & reporting

### Integration Points

- **Claude Code Plugin:** `browserbase/agent-browse`
- **Testing Framework:** Playwright + Stagehand
- **CI/CD:** GitHub Actions examples
- **Pre-commit:** Optional QA smoke tests
- **Arela Doctor:** QA coverage evaluation

### Cost Savings

**Traditional QA Team:**
- $80K/year engineer
- 80 hours/month testing
- **Cost:** $6,700/month

**Automated QA:**
- Setup: 40 hours (one-time)
- Maintenance: 4 hours/month
- API costs: $50/month
- CI/CD: $100/month
- **Cost:** $150/month

**Savings:** $6,550/month (98% reduction)

### Total Rules: 21
### Total Workflows: 9

## 0.8.0 - 2024-11-09

### 🚀 Complete CTO Operating System

Extracted from "Building the Ideal Startup CTO Persona" and "Designing a World-Class Technical Co-Founder" documents.

### Added Rules

- **025-two-way-door-decisions.md**
  - Type 1 (irreversible) vs Type 2 (reversible) decisions
  - Decision velocity framework
  - Converting Type 1 → Type 2 through architecture
  - Empowerment culture (delegate Type 2, own Type 1)
  - 95% of decisions should be Type 2

- **085-blameless-culture.md**
  - Blameless postmortem process
  - Five Whys root cause analysis
  - Psychological safety practices
  - Accountability vs blame distinction
  - System-level vs individual-level thinking
  - Postmortem template with action items

- **120-async-first-communication.md**
  - GitLab-style async-first doctrine
  - Single Source of Truth (SSoT)
  - Meeting guidelines (last resort only)
  - RFC (Request for Comments) process
  - Async standup templates
  - Communication hierarchy (written → chat → meeting)

### Added Workflows

- **ruthless-prioritization.prompt.md**
  - RICE framework (Reach × Impact × Confidence / Effort)
  - Scoring methodology for each dimension
  - Quarterly review process
  - Handling disagreements with data
  - Kill vs backlog vs build decisions
  - Example prioritization scenarios

### Total Rules: 20
### Total Workflows: 8

### Complete Coverage

✅ **Decision Making** - Two-way doors, RICE prioritization  
✅ **Culture** - Blameless postmortems, psychological safety  
✅ **Communication** - Async-first, written documentation  
✅ **Technical** - Debt, security, performance, testing  
✅ **Architecture** - Monolith-first, modular design  
✅ **Operations** - Incident response, observability  
✅ **People** - Hiring, onboarding, team building  
✅ **AI** - Multi-agent orchestration, responsible AI  

## 0.7.0 - 2024-11-09

### 🚀 Major Addition: Complete CTO Ruleset

Extracted from "Building the Ideal Startup CTO Persona" and "Designing a World-Class Technical Co-Founder"

### Added Rules

- **050-technical-debt-management.md**
  - The 20% rule (dedicate 20% to debt paydown)
  - Debt classification (deliberate/inadvertent, prudent/reckless)
  - Prioritization matrix by severity and interest rate
  - Tracking and enforcement
  - ROI calculation for debt paydown

- **060-security-first.md**
  - OWASP Top 10 coverage
  - Authentication & authorization best practices
  - Input validation and data protection
  - Security checklist for every PR
  - Incident response for vulnerabilities
  - Compliance (GDPR, SOC 2, ISO 27001)

- **110-performance-budget.md**
  - Web performance budgets (Core Web Vitals)
  - API latency budgets (P50, P95, P99)
  - Database query optimization
  - CI/CD enforcement
  - Real User Monitoring (RUM)
  - Performance regression prevention

### Added Workflows

- **incident-response.prompt.md**
  - Severity levels (P0-P3) with SLAs
  - 5-phase response (Detect, Investigate, Fix, Monitor, Resolve)
  - Incident Commander responsibilities
  - Communication templates (internal, customer, status page)
  - Post-mortem template
  - Metrics (MTTR, MTTD)

- **tech-hiring.prompt.md**
  - 5-stage interview process
  - Role definition template
  - Interview questions library (technical, system design, behavioral)
  - Evaluation rubric (technical, problem-solving, communication, culture)
  - Diversity & inclusion guidelines
  - Onboarding checklist
  - Hiring metrics

### Total Rules: 17
### Total Workflows: 7

## 0.6.0 - 2024-11-09

### 🚀 Major Feature: Multi-Agent Orchestration

- **Cascade as CTO Orchestrator** - Windsurf delegates to specialized agents
  - Codex for implementation (cheap, fast)
  - Claude for architecture (smart, complex)
  - Cascade for orchestration (review, integration)

### Added
- **Rule: 100-multi-agent-orchestration.md**
  - Agent specialization matrix
  - Task delegation guidelines
  - Cost optimization strategy (80% Codex, 15% Claude, 5% Cascade)
  - Ticket creation templates
  - Workflow examples
  
- **Workflow: delegate-agent-ticket.prompt.md**
  - Complete ticket template for agents
  - Codex ticket example (simple tasks)
  - Claude ticket example (complex tasks)
  - Clear acceptance criteria
  - Definition of done

### Cost Optimization

**Before (all Claude):**
- 100K tokens = $15

**After (multi-agent):**
- 80K via Codex = $1.60
- 15K via Claude = $2.25
- 5K via Cascade = $0 (subscription)
- **Total: $3.85** (74% savings!)

### Use Cases

- **Codex:** CRUD, boilerplate, tests, simple refactoring
- **Claude:** Architecture, complex debugging, system design
- **Cascade:** Orchestration, code review, integration, decisions

## 0.5.0 - 2024-11-09

### 🚀 Major Feature: Local RAG System

- **Full RAG implementation** - Index and search your entire codebase locally
  - Uses Ollama for embeddings (zero API costs)
  - Semantic search across all code files
  - Completely private - never leaves your machine
  
### Added
- **`npx arela serve`** - Start RAG HTTP server for AI assistants
  - Exposes `/search?q=<query>&top=5` endpoint
  - Runs on port 3456 by default
  - CORS enabled for IDE access
  - Health check endpoint at `/health`
  - Graceful shutdown handling
  
- **`npx arela index`** - Build semantic index of codebase
  - Auto-starts Ollama server if needed
  - Indexes TS/JS/Python/Go/Rust/Java/Markdown
  - Smart exclusions (node_modules, dist, etc.)
  - Custom exclude patterns support
  
- **`npx arela search <query>`** - Search codebase semantically
  - Returns top K most relevant code chunks
  - Cosine similarity scoring
  - Fast local search (< 100ms)
  
- **IDE detection in setup** - Wizard asks which IDE you're using
  - Auto-configures Windsurf/Cursor/VS Code/Claude
  - Or use `--ide windsurf` flag
  - Installs agent rules automatically
  
- **RAG module** (`src/rag/index.ts`)
  - `buildIndex()` - Index codebase with embeddings
  - `search()` - Semantic search
  - `startOllamaServer()` - Auto-start Ollama
  - `isOllamaRunning()` - Health check
  
- **RAG.md** - Complete RAG documentation
  - Setup guide
  - Usage examples
  - Cost comparison (100% savings vs OpenAI)
  - Troubleshooting
  - AI assistant integration

### Improved
- Setup wizard now builds real RAG index (not stub)
- `.arela/.rag-index.json` added to gitignore
- Better Ollama detection and model management
- Clear feedback during indexing process

### Cost Savings
- **$0.00** for embeddings (vs $0.65/month with OpenAI)
- **100% private** - no data sent to cloud
- **Unlimited searches** - no per-query costs

## 0.4.3 - 2024-11-09

### Added
- **Bundled documentation** - All guides now included in npm package
  - GETTING-STARTED.md
  - QUICKSTART.md
  - SETUP.md
  - FLOW.md
  - DEPENDENCIES.md
- **`arela docs` command** - Show documentation links
- **Documentation links** in setup completion message

### Improved
- Users can access guides offline after installation
- Clear paths to documentation in node_modules

## 0.4.2 - 2024-11-09

### Added
- **Prerequisite checks** - Setup now validates requirements before starting
  - Checks Node.js version (fails if < 18)
  - Checks Git installation (warns if missing)
  - Shows clear install instructions with links
- **DEPENDENCIES.md** - Complete dependency reference guide
- **Prerequisites section** in GETTING-STARTED.md

### Improved
- Better error messages for missing dependencies
- Fails fast with actionable instructions
- Clear guidance for non-technical users

## 0.4.1 - 2024-11-09

### Added
- **Intelligent RAG setup** - Setup wizard now handles Ollama and model installation
  - Detects if Ollama is installed
  - Checks for lightweight embedding models (nomic-embed-text, mxbai-embed-large, all-minilm)
  - Offers to install Ollama if missing (with manual download instructions)
  - Offers to pull embedding model if Ollama present but no model found
  - Automatically uses detected model for indexing
  - Graceful handling in non-interactive mode

### Improved
- RAG setup is now fully guided with smart defaults
- Clear prompts for each step of the RAG setup process
- Model size information shown before pulling (~274MB for nomic-embed-text)

## 0.4.0 - 2024-11-09

### Added
- **`arela index` command** - Stub for RAG semantic indexing (full implementation coming soon)
  - Graceful handling in setup wizard
  - Clear messaging that feature is not yet implemented
  - Prepared for future Ollama integration

### Improved
- Setup command now shows clear "coming soon" message instead of error for RAG indexing
- Better user experience for optional features

## 0.3.5 - 2024-11-09

### Added
- **`arela setup` command** - One-command interactive wizard that orchestrates entire bootstrap process
  - Detects package manager (pnpm > npm > yarn)
  - Ensures git repository (offers to init if missing)
  - Installs preset with pnpm build approval handling
  - Runs `arela init` to copy rules/workflows
  - Installs and configures Husky pre-commit hooks
  - Runs `arela harden` for CI + VSCode settings
  - Creates profile.json and evals/rubric.json if missing
  - Runs `doctor --eval` and saves baseline report
  - Updates .gitignore for .last-report.json
  - Optional RAG indexing (if Ollama present)
  - Commits all changes with single bootstrap commit

### Features
- **Fast flags** for non-interactive usage:
  - `--yes` - Accept all defaults without prompts
  - `--non-interactive` - CI mode, fail on missing deps
  - `--skip-rag` - Skip semantic index build
  - `--skip-ci` - Skip GitHub Actions workflow
  - `--skip-hooks` - Skip Husky installation
- **Idempotent** - Safe to re-run, detects existing installations
- **Shell script** alternative at `scripts/bootstrap.sh` for curl-pipe-bash usage

### Dependencies
- Added `execa@^9.0.0` for command execution
- Added `prompts@^2.4.2` for interactive prompts
- Added `@types/prompts@^2.4.9` for TypeScript support

### Documentation
- Created `SETUP.md` with comprehensive setup guide
- Updated `README.md` to feature setup command as primary method
- Added troubleshooting section and advanced usage examples

## 0.3.4 - 2024-11-09
- Husky hook improvements and postinstall handling

## 0.3.0 - 2024-11-24
- Document the mandatory guardrails (context integrity, ticket schema, review gates) directly in the preset README.
- Record the `ARELA_SKIP_POSTINSTALL=1` escape hatch so consumers can opt out of auto-initialization.
- Shipped validation harness updates (doctor `--eval`, `.arela/.last-report.json`) used to verify CI behavior.
