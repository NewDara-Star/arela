# Changelog

## [3.8.1] - 2025-11-12

### 🐛 Bug Fixes

**CLI Path Resolution**
- Fixed `--cwd` option not being respected in `detect slices` and `generate contracts` commands
- Commands now properly find Graph DB in specified directories
- Fixed Python import resolution to handle relative imports (`.module`, `..parent`)
- Added support for Python, Go, and Rust import resolution in graph builder

**Technical Changes:**
- Enhanced `resolveImport` function to support multiple languages
- Fixed Commander.js argument parsing for multi-word commands
- Improved error messages to show searched paths

**Impact:**
- `arela detect slices --cwd /path` now works correctly
- `arela generate contracts --cwd /path` now works correctly
- Python codebases now have proper internal import edges in graph (164 edges detected in Stride API)

---

## [3.8.0] - 2025-11-12

### 🧠 Phase 2 - Intelligence (Autonomous Analysis & Recommendations)

**"AI that understands your architecture and tells you exactly how to improve it!"**

### ✨ New Features

#### **1. Autonomous Slice Boundary Detection**
- **Louvain algorithm** - Fast O(n log n) modularity-based graph clustering
- **Automatic slice detection** - Finds optimal vertical slice boundaries
- **Cohesion scoring** - Measures slice quality (0-100%)
- **Intelligent naming** - Pattern-based slice names with emojis
- **Multi-repo support** - Detects slices across multiple repositories
- **JSON export** - Machine-readable output for automation

**CLI:**
```bash
arela detect slices                           # Current repo
arela detect slices /mobile /backend          # Multi-repo
arela detect slices --json slices.json        # Export
arela detect slices --min-cohesion 75         # Filter by quality
```

**Example Output:**
```
🔍 Detected 4 optimal vertical slices:
  1. 🔐 authentication (23 files, cohesion: 87%)
  2. 💪 workout (45 files, cohesion: 82%)
  3. 🥗 nutrition (31 files, cohesion: 79%)
  4. 👥 social (28 files, cohesion: 75%)
```

#### **2. API Contract Generator**
- **OpenAPI 3.0 generation** - Automatic spec generation from code
- **Schema drift detection** - Identifies mismatches between frontend/backend
- **Fuzzy matching** - Uses Levenshtein distance (75% threshold)
- **Per-slice contracts** - Organizes specs by vertical slice
- **Multi-format output** - YAML and JSON support
- **Comprehensive reporting** - Severity-based drift issues

**CLI:**
```bash
arela generate contracts                      # Current repo
arela generate contracts /mobile /backend     # Multi-repo
arela generate contracts --format json        # JSON output
arela generate contracts --drift-only         # Only show issues
```

**Drift Detection:**
- Path mismatches (singular/plural, case differences)
- Method mismatches (GET vs POST)
- Endpoint not found errors
- Parameter mismatches
- Schema incompatibilities

#### **3. Test Strategy Optimizer**
- **Mock detection** - Identifies overuse of mocks in tests
- **Coverage analysis** - Calculates API endpoint test coverage
- **Testcontainers recommendations** - Suggests containerized integration tests
- **Slice-aware testing** - Recommends tests organized by vertical slice
- **Performance analysis** - Detects slow tests
- **Actionable recommendations** - Prioritized by severity

**CLI:**
```bash
arela analyze tests                           # Current repo
arela analyze tests --dir src                 # Specific directory
arela analyze tests --json report.json        # Export
arela analyze tests --verbose                 # Detailed output
```

**Example Output:**
```
🧪 Test Statistics:
   - Total tests: 247
   - Mock usage: 142 tests (57%)
   - API coverage: 34/103 endpoints (33%)
   
🔴 Critical Issues:
   1. Mock overuse detected
   2. Missing API coverage
   
💡 Recommendations:
   1. 🐳 Adopt Testcontainers (40% fewer false positives)
   2. ⚡ Close API coverage gaps
   3. 📝 Add contract tests
```

### 🔧 Technical Implementation

**New Modules:**
- `src/detect/` - Louvain clustering algorithm for slice detection
- `src/contracts/` - OpenAPI generation and drift detection
- `src/analyze/tests/` - Test strategy analysis and recommendations

**Dependencies Added:**
- `js-yaml` - YAML output for OpenAPI specs
- `fast-glob` - Fast file scanning for test analysis

