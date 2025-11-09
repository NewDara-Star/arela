# Arela RAG (Retrieval-Augmented Generation)

## Overview

Arela includes a **local RAG system** powered by Ollama that indexes your entire codebase and enables semantic search - **completely free, no API costs**.

## Why Local RAG?

- **💰 Zero Cost** - No OpenAI/Anthropic API charges for search
- **🔒 Private** - Your code never leaves your machine
- **⚡ Fast** - Local embeddings and search
- **🎯 Accurate** - Semantic search finds relevant code contextually

## How It Works

```
Your Codebase
    ↓
Ollama (local) generates embeddings
    ↓
Stored in .arela/.rag-index.json
    ↓
AI assistants query locally
    ↓
Relevant code chunks returned
    ↓
AI uses context for better code generation
```

## Setup

### 1. Install Ollama

```bash
# Mac
brew install ollama

# Or download from https://ollama.com
```

### 2. Pull Embedding Model

```bash
ollama pull nomic-embed-text
```

**Size:** ~274MB (one-time download)

### 3. Run Arela Setup

```bash
npx @newdara/preset-cto setup
```

The wizard will:
- Detect Ollama
- Offer to pull embedding model
- Index your codebase
- Configure AI assistants

## Manual Indexing

### Index Your Codebase

```bash
npx arela index
```

**What gets indexed:**
- TypeScript/JavaScript files
- Python, Go, Rust, Java
- Markdown documentation
- JSON/YAML configs

**What's excluded:**
- `node_modules/`
- `dist/`, `build/`
- `.git/`
- Lock files
- Minified files

### Custom Exclusions

```bash
npx arela index --exclude "**/*.test.ts" "**/*.spec.ts"
```

### Different Model

```bash
npx arela index --model mxbai-embed-large
```

## Searching

### CLI Search

```bash
npx arela search "authentication middleware"
```

**Example output:**
```
Searching for: "authentication middleware"

1. src/middleware/auth.ts
   Score: 0.8542
   export function authMiddleware(req: Request, res: Response, next: NextFunction) {
     const token = req.headers.authorization?.split(' ')[1];
     if (!token) return res.status(401).json({ error: 'No token' });
   ...

2. src/routes/api.ts
   Score: 0.7891
   router.use(authMiddleware);
   router.get('/protected', (req, res) => {
   ...
```

### Top K Results

```bash
npx arela search "database connection" --top 10
```

## AI Assistant Integration

### Windsurf

After setup, Windsurf can query your RAG index:

```
@arela search for authentication logic
```

### Cursor

Configure Cursor to use local RAG endpoint:

```json
{
  "ragEndpoint": "http://localhost:3456/search"
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "tools": {
    "arela_search": {
      "endpoint": "http://localhost:3456/search"
    }
  }
}
```

## Index Management

### Check Index Stats

```bash
ls -lh .arela/.rag-index.json
```

### Rebuild Index

```bash
npx arela index
```

Rebuilds from scratch. Run after:
- Major code changes
- Adding new files
- Changing project structure

### Delete Index

```bash
rm .arela/.rag-index.json
```

## Performance

### Indexing Speed

- **Small project** (< 100 files): ~10-30 seconds
- **Medium project** (100-500 files): ~1-3 minutes
- **Large project** (500+ files): ~3-10 minutes

### Search Speed

- **Query time**: < 100ms
- **Results**: Top 5 chunks by default

### Index Size

- **~1KB per code chunk**
- **Average project**: 5-50MB index file

## Cost Comparison

### Traditional RAG (OpenAI)

```
1M tokens embeddings = $0.13
Average project = 500K tokens
Cost per index = $0.065
Re-index 10x/month = $0.65/month
```

### Arela Local RAG

```
Cost = $0.00
```

**Savings:** 100% 🎉

## Supported Models

### Recommended

1. **nomic-embed-text** (274MB)
   - Best balance of size/quality
   - Fast inference
   - Default choice

2. **mxbai-embed-large** (670MB)
   - Higher quality
   - Slower inference

3. **all-minilm** (45MB)
   - Smallest
   - Good for quick tests

### Pull Models

```bash
ollama pull nomic-embed-text
ollama pull mxbai-embed-large
ollama pull all-minilm
```

## Troubleshooting

### "Ollama not running"

Start Ollama server:
```bash
ollama serve
```

Or let Arela start it automatically:
```bash
npx arela index
```

### "Model not found"

Pull the model:
```bash
ollama pull nomic-embed-text
```

### "Index not found"

Build the index:
```bash
npx arela index
```

### Slow Indexing

- Reduce file count with `--exclude`
- Use smaller model (`all-minilm`)
- Index incrementally (coming soon)

## Advanced Usage

### Custom Ollama Host

```bash
npx arela index --ollama-host http://192.168.1.100:11434
```

### Exclude Patterns

```bash
npx arela index \
  --exclude "**/*.test.ts" \
  --exclude "**/*.spec.ts" \
  --exclude "**/fixtures/**"
```

### Programmatic API

```typescript
import { buildIndex, search } from "@newdara/preset-cto/rag";

// Build index
const stats = await buildIndex({
  cwd: process.cwd(),
  model: "nomic-embed-text",
  excludePatterns: ["**/*.test.ts"],
});

// Search
const results = await search("authentication", {
  cwd: process.cwd(),
  model: "nomic-embed-text",
}, 5);
```

## Roadmap

- [ ] **RAG Server** - HTTP endpoint for AI assistants
- [ ] **Incremental Indexing** - Only index changed files
- [ ] **Multi-repo Support** - Index across multiple projects
- [ ] **Hybrid Search** - Combine semantic + keyword search
- [ ] **Context Window Optimization** - Smart chunk selection
- [ ] **Caching** - Cache frequent queries

## FAQ

### "Do I need Ollama running all the time?"

Only when indexing or searching. Your AI assistant will start it automatically when needed.

### "Can I use this with GitHub Copilot?"

Not directly. Copilot uses its own RAG system. Arela RAG works with Cursor, Windsurf, and Claude.

### "Is the index committed to git?"

No. `.arela/.rag-index.json` is gitignored. Each developer builds their own index locally.

### "How often should I rebuild?"

- After major refactors
- Weekly for active projects
- Or just run `npx arela index` when search results feel stale

### "Can I share the index with my team?"

Technically yes, but not recommended. Index files are large and machine-specific. Better to have each developer build their own.

## Privacy & Security

- ✅ **All local** - No data sent to external servers
- ✅ **No telemetry** - Arela doesn't track usage
- ✅ **Gitignored** - Index never committed
- ✅ **Open source** - Audit the code yourself

---

**Save money. Keep it local. Ship faster.** 🚀
