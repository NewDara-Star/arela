# Local Agent Integration

Arela can work with **any** AI agent on your machine - cloud APIs, local models, or custom scripts!

## Supported Agents

### Cloud Agents
- ✅ **Codex** (GitHub Copilot CLI) - $0.002/1K
- ✅ **Claude** (Anthropic) - $0.015/1K
- ✅ **DeepSeek** - $0.001/1K
- ✅ **Gemini** (Google) - $0.001/1K

### Local Agents (FREE!)
- ✅ **Ollama** (CodeLlama, DeepSeek, etc.) - $0
- ✅ **LM Studio** - $0
- ✅ **LocalAI** - $0

### IDE Agents
- ✅ **Cascade** (Windsurf) - $0
- ✅ **Cursor** - Varies
- ✅ **Cody** (Sourcegraph) - Varies

### Custom Agents
- ✅ **Your own scripts** - $0
- ✅ **Custom APIs** - Your pricing
- ✅ **Hybrid workflows** - Mix and match

---

## Quick Start

### 1. Configure Agents

Edit `.arela/agents/config.json`:

```json
{
  "agents": {
    "local-llama": {
      "name": "Local Llama",
      "type": "local",
      "command": "ollama run codellama:13b",
      "cost_per_1k_tokens": 0,
      "enabled": true
    }
  }
}
```

### 2. Create Agent Wrapper

Create `.arela/agents/local-llama/cli.sh`:

```bash
#!/bin/bash
# Wrapper for Ollama

TICKET_CONTENT="$1"

# Run Ollama with ticket content
ollama run codellama:13b <<EOF
You are a senior software engineer. Complete this ticket:

$TICKET_CONTENT

Provide complete, production-ready code.
EOF
```

### 3. Use in Tickets

```markdown
# Ticket: LOCAL-001 - Optimize Function

**Agent:** @local-llama
**Cost estimate:** $0 (local model!)
```

### 4. Run Ticket

```bash
# Arela automatically uses the configured agent
npx arela run-ticket local-llama LOCAL-001
```

---

## Agent Types

### Type: CLI

**For agents with command-line interfaces**

```json
{
  "type": "cli",
  "command": "codex exec --full-auto"
}
```

**Usage:**
```bash
cat ticket.md | codex exec --full-auto
```

### Type: Local

**For local LLM servers (Ollama, LM Studio)**

```json
{
  "type": "local",
  "command": "ollama run codellama:13b"
}
```

**Usage:**
```bash
cat ticket.md | ollama run codellama:13b
```

### Type: API

**For HTTP APIs**

```json
{
  "type": "api",
  "endpoint": "http://localhost:11434/api/generate",
  "headers": {
    "Content-Type": "application/json"
  }
}
```

**Usage:**
```bash
curl -X POST http://localhost:11434/api/generate \
  -d '{"model": "codellama", "prompt": "..."}'
```

### Type: Custom

**For your own scripts**

```json
{
  "type": "custom",
  "command": ".arela/agents/custom/run.sh"
}
```

**Usage:**
```bash
.arela/agents/custom/run.sh ticket.md
```

---

## Example Configurations

### Ollama (Local, Free)

```json
{
  "local-codellama": {
    "name": "CodeLlama 13B",
    "type": "local",
    "command": "ollama run codellama:13b",
    "cost_per_1k_tokens": 0,
    "enabled": true,
    "description": "Local CodeLlama - Free!"
  }
}
```

**Wrapper script** (`.arela/agents/local-codellama/cli.sh`):
```bash
#!/bin/bash
ollama run codellama:13b "$(cat $1)"
```

### LM Studio (Local, Free)

```json
{
  "lm-studio": {
    "name": "LM Studio",
    "type": "api",
    "endpoint": "http://localhost:1234/v1/chat/completions",
    "cost_per_1k_tokens": 0,
    "enabled": true
  }
}
```

### Custom Python Script

```json
{
  "my-agent": {
    "name": "My Custom Agent",
    "type": "custom",
    "command": "python .arela/agents/my-agent/run.py",
    "cost_per_1k_tokens": 0,
    "enabled": true
  }
}
```

**Script** (`.arela/agents/my-agent/run.py`):
```python
#!/usr/bin/env python3
import sys
from openai import OpenAI

ticket = sys.stdin.read()
client = OpenAI(base_url="http://localhost:1234/v1")

response = client.chat.completions.create(
    model="local-model",
    messages=[{"role": "user", "content": ticket}]
)

print(response.choices[0].message.content)
```

---

## Cost Optimization with Local Agents

### Strategy: Use Local for Simple Tasks

**Before (All Cloud):**
```
14 Codex tickets × $0.002 = $0.028
Total: $0.028
```