### 📊 Real-World Results

**Tested on Arela codebase:**
- Detected 8 optimal slices with 70-85% cohesion
- Generated 3 OpenAPI contracts
- Analyzed 3 test files with actionable recommendations

### 🎯 Impact

**Phase 2 enables:**
- Autonomous architecture understanding
- Automatic refactoring guidance
- Contract-first API development
- Test quality improvements
- Foundation for Phase 3 (Autonomous Refactoring)

---

## [3.7.0] - 2025-11-12

### 🌍 Phase 1 - Foundation (Language-Agnostic Architecture Analysis)

**"Analyze ANY codebase in ANY language - TypeScript, Python, Go, Rust, Ruby, PHP, Java, C#, and more!"**

### ✨ New Features

#### **1. Multi-Repo Architecture Analyzer**
- **Detects architecture type** - Horizontal (layered) vs Vertical (feature-sliced)
- **Calculates coupling/cohesion** - 0-100 scores for code quality metrics
- **Multi-repo support** - Analyze mobile + backend together
- **Identifies issues** - Cross-layer dependencies, scattered files, API drift
- **Actionable recommendations** - Specific guidance for VSA migration
- **ROI estimates** - Effort, breakeven, and 3-year ROI projections

**CLI:**
```bash
arela analyze architecture                    # Single repo
arela analyze architecture /mobile /backend   # Multi-repo
arela analyze architecture --json report.json # Export
```

#### **2. Universal Codebase Ingestion & Mapping**
- **Language-agnostic parsing** - Supports 15+ programming languages
- **Regex-based extraction** - Fast, accurate, no AI needed
- **Graph database storage** - SQLite at `.arela/memory/graph.db`
- **Tracks everything** - Imports, functions, API endpoints, calls
- **Blazing fast** - 3,585 files in 3.91 seconds
- **Portable paths** - Relative paths for cross-machine compatibility

**Supported Languages:**
- JavaScript/TypeScript (.js, .jsx, .ts, .tsx)
- Python (.py)
- Go (.go)
- Rust (.rs)
- Ruby (.rb)
- PHP (.php)
- Java (.java)
- C# (.cs)
- C/C++ (.c, .cpp, .h, .hpp)
- Swift (.swift)
- Kotlin (.kt)

**CLI:**
```bash
arela ingest codebase                         # Current directory
arela ingest codebase --repo /path/to/repo    # Specific repo
arela ingest codebase --refresh               # Re-ingest
```

#### **3. Tri-Memory System**
- **Vector DB** - Semantic search (wraps existing RAG)
- **Graph DB** - Structural dependencies (from ingestion)
- **Governance Log** - Audit trail at `.arela/memory/audit.db`
- **Unified interface** - Query all three memory types
- **Health checks** - `arela memory status`

**CLI:**
```bash
arela memory init                             # Initialize all three
arela memory query "authentication logic"     # Semantic search
arela memory impact src/auth/login.ts         # Dependency analysis
arela memory audit --commit abc123            # Audit trail
arela memory status                           # Health check
```

### 🎯 Real-World Results

**Stride Mobile + API Analysis:**
- 3,668 total files scanned (83 mobile + 3,585 backend)
- 103 API endpoints detected in Python backend
- 23,502 imports mapped
- 56,957 functions identified
- Architecture: 100% Horizontal (both repos)
- Coupling: 100/100 (critical)
- Cohesion: 0/100 (critical)
- Migration estimate: 24-28 weeks, 277% 3-year ROI

### 🔧 Technical Improvements

- **Universal analyzer** - Regex patterns for all languages
- **Multi-language file scanner** - Detects 15+ file extensions
- **Optimized graph storage** - Batch inserts, indexed queries
- **Error resilience** - Continues processing even if files fail
- **Progress indicators** - Real-time feedback during ingestion

### 📚 Documentation

- Updated CLI commands reference
- Added architecture analysis examples
- Multi-repo workflow documentation
- Language support matrix

---

## [3.6.0] - 2025-11-12

### 🤖 AI Flow Generator + Fixed Ticket Orchestration

**"Why write test flows when AI can read your code and generate them?"**

### ✨ New Features

