# Meta-RAG Testing Instructions

## Setup (Optional but Recommended)

For fast classification (~200ms vs 1.5s with Ollama), set up your OpenAI API key:

**Option 1: Interactive Setup (Easiest)**
```bash
npm run arela -- setup
```

**Option 2: Manual Setup**
```bash
# Edit .env file
nano .env

# Add your key:
OPENAI_API_KEY=sk-proj-...
```

**Option 3: Environment Variable**
```bash
export OPENAI_API_KEY="sk-proj-..."
```

Without it, will fall back to Ollama (slower but free).

## Quick Test (Recommended)

Run the test script:

```bash
node test-meta-rag.mjs
```

This will test all 5 query types and show:
- Classification results (OpenAI or Ollama)
- Routing decisions
- Memory layers queried
- Performance stats
- Token estimates

## Manual CLI Testing

Test individual queries:

```bash
# PROCEDURAL query
npm run arela -- route "Continue working on authentication"

# FACTUAL query
npm run arela -- route "What is JWT?"

# ARCHITECTURAL query
npm run arela -- route "Show me auth dependencies"

# USER query
npm run arela -- route "What's my preferred testing framework?"

# HISTORICAL query
npm run arela -- route "Why did we choose Postgres?"

# Verbose mode (shows full context)
npm run arela -- route "Continue working on auth" --verbose
```

## Expected Results

### With OpenAI (FAST - Recommended)
- Classification time: ~200ms
- Total time: <1s per query
- Cost: ~$0.0001 per query

### With Ollama (FREE but slower)
- Classification time: 1.3-1.7s
- Total time: 2-3s per query
- Cost: $0

### PROCEDURAL
- Type: PROCEDURAL
- Layers: SESSION, PROJECT, GRAPH
- Tokens: ~2000

### FACTUAL
- Type: FACTUAL
- Layers: VECTOR
- Tokens: ~2000

### ARCHITECTURAL
- Type: ARCHITECTURAL
- Layers: GRAPH, VECTOR
- Tokens: ~2500

### USER
- Type: USER
- Layers: USER, PROJECT
- Tokens: ~1300

### HISTORICAL
- Type: HISTORICAL
- Layers: GOVERNANCE, PROJECT
- Tokens: ~1800

## What Success Looks Like

✅ Classification time: ~200ms (OpenAI) or 1.3-1.7s (Ollama)
✅ Total time: <1s (OpenAI) or <3s (Ollama)
✅ Correct layer routing for each query type
✅ Token estimates match expected ranges
✅ No errors or crashes

## Known Issues (Pre-existing)

⚠️ Classifier test may fail if Ollama unavailable
⚠️ better-sqlite3 native module mismatch (environment issue)

These don't affect the Meta-RAG functionality.

## After Testing

If all tests pass:
1. Commit: `git add -A && git commit -m "feat: Meta-RAG Phase 1 complete - classifier + router + integration"`
2. Update version to v4.1.0
3. Ship it! 🚀