**After (Local + Cloud):**
```
10 Local tickets × $0 = $0
4 Codex tickets × $0.002 = $0.008
Total: $0.008 (71% savings!)
```

### Strategy: Hybrid Workflow

```
CLAUDE-001: Architecture (complex) → $0.060
LOCAL-001 to LOCAL-010: Implementation (simple) → $0
CODEX-001 to CODEX-004: Edge cases (medium) → $0.008
Total: $0.068 vs $0.210 (68% savings!)
```

---

## Agent Selection Decision Tree

```
What type of task?
    │
    ├─ Simple implementation (CRUD, boilerplate)
    │   ├─ Have local model? → Use Local ($0)
    │   └─ No local model? → Use Codex ($0.002/1K)
    │
    ├─ Complex reasoning (architecture, design)
    │   └─ Use Claude ($0.015/1K)
    │
    ├─ Optimization (refactoring, performance)
    │   ├─ Have local model? → Use Local ($0)
    │   └─ No local model? → Use DeepSeek ($0.001/1K)
    │
    └─ Integration (orchestration)
        └─ Use Cascade (free)
```

---

## Setup Guide

### 1. Install Ollama (Recommended)

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull codellama:13b
```

### 2. Configure Arela

```bash
# Enable local agent
npx arela agent enable local-codellama

# Test it
npx arela agent test local-codellama
```

### 3. Create Tickets

```markdown
# Ticket: LOCAL-001 - Create Button Component

**Agent:** @local-codellama
**Cost estimate:** $0 (local!)
```

### 4. Run Tickets

```bash
# Run single ticket
npx arela run-ticket local-codellama LOCAL-001

# Run all local tickets
npx arela orchestrate --agent=local-codellama
```

---

## Performance Comparison

| Agent | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| **Claude** | Slow | Excellent | High | Architecture |
| **Codex** | Fast | Good | Medium | Implementation |
| **DeepSeek** | Fast | Good | Low | Optimization |
| **Local (13B)** | Medium | Good | Free | Simple tasks |
| **Local (70B)** | Slow | Excellent | Free | Complex tasks |

---

## Troubleshooting

### Issue: Local model too slow

**Solution:** Use smaller model or cloud agent for urgent tasks:

```bash
# Fast local model
ollama pull codellama:7b

# Or use cloud for urgent tasks
**Agent:** @codex  # Fast cloud option
```

### Issue: Local model quality not good enough

**Solution:** Use larger model or hybrid approach:

```bash
# Better local model
ollama pull codellama:70b

# Or hybrid
LOCAL-001: First draft (local, free)
CODEX-001: Review and polish (cloud, $0.002)
```

### Issue: Agent not found

**Solution:** Check agent is installed and enabled:

```bash
# Check Ollama
ollama list

# Enable in Arela
npx arela agent enable local-codellama
```

---

## Coming in v1.4.0

- ✅ **Auto-detect agents** - Arela finds installed agents
- ✅ **Agent benchmarking** - Test quality/speed
- ✅ **Smart routing** - Auto-select best agent
- ✅ **Fallback chains** - Try local, fallback to cloud
- ✅ **Cost tracking** - Track actual costs per agent

---

## Examples

### Example 1: All Local (Free!)

```bash
.arela/tickets/local-codellama/
├── LOCAL-001-button.md
├── LOCAL-002-input.md
└── LOCAL-003-select.md

# Run all (parallel, free!)
npx arela orchestrate --agent=local-codellama

Total cost: $0
Total time: 5 minutes
```

### Example 2: Hybrid (Optimized)

```bash
.arela/tickets/
├── claude/
│   └── CLAUDE-001-architecture.md ($0.060)
├── local-codellama/
│   ├── LOCAL-001 to LOCAL-010.md ($0)
└── codex/
    └── CODEX-001-edge-cases.md ($0.008)

Total cost: $0.068 (vs $0.210 all-cloud)
Savings: 68%
```

### Example 3: Custom Agent

```bash
.arela/agents/my-agent/
├── run.py              # Your custom script
└── config.json         # Agent config

.arela/tickets/my-agent/
└── CUSTOM-001-task.md

# Run with your agent
npx arela run-ticket my-agent CUSTOM-001
```

---

## Best Practices

1. **Use local for simple tasks** - Save money on boilerplate
2. **Use cloud for complex tasks** - Better quality when it matters
3. **Test local models first** - Find the right size/quality balance
4. **Hybrid workflows** - Mix local and cloud for best results
5. **Track costs** - Monitor actual spending vs estimates

---

**Run AI agents anywhere. Pay only when you need to.** 🚀