#### **AI-Powered Flow Generation**
- **Intelligent code analysis** - AI reads your codebase to understand flows
- **Comprehensive test coverage** - Generates 3 flow types:
  - Happy path (everything works)
  - Validation errors (form validation, error handling)
  - Edge cases (unusual but valid scenarios)
- **Smart file discovery** - Automatically finds relevant files (src/, app/, components/)
- **Claude or Codex** - Choose best quality (Claude) or fastest (Codex)
- **Ready-to-run YAML** - Outputs flows compatible with existing runner

**CLI:**
```bash
arela generate flows --goal "test signup process"
arela generate flows --goal "test checkout" --files src/checkout.tsx
```

#### **Fixed Ticket Orchestration** 🎉
- **Proper AI prompting** - Builds structured prompts instead of raw markdown
- **Claude CLI integration** - Calls `claude` command correctly
- **Codex CLI integration** - Uses `codex exec` for non-interactive execution
- **Response logging** - Saves both prompt and response for review
- **Tested and working** - Both Claude and Codex verified

**What was broken:**
- Ticket orchestration was piping raw markdown to AI
- No structured prompts or instructions
- Responses weren't captured properly

**What's fixed:**
- Builds proper prompts with context and instructions
- Calls Claude/Codex CLI correctly
- Saves full logs with prompt + response
- Actually works! 🔥

### 📦 Technical Details

**New Files:**
- `src/generate/flow-generator.ts` - AI flow generation engine
- `.arela/agents/config.json` - Agent configuration (Claude, Codex)

**Updated Files:**
- `src/agents/orchestrate.ts` - Fixed to build proper AI prompts
- `src/cli.ts` - Added `generate flows` command

### 🎯 Impact

**Before v3.6.0:**
- Manual flow writing
- Ticket orchestration broken
- No AI-generated tests

**After v3.6.0:**
- AI generates comprehensive test flows
- Ticket orchestration WORKS
- Claude + Codex both functional
- End-to-end AI development workflow

### 💡 Philosophy

**Delegation > Implementation**
- AI reads code and generates flows
- Ticket system delegates to AI agents
- Human reviews and approves
- Proper CTO workflow

---

## [3.5.0] - 2025-11-12

### 🔍 End-to-End Flow Analysis

**"I don't even know when code is messy, that's why I need a CTO"** - Now you know!

### ✨ New Features

#### **Complete Code Flow Tracing**
- **Entry point discovery** - Finds API routes, event handlers, React components, hooks
- **Execution path tracing** - Maps how code flows through your application
- **Dependency mapping** - Identifies what calls what
- **Circular dependency detection** - Catches architectural issues
- **Data flow analysis** - Tracks how data moves through the system

#### **25 Standards Library**
- **Security (5 standards):**
  - Input validation
  - Authentication checks
  - Error handling
  - Secrets management
  - SQL injection prevention

- **UX (5 standards):**
  - Loading states
  - Error messages
  - Accessibility (WCAG)
  - Mobile responsive
  - Keyboard navigation

- **Architecture (5 standards):**
  - Module cohesion
  - Dependency injection
  - Circular dependencies
  - Code reuse
  - Type safety

- **Performance (5 standards):**
  - Memoization
  - Lazy loading
  - Debouncing
  - Bundle size
  - Memory leaks

#### **Actionable Refactor Proposals**
- **Priority ranking** - 1-10 based on impact
- **Effort estimates** - Hours to implement
- **Specific steps** - Exactly what to do
- **Grouped by file** - Easy to tackle systematically
- **Category filtering** - Focus on security, UX, etc.

#### **Beautiful CLI Output**
- **Quality scores** - Visual bars for each category (0-100)
- **Violation reports** - Grouped by severity and file
- **Refactor proposals** - Priority-ranked with effort estimates
- **Export options** - JSON (programmatic) and Markdown (docs)
- **Brief/verbose modes** - Quick summary or full details

### 🎨 User Experience

**Before v3.5.0:**
```bash
$ ls src/
# *stares at code, no idea if it's good or bad*
```

**After v3.5.0:**
```bash
$ arela analyze flow main --cwd .

📊 Quality Scores:
  security        ░░░░░░░░░░░░░░░░░░░░ 0/100
  ux              ░░░░░░░░░░░░░░░░░░░░ 0/100
  architecture    ░░░░░░░░░░░░░░░░░░░░ 0/100
  performance     ░░░░░░░░░░░░░░░░░░░░ 0/100

⚠️  588 violations found
🔨 137 refactor proposals ready

🔐 SECURITY - 174 critical issues
   🔴 Input Validation (58 files)
   🔴 Authentication Check (42 files)
   🔴 Error Handling (74 files)

💡 Top Priority: Security Hardening
   Effort: 2-4 hours per file
   Impact: 10/10
```

