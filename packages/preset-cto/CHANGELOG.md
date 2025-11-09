# Changelog

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
