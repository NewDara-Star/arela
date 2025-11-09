# Arela Dependencies

## What Gets Installed Automatically

### ✅ By Setup Command

When you run `npx @newdara/preset-cto setup`, these are **automatically installed**:

1. **`@newdara/preset-cto`** (and all its dependencies)
   - `commander` - CLI framework
   - `execa` - Process execution
   - `fs-extra` - File system utilities
   - `glob` - File pattern matching
   - `gray-matter` - Frontmatter parsing
   - `picocolors` - Terminal colors
   - `prompts` - Interactive prompts
   - `semver` - Version parsing
   - `yaml` - YAML parsing
   - `zod` - Schema validation

2. **`husky`** (unless `--skip-hooks`)
   - Git hooks manager
   - Installed as dev dependency

3. **Ollama Embedding Model** (if confirmed)
   - `nomic-embed-text` (~274MB)
   - Only if Ollama is already installed
   - Only if user confirms the download

---

## What You Must Install Manually

### ❌ Required Prerequisites

These **MUST** be installed before running setup:

#### 1. Node.js (>= 18)

**Why:** Runtime environment for JavaScript/TypeScript

**Check if installed:**
```bash
node --version
```

**Install:**
- Go to https://nodejs.org
- Download LTS version
- Run installer

**Verified by setup:** ✅ Yes (fails if < 18)

---

#### 2. Git

**Why:** Version control system, required for commits and hooks

**Check if installed:**
```bash
git --version
```

**Install:**
- **Mac:** `xcode-select --install`
- **Windows:** https://git-scm.com
- **Linux:** `sudo apt install git`

**Verified by setup:** ✅ Yes (warns if missing)

---

#### 3. Package Manager

**Why:** Install Node.js packages

**Options:**
- **npm** - Comes with Node.js (automatic)
- **pnpm** - Faster, recommended: `npm install -g pnpm`
- **yarn** - Alternative: `npm install -g yarn`

**Verified by setup:** ✅ Yes (auto-detects)

---

### 🔧 Optional Dependencies

These are **optional** and only needed for specific features:

#### 4. Ollama

**Why:** Enables RAG (semantic search) features

**Check if installed:**
```bash
ollama --version
```

**Install:**
- Go to https://ollama.com
- Download for your OS
- Run installer

**Verified by setup:** ✅ Yes (offers to guide installation)

**Can skip:** Yes, use `--skip-rag` flag

---

## CI/CD Dependencies

### GitHub Actions

The generated workflow (`.github/workflows/arela-doctor.yml`) requires:

1. **Node.js** - ✅ Provided by `ubuntu-latest` runner
2. **pnpm** - ✅ Installed via `pnpm/action-setup@v4`
3. **@newdara/preset-cto** - ✅ Installed via `pnpm i`

**All handled automatically!** No manual setup needed.

---

## Dependency Tree

```
User's System
├── Node.js >= 18 ..................... REQUIRED (manual)
├── Git ............................... REQUIRED (manual)
└── Package Manager (npm/pnpm/yarn) ... REQUIRED (auto with Node.js)

Project Dependencies (auto-installed)
├── @newdara/preset-cto ............... ✅ Installed by setup
│   ├── commander
│   ├── execa
│   ├── fs-extra
│   ├── glob
│   ├── gray-matter
│   ├── picocolors
│   ├── prompts
│   ├── semver
│   ├── yaml
│   └── zod
└── husky ............................. ✅ Installed by setup (unless --skip-hooks)

Optional Dependencies
└── Ollama ............................ ⚠️ Manual install (optional)
    └── nomic-embed-text .............. ✅ Auto-pulled if confirmed
```

---

## Troubleshooting

### "Node.js >= 18 is required"

**Problem:** Your Node.js version is too old

**Solution:**
```bash
# Check current version
node --version

# Update Node.js
# Visit https://nodejs.org and download latest LTS
```

---

### "Git not found"

**Problem:** Git is not installed

**Solution:**
```bash
# Mac
xcode-select --install

# Windows
# Download from https://git-scm.com

# Linux
sudo apt install git
```

---

### "command not found: npx"

**Problem:** Node.js/npm not in PATH

**Solution:**
1. Restart terminal
2. Verify Node.js installation: `node --version`
3. Reinstall Node.js if needed

---

### "Ollama not found"

**Problem:** Ollama not installed (optional)

**Solution:**
- Skip RAG: `npx @newdara/preset-cto setup --skip-rag`
- Or install Ollama: https://ollama.com

---

## Minimum System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 18.0.0 | 20.x LTS |
| Git | 2.0+ | Latest |
| RAM | 512MB | 1GB+ |
| Disk Space | 100MB | 500MB (with Ollama model) |
| OS | Any | macOS, Linux, Windows 10+ |

---

## Peer Dependencies

**None!** Arela has zero peer dependencies.

All required packages are bundled as direct dependencies.

---

## Development Dependencies

If you're **developing** Arela itself (not using it), you also need:

- `typescript` - Type checking
- `tsx` - TypeScript execution
- `eslint` - Linting
- `prettier` - Formatting
- `@types/*` - Type definitions

These are **NOT** needed for normal usage.

---

## Security

All dependencies are:
- ✅ Actively maintained
- ✅ Widely used (millions of downloads)
- ✅ Audited regularly
- ✅ No known critical vulnerabilities

Run `npm audit` to check for issues.

---

## Keeping Dependencies Updated

### Update Arela

```bash
npx @newdara/preset-cto@latest setup
```

### Update Husky

```bash
npm update husky
```

### Update Ollama Model

```bash
ollama pull nomic-embed-text
```

---

## Summary

**Required (Manual):**
- Node.js >= 18
- Git
- Package Manager (comes with Node.js)

**Installed Automatically:**
- @newdara/preset-cto (and all its dependencies)
- husky (unless skipped)

**Optional:**
- Ollama + embedding model (for RAG)

**Total Install Time:**
- Prerequisites: ~5 minutes (one-time)
- Setup: ~30-60 seconds
- With Ollama model: +2-3 minutes

**Total Disk Space:**
- Arela + dependencies: ~50MB
- Ollama + model: ~500MB (optional)