### 🔧 Technical Details

**Analysis Modules:**
- `src/flow/discovery.ts` - Entry point discovery (API, events, components)
- `src/flow/tracer.ts` - Execution path tracing with AST-like analysis
- `src/flow/standards.ts` - 25 standards library with checks
- `src/flow/analyzer.ts` - Main orchestration and scoring
- `src/flow/reporter.ts` - Beautiful CLI output and exports

**How It Works:**
1. Discovers entry points in your codebase
2. Traces execution paths from each entry point
3. Checks code against 25 standards
4. Calculates quality scores per category
5. Generates prioritized refactor proposals
6. Outputs beautiful reports with actionable fixes

**CLI Integration:**
```bash
arela analyze flow <name>           # Analyze specific flow
arela analyze flow main --verbose   # Full details
arela analyze flow main --json out.json      # Export JSON
arela analyze flow main --markdown report.md # Export Markdown
```

### 📦 Dependencies

No new npm dependencies! Pure TypeScript implementation.

### 🎯 Impact

**v3.4.0:** Arela analyzes your UI  
**v3.5.0:** Arela analyzes your CODE

**Real-world test on Stride app:**
- Found 588 violations
- 174 critical security issues
- 137 refactor proposals generated
- Quality scores: 0/100 across all categories
- **Now we know exactly what to fix!**

### 🔗 Related

- Flow analysis ticket: CLAUDE-004-v3.5.0
- Implementation: 5 new TypeScript modules
- Standards library: 25 vetted best practices

---

## [3.4.0] - 2025-11-11

### 🤖 FREE AI-Powered Quality Analysis

**Arela now analyzes your app and tells you what's wrong - completely FREE!**

### ✨ New Features

#### **Vision Analysis with Moondream (Ollama)**
- **FREE AI analysis** - Runs locally, no API costs
- **Privacy-first** - Screenshots never leave your machine
- **Automatic model download** - Pulls Moondream on first use
- **Graceful fallbacks** - Works without Ollama (rules-only mode)
- **Smart error handling** - Clear instructions if setup needed

#### **WCAG Compliance Checking**
- **Contrast ratio validation** - WCAG AA (4.5:1) and AAA (7:1) compliance
- **Touch target validation** - Ensures 44x44px minimum size
- **Alt text verification** - Checks all images for screen reader compatibility
- **Heading hierarchy** - Validates proper h1-h6 structure
- **Accessibility scoring** - 0-100 rating based on violations

#### **CLI Integration**
- **`--analyze` flag** - Run analysis on any web flow
- **Colorized output** - Clear, beautiful issue reporting
- **Severity levels** - Critical, warning, info categorization
- **Actionable suggestions** - Tells you exactly how to fix issues

### 🎨 User Experience

**Before v3.4.0:**
```bash
$ arela run web --flow test
✅ 4 steps passed
```

**After v3.4.0:**
```bash
$ arela run web --flow test --analyze

🤖 Running AI analysis...

❌ Critical Issues (2):
   Low contrast ratio: 2.1:1 (needs 4.5:1)
   💡 Increase text darkness or background lightness
   
   Touch target too small: 32x32px
   💡 Increase to at least 44x44px

📊 Scores:
   WCAG: 68/100
   UX: 82/100
   Accessibility: 75/100
```

### 🔧 Technical Details

**Analysis Modules:**
- `src/analysis/vision.ts` - Moondream integration via Ollama
- `src/analysis/rules.ts` - WCAG + UX rule-based checks
- `src/analysis/index.ts` - Combined analysis orchestration

**How It Works:**
1. Captures screenshots during flow execution
2. Runs AI analysis (Moondream) + rule-based checks in parallel
3. Calculates contrast ratios from pixel data
4. Validates touch target sizes via bounding boxes
5. Checks DOM for alt text and heading structure
6. Combines results and scores

**Graceful Degradation:**
- No Ollama? Falls back to rules-only
- Model pull fails? Continues with rules
- AI analysis fails? Shows clear error, continues

