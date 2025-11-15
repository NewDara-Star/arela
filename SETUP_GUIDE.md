# Arela Setup Guide

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build
npm run build

# 3. Set up API keys (optional but recommended)
npm run arela -- setup

# 4. Test it
node test-meta-rag.mjs
```

## API Keys (Optional)

### Why Set Up API Keys?

**OpenAI (Recommended):**
- **Speed:** ~200ms classification (vs 1.5s with Ollama)
- **Cost:** $0.0001 per query = 1 cent per 100 queries
- **Reliability:** 99.9% uptime
- **Use case:** Production, fast iteration

**Ollama (Free Alternative):**
- **Speed:** ~1.5s classification
- **Cost:** $0 (completely free)
- **Reliability:** Requires local setup
- **Use case:** Development, cost-sensitive

### Setup Methods

**Method 1: Interactive (Easiest)**
```bash
npm run arela -- setup
```

Follow the prompts to enter your keys.

**Method 2: Manual**
```bash
# Copy example
cp .env.example .env

# Edit .env
nano .env

# Add your keys:
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
```

**Method 3: Environment Variables**
```bash
# Add to ~/.zshrc or ~/.bashrc
export OPENAI_API_KEY="sk-proj-..."
export ANTHROPIC_API_KEY="sk-ant-..."

# Reload
source ~/.zshrc
```

### Get API Keys

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy and save it (you won't see it again!)

**Anthropic (Optional):**
1. Go to https://console.anthropic.com/
2. Create API key
3. Copy and save it

## Testing

### Quick Test
```bash
node test-meta-rag.mjs
```

### CLI Test
```bash
npm run arela -- route "Continue working on authentication"
npm run arela -- route "What is JWT?"
npm run arela -- route "Show me dependencies"
```

### Expected Output

**With OpenAI:**
```
✅ OpenAI available for query classification (gpt-4o-mini)
📊 Classification: PROCEDURAL (0.95)
⏱️  Stats:
   Classification: 203ms
   Total: 856ms
```

**With Ollama:**
```
✅ Ollama available for query classification (qwen2.5:3b)
📊 Classification: PROCEDURAL (0.9)
⏱️  Stats:
   Classification: 1547ms
   Total: 2103ms
```

## Troubleshooting

### "Cannot find module 'openai'"
```bash
npm install
npm run build
```

### "Ollama not available"
```bash
# Install Ollama
brew install ollama

# Pull model
ollama pull qwen2.5:3b
```

### "OpenAI API key invalid"
```bash
# Check your key
echo $OPENAI_API_KEY

# Re-run setup
npm run arela -- setup
```

### ".env not loading"
```bash
# Make sure .env exists
ls -la .env

# Check it's in the right place (project root)
pwd
```

## Cost Analysis

### OpenAI Pricing

**gpt-4o-mini:**
- Input: $0.150 per 1M tokens
- Output: $0.600 per 1M tokens
- Classification: ~$0.0001 per query

**Monthly costs:**
- 100 queries/day = $0.30/month
- 1000 queries/day = $3/month
- 10,000 queries/day = $30/month

### Ollama Pricing

**Free forever!**
- No API costs
- Runs locally
- Requires: 8GB RAM, 4GB disk space

## Next Steps

1. ✅ Set up API keys
2. ✅ Test classification
3. 📋 Run full Meta-RAG test
4. 🚀 Ship v4.1.0!

## Support

- Issues: https://github.com/yourusername/arela/issues
- Docs: See TESTING_INSTRUCTIONS.md
- Community: [Your Discord/Slack]
