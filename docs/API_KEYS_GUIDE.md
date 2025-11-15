# 🔑 API Keys Setup Guide

**Welcome to Arela!** This guide will help you set up API keys for the best experience.

---

## 🤔 Why Do I Need API Keys?

Arela uses AI models to understand your code. You have two options:

### Option 1: Cloud Models (Recommended) ☁️
- **Pros:** Fast, accurate, best results
- **Cons:** Requires API key, costs ~$1/month
- **Best for:** Professional use, production projects

### Option 2: Local Models (Free) 🏠
- **Pros:** Free, private, no API key needed
- **Cons:** Slower, less accurate
- **Best for:** Learning, experimentation, privacy-focused

---

## ❓ Can I Use My ChatGPT Plus / Claude Pro Subscription?

**No, unfortunately not.** Here's why:

| Feature | ChatGPT Plus / Claude Pro | API Access |
|---------|---------------------------|------------|
| **Type** | Web chat interface | Programmatic access |
| **Use** | Human conversations | Code automation |
| **Cost** | $20/month flat | Pay per use (~$0.0001/file) |
| **For Arela** | ❌ Can't use | ✅ Works |

**Good news:** API is actually **much cheaper** for Arela's use case!

### Cost Comparison
```
ChatGPT Plus: $20/month (can't use with Arela)
API Access:   ~$1/month for typical use (1000 files)
Ollama:       $0 (free, local)
```

**Most users spend less than $1/month on API costs!**

---

## 🚀 Quick Start (3 Options)

### Option 1: Claude API (Recommended)

**Why Claude?**
- Best code understanding
- Excellent JSON output
- ~$0.0001 per file

**Setup:**
1. Go to: https://console.anthropic.com/
2. Click "Get API Keys"
3. Create account (separate from Claude Pro)
4. Add payment method (credit card)
5. Create API key
6. Copy the key (starts with `sk-ant-`)

**Add to Arela:**
```bash
# In your project directory
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" >> .env
```

**Test it:**
```bash
arela summarize src/index.ts
```

---

### Option 2: OpenAI API (Alternative)

**Why OpenAI?**
- Fast responses
- Good code understanding
- ~$0.0001 per file

**Setup:**
1. Go to: https://platform.openai.com/
2. Click "API Keys"
3. Create account
4. Add payment method
5. Create API key
6. Copy the key (starts with `sk-`)

**Add to Arela:**
```bash
# In your project directory
echo "OPENAI_API_KEY=sk-your-key-here" >> .env
```

**Test it:**
```bash
arela summarize src/index.ts
```

---

### Option 3: Ollama (Free, Local)

**Why Ollama?**
- Completely free
- Runs on your machine
- No API key needed
- Privacy-first (code never leaves your computer)

**Setup:**
1. Install Ollama: https://ollama.ai/
2. Pull model:
   ```bash
   ollama pull llama3.2
   ```
3. That's it! No API key needed.

**Use with Arela:**
```bash
arela summarize src/index.ts --local
```

**Note:** Slower than cloud models, but free!

---

## 🔒 Security Best Practices

### ✅ DO:
- Store API keys in `.env` file
- Add `.env` to `.gitignore` (Arela does this automatically)
- Use separate API keys for different projects
- Rotate keys periodically

### ❌ DON'T:
- Commit `.env` to git
- Share API keys publicly
- Hardcode keys in code
- Use production keys for testing

---

## 💰 Cost Tracking

### See Your Usage:
```bash
# After using summarization
arela summarize:stats

📊 Summarization Stats:
- Total files: 47
- Total cost: $0.014
- Cache hit rate: 73%
- Savings: $0.042 (from caching)
```

### Typical Costs:
```
Small project (100 files):    ~$0.10
Medium project (1000 files):  ~$1.00
Large project (10000 files):  ~$10.00

With 70% cache hit rate:      ~$0.30 (90% savings!)
```

---

## 🆘 Troubleshooting

### "No API key found"
```bash
❌ No API key found!

Solution:
1. Create .env file in project root
2. Add: ANTHROPIC_API_KEY=sk-ant-...
3. Or use local: arela summarize --local
```

### "Invalid API key"
```bash
❌ Invalid API key

Solution:
1. Check key format (starts with sk-ant- or sk-)
2. Verify key is active in console
3. Try regenerating key
```

### "Rate limit exceeded"
```bash
❌ Rate limit exceeded

Solution:
1. Wait a few minutes
2. Upgrade API tier if needed
3. Use --local for unlimited requests
```

### "API key works in browser but not Arela"
```bash
❌ This is expected!

Chat subscriptions (ChatGPT Plus, Claude Pro) are separate from API access.
You need a separate API key from:
- https://console.anthropic.com/ (Claude)
- https://platform.openai.com/ (OpenAI)
```

---

## 🎓 Understanding the Difference

### Chat Subscription vs API Access

**Chat Subscription (ChatGPT Plus / Claude Pro):**
```
You: "Explain this code"
AI: [Responds in chat]
Cost: $20/month flat
Use: Manual conversations
```

**API Access (What Arela Needs):**
```typescript
// Arela calls API programmatically
const response = await ai.summarize(code);
Cost: ~$0.0001 per call
Use: Automated tasks
```

**They're different products!**

Think of it like:
- **Chat Subscription** = Netflix (watch movies)
- **API Access** = Movie production tools (make movies)

Both involve movies, but serve different purposes!

---

## 🌟 Recommended Setup

**For Best Experience:**

1. **Start with Claude API** (best quality)
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. **Add OpenAI as backup** (if Claude fails)
   ```bash
   OPENAI_API_KEY=sk-...
   ```

3. **Install Ollama** (free fallback)
   ```bash
   ollama pull llama3.2
   ```

**Arela will automatically:**
- Try Claude first (best quality)
- Fall back to OpenAI if Claude fails
- Fall back to Ollama if both fail
- Cache results to save money (70% savings!)

---

## 📞 Need Help?

- **Documentation:** https://github.com/newdara/arela
- **Issues:** https://github.com/newdara/arela/issues
- **Discord:** [Coming soon]

---

## 🎉 You're All Set!

Try your first summarization:

```bash
# With cloud models
arela summarize src/index.ts

# With local model
arela summarize src/index.ts --local

# Summarize entire project
arela summarize src/**/*.ts
```

**Welcome to Arela!** 🚀