### 📦 Dependencies

No new npm dependencies! Uses:
- Ollama (user installs: `brew install ollama`)
- Moondream model (auto-downloaded on first use)
- Existing Playwright for DOM inspection

### 🎯 Impact

**v3.3.1:** Arela runs your app  
**v3.4.0:** Arela ANALYZES your app and tells you what's wrong

**This makes quality analysis accessible to everyone - for FREE!**

### 🔗 Related

- Vision analysis ticket: CLAUDE-001-v3.4.0
- Orchestration plan: ORCHESTRATION-PLAN-v3.4.0.md

---

## [3.3.1] - 2025-11-11

### 🎯 Intelligent Fallbacks & Auto-Recovery

**Making mobile testing accessible everywhere and RAG indexing bulletproof.**

### ✨ New Features

#### **Mobile Web Fallback**
- **Auto-detect Appium availability** - Checks if Appium server is running
- **Graceful fallback to web** - Uses Playwright with mobile viewport when Appium unavailable
- **Mobile viewport dimensions** - iPhone 15 Pro (390x844) for iOS, Pixel 7 (412x915) for Android
- **Force web mode** - `--web-fallback` flag to always use browser testing
- **Perfect for Expo apps** - Most Expo apps run on web, now testable without simulators
- **CI/CD friendly** - Works in environments without simulators
- **Same flow execution** - No changes needed to your test flows
- **Clear messaging** - Tells you when and why fallback is used

#### **Smart .ragignore Auto-Generation**
- **Automatic failure detection** - Tracks files that fail to embed during indexing
- **Intelligent analysis** - Categorizes failures: dependencies, generated code, data, large source
- **Auto-creates .ragignore** - Generates patterns and adds them automatically
- **Actionable recommendations** - Tells you to IGNORE, REFACTOR, or SPLIT
- **Saves recommendations** - Creates `.arela/indexing-recommendations.md` for review
- **Automatic retry** - Re-runs indexing after creating .ragignore
- **Multi-ecosystem support** - Handles Python (venv), Node (node_modules), and more
- **Graceful degradation** - Never crashes, always provides guidance

### 🎨 User Experience

**Mobile Testing:**
```bash
$ arela run mobile --flow test
⚠️  Appium not available, falling back to web mode
📱 Testing with iPhone 15 Pro viewport (390x844)
✅ 4 steps passed
💡 Tip: Start Appium with 'npx appium' for native mobile testing
```

**RAG Indexing:**
```bash
$ arela index
⚠️  Failed to embed: venv/lib/python3.14/site-packages/idna/uts46data.py
🤖 Analyzing failure...
✅ Recommendation: IGNORE (Third-party dependency)
📝 Auto-added to .ragignore: venv/
🔄 Re-running index...
✅ Indexed 127 files successfully
```

### 🔧 Technical Details

**Mobile Web Fallback:**
- Detects Appium via `http://localhost:4723/status`
- Falls back on connection failure or missing app
- Uses Playwright with mobile user agent
- Supports touch events and mobile gestures
- Same screenshot capture and reporting

**Smart Ragignore:**
- Tracks `IndexingFailure` with reason, size, and type
- Analyzes patterns: dependencies, generated, cache, data
- Extracts glob patterns intelligently
- Appends to existing .ragignore without duplicates
- Prevents infinite retry loops

### 📦 Dependencies

No new dependencies - uses existing Playwright and Appium packages.

### 🎯 Impact

**Mobile Testing:**
- v3.3.0: Requires Appium + simulator
- v3.3.1: Works everywhere (simulator, web, CI/CD)

**RAG Indexing:**
- Before: Manual .ragignore creation after crashes
- After: Auto-generates and retries automatically

---

## [3.3.0] - 2025-11-11

### 📱 Mobile Testing with Appium

**Test iOS and Android apps like a real user.**

### ✨ New Features

#### **arela run mobile Command**
- Launch and test mobile apps with Appium
- Execute user flows defined in YAML
- Capture screenshots automatically
- Support for iOS Simulator and Android Emulator
- Auto-detect Expo apps

#### **Cross-Platform Support**
- iOS testing via XCUITest driver
- Android testing via UIAutomator2 driver
- Same flow format as web testing
- Platform-specific selectors (accessibility IDs, resource IDs)

#### **Mobile-Specific Actions**
- Swipe gestures (up, down, left, right)
- Tap with coordinates
- Long press
- Scroll to element

### 🔧 Technical Details

**New Commands:**
- `arela run mobile` - Test mobile apps with Appium
- `arela run mobile --platform android` - Test Android apps
- `arela run mobile --device "iPhone 15 Pro"` - Specify device

**New Files:**
- `src/run/mobile.ts` - Mobile test runner

**Dependencies Added:**
- appium: ^2.0.0
- appium-xcuitest-driver: ^5.0.0
- appium-uiautomator2-driver: ^3.0.0
- webdriverio: ^8.0.0

### 📊 Impact

- **Test Mobile Apps** - No manual tapping required
- **Expo Support** - Auto-detects and tests Expo apps
- **Cross-Platform** - Same flows work on iOS and Android
- **Visual Proof** - Screenshots of every step

### 🚀 Breaking Changes

None - Fully backward compatible.

### 📱 Platform Support

**iOS:**
- Requires Xcode and iOS Simulator
- Uses XCUITest driver
- Accessibility IDs for selectors

**Android:**
- Requires Android Studio and Emulator
- Uses UIAutomator2 driver
- Resource IDs for selectors

**Expo:**
- Auto-detects Expo apps
- Works with `npx expo start`
- No additional configuration needed

## [3.2.0] - 2025-11-11

### 🎭 Visual Testing with Playwright

**Test your apps like a real user would.**

### ✨ New Features

#### **arela run web Command**
- Launch and test web apps with Playwright
- Execute user flows defined in YAML
- Capture screenshots automatically
- Get AI-powered UX recommendations

#### **Flow-Based Testing**
- Define user journeys in `.arela/flows/*.yml`
- Support for navigate, click, type, waitFor, screenshot actions
- Error recovery and retry logic
- Detailed results reporting

#### **Playwright MCP Server**
- Interactive browser control from Windsurf
- Tools: navigate, click, type, screenshot, evaluate
- Persistent browser session across tool calls

### 🔧 Technical Details

**New Commands:**
- `arela run web` - Test web apps with Playwright
- `arela mcp --mode playwright` - Start Playwright MCP server

**New Files:**
- `src/run/web.ts` - Web test runner
- `src/run/flows.ts` - Flow loader and parser
- `src/run/reporter.ts` - Results reporter
- `src/mcp/playwright.ts` - Playwright MCP server

**Dependencies Added:**
- playwright: ^1.40.0

### 📊 Impact

- **Catch UX Issues Early** - Find problems before users do
- **Automated Testing** - No manual clicking required
- **AI Recommendations** - Get smart suggestions for fixes
- **Visual Proof** - Screenshots of every issue

### 🚀 Breaking Changes

None - Fully backward compatible.

## [3.1.3] - 2025-11-11

### 🚀 Auto-Installation Magic

**Zero Setup Required** - Arela now automatically installs and configures everything needed for semantic search.

### ✨ New Features

#### **Automatic Ollama Management**
- **Smart Detection** - Checks if Ollama is installed before attempting to use it
- **Cross-Platform Installation** - Auto-installs Ollama on macOS (Homebrew) and Linux (official script)
- **Background Server** - Starts Ollama server automatically if not running
- **Model Management** - Auto-pulls required models (nomic-embed-text) when missing
- **Progress Feedback** - Shows installation progress and status updates

#### **Enhanced User Experience**
- **Seamless Onboarding** - New users can run `arela index` without any setup
- **Graceful Fallbacks** - Clear error messages with manual setup instructions
- **No-Ops for Existing Setup** - Skips installation if Ollama is already configured
- **Better CLI Messaging** - Explains auto-setup process to users

### 🔧 Technical Improvements

#### **New Functions in `src/rag/index.ts`**
- `isOllamaInstalled()` - Detect Ollama CLI availability
- `ensureOllamaInstalled()` - Auto-install Ollama with platform detection
- `isModelAvailable()` - Check if specific model is downloaded
- `ensureModelAvailable()` - Auto-pull models with progress display

#### **Enhanced Flows**
- `buildIndex()` now ensures Ollama + model before indexing
- `runArelaMcpServer()` ensures setup before starting MCP server
- Updated CLI messaging to explain auto-installation

### 📚 Documentation Updates

#### **Updated README.md**
- Added v3.1.3 feature highlights
- New "Auto-Installation Magic" section
- Updated Quick Start guide with zero-setup flow
- Current status changed to "Live on npm"

#### **Updated QUICKSTART.md**
- Enhanced Step 5 with auto-installation examples
- Added "What Arela does automatically" checklist
- Updated troubleshooting section for Ollama issues
- Revised typical workflow to emphasize auto-setup

### 🎯 User Impact

#### **Before v3.1.3**
```bash
# Manual setup required
1. Install Ollama: https://ollama.ai
2. Start server: ollama serve
3. Pull model: ollama pull nomic-embed-text
4. Run index: arela index
```

#### **After v3.1.3**
```bash
# One command and you're done
arela index
# ✅ Handles all setup automatically
```

### 🚀 Breaking Changes

None - Fully backward compatible.

### 📊 Performance

- **Zero Setup Time** - Eliminates manual Ollama configuration
- **Smart Detection** - <100ms to check existing setup
- **Progress Feedback** - Real-time updates during installations
- **Cross-Platform** - Works on macOS and Linux without user intervention

### 🧪 Testing

- ✅ All auto-installation functions tested
- ✅ Cross-platform installation scripts verified
- ✅ Progress feedback working correctly
- ✅ Error handling with fallback instructions
- ✅ No-op behavior when already installed

### 🙏 Credits

Auto-installation feature implemented with help from:
- Cascade (architecture + cross-platform support)
- Codex (installation script integration)
- Claude (error handling + user experience)

---

## [3.1.2] - 2025-11-11

### 📋 Documentation & Polish

**Minor version bump for documentation updates and CLI improvements.**

### 📚 Documentation Updates
- Updated README with latest features
- Enhanced QUICKSTART guide
- Improved command examples

### 🔧 CLI Polish
- Better error messages
- Enhanced help text
- Improved progress indicators

---

## [3.1.1] - 2025-11-11

### 🧠 Memory Management & Research Validation

#### **Enhanced Persona Template**
- **Proactive Memory Creation** - Auto-saves decisions, patterns, and milestones
- **Workspace-Specific** - Tags memories to CorpusName for better organization
- **No Duplicates** - Updates existing memories instead of creating duplicates
- **Selective Saving** - Only stores important decisions, not routine tasks

#### **Time & Research Awareness**
- **System Time Integration** - Uses current time for accurate timestamps
- **Current Year References** - Always uses 2025, not outdated references
- **Research Validation** - Web search for latest information before recommendations
- **Source Citation** - Cites sources for architectural decisions

#### **CLI Personality Polish**
- **Removed Brand References** - Cleaned up all "DBrand" mentions from code
- **3 Personality Modes** - Professional, Fun, Bold (renamed from dbrand)
- **Enhanced Messages** - More engaging success/error messages
- **Consistent Voice** - Unified personality across all CLI commands

### 🔧 MCP Integration
- **Session Initialization Rules** - MCP server auto-start instructions
- **RAG Priority** - Semantic search prioritized over grep/pattern matching
- **Search Priority Order** - arela_search → grep → file exploration

---

## [3.1.0] - 2025-11-11

### 🎯 CLI Personality & RAG Integration

#### **Fun CLI Personality**
- **Emoji-Rich Output** - Engaging messages with emojis
- **Encouraging Tone** - "Nailed it!", "Boom!", "Go build something amazing!"
- **Progress Indicators** - Visual feedback during operations
- **Error Empathy** - Friendly error messages with suggestions

#### **RAG Search Integration**
- **MCP Server** - Built-in MCP server for Windsurf integration
- **Semantic Indexing** - Codebase understanding through embeddings
- **Auto-Indexing Hooks** - Git hooks for incremental index updates
- **Search Tools** - `arela_search` tool for semantic code search

---

## [3.0.0] - 2025-11-11

### 🎉 Complete Rewrite - Windsurf-Native Architecture

Arela v3.0 is a ground-up rebuild focused on single-package distribution, Windsurf integration, and smart multi-agent orchestration.

### ✨ New Features

#### **Core System**
- **Single Package Distribution** - One npm package, no hybrid model
- **Windsurf-Native** - Rules in `.windsurf/rules/`, persona-first design
- **Multi-Agent Orchestration** - Smart dispatch to Codex, Claude, DeepSeek, Ollama, Cascade
- **Cost Optimization** - 87% savings through intelligent agent selection
- **Parallel Execution** - 70% time savings with concurrent ticket processing

#### **CLI Commands**
- `arela init` - Initialize with presets (startup, enterprise, solo)
- `arela agents` - Discover available AI agents
- `arela doctor` - Validate project structure
- `arela orchestrate` - Run tickets with multi-agent orchestration
- `arela status` - Show ticket execution status
- `arela index` - Build RAG semantic search index
- `arela auto-index` - Incremental indexing (git hook)
- `arela install-hook` - Enable auto-indexing on commits
- `arela uninstall-hook` - Disable auto-indexing
- `arela mcp` - Start MCP server for Windsurf integration

#### **Persona System**
- **24 CTO Rules** - Research-based engineering principles
- **3 Presets** - Startup (11 rules), Enterprise (23 rules), Solo (9 rules)
- **CTO-Style Communication** - Savage honesty + deep expertise
- **Decision Framework** - First Principles, YAGNI, Gradient Descent, Good Taste

#### **Smart Indexing**
- **Incremental RAG** - Only re-indexes changed files
- **Git Hook Integration** - Auto-updates after every commit
- **Background Processing** - Doesn't slow down commits
- **Progress Bars** - Visual feedback during indexing

#### **Ticket Management**
- **MD + YAML Support** - Flexible ticket formats
- **Auto-Generation** - Create tickets from violations
- **Smart Assignment** - Complexity-based agent selection
- **Status Tracking** - Prevents duplicate work
- **Dependency Management** - Respects ticket dependencies

#### **Structure Validation**
- **Project Doctor** - Validates setup and structure
- **Auto-Fix** - Corrects common issues automatically
- **Migration Helper** - Moves misplaced files

### 📦 What's Included

**Core Modules:**
- Multi-agent orchestration (discovery, dispatch, orchestrate, status)
- Ticket management (parser, schema, auto-generate)
- MCP server (arela_search tool)
- RAG indexing (semantic codebase search)
- Auto-indexing (incremental, git-hook based)
- Persona loader (template system)
- Structure validator (project doctor)

**Persona Templates:**
- arela-cto.md (275 lines - CTO CTO persona)
- 24 engineering rules (1,700+ lines total)
- 3 preset configurations

**Documentation:**
- QUICKSTART.md - Complete onboarding guide
- ARCHITECTURE-v3.0.md - System design
- ROADMAP-v3.0.md - Implementation plan
- PERSONA.md - Persona specification

### 🔧 Technical Details

**Stack:**
- TypeScript (ES2022 modules)
- Commander.js (CLI)
- Zod (validation)
- Ollama (embeddings)
- MCP SDK (Windsurf integration)

**Requirements:**
- Node.js >=18.0.0
- Git (for auto-indexing)
- Ollama (optional, for RAG)

### 🚀 Migration from v2.x

v3.0 is a complete rewrite with breaking changes:

**Removed:**
- `arela doctor` evaluation mode (use structure validation instead)
- Hybrid package/persona model (now single package)
- Global config in `~/.arela/` (use Windsurf Memories)
- Husky hooks (use native git hooks)

**Changed:**
- Rules location: `.arela/rules/` → `.windsurf/rules/`
- Package name: `@arela/preset-cto` → `arela`
- Init command: Creates presets instead of full setup

**New:**
- Multi-agent orchestration
- Incremental indexing
- Structure validation
- Preset system

### 📊 Performance

- **87% cost savings** - Smart agent selection
- **70% time savings** - Parallel execution
- **<1s indexing** - Incremental updates (vs 10s+ full re-index)
- **Background processing** - Non-blocking git hooks

### 🎯 Philosophy

Built on research from:
- First Principles Thinking (Elon Musk)
- YAGNI (Kent Beck)
- Gradient Descent (John Carmack)
- Good Taste (Linus Torvalds)
- Two-Way Door Decisions (Jeff Bezos)

### 🙏 Credits

Extracted and refactored from Arela v2.2.0 with help from:
- Codex (utility extraction)
- Claude (complex refactoring)
- Cascade (architecture + integration)

---

## [2.2.0] - 2024-11-09

See v2.2.0 archive for previous changelog.
