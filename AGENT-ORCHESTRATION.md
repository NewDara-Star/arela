# Agent Orchestration

Arela now acts as an intelligent orchestrator: it discovers your local and cloud AI agents, asks for explicit permissions, maintains a capability registry, routes tickets using scoring rules, and executes via adapters.

## Quick Start

```bash
# 1. Discover agents
npx arela agents scan

# 2. Grant permissions
npx arela agents grant

# 3. Create a ticket
npx arela plan "Refactor StackCard to use Shadcn Card component"

# 4. Assign to best agent
npx arela assign 2025-11-09-abc123

# 5. Execute
npx arela run 2025-11-09-abc123
```

## Architecture

### Discovery
Arela scans for:
- **Local**: Ollama (localhost:11434), LM Studio, Llama.cpp
- **Cloud**: OpenAI (OPENAI_API_KEY), Anthropic (ANTHROPIC_API_KEY)
- **IDE**: Cursor, Windsurf, Claude Desktop

### Routing Algorithm
```
Score = 0.40 × capabilityMatch + 
        0.25 × qualityScore + 
        0.20 × speedScore + 
        0.15 × (1 - costScore)
```

Agents without required capabilities or grants are rejected.

### File Structure
```
.arela/
├── agents/
│   ├── registry.json        # Discovered agents + capabilities
│   ├── grants.json          # User-approved scopes
│   └── adapters/*.json      # Per-agent config
├── tickets/
│   └── 2025-11-09-xyz.json  # Normalized task specs
├── assignments/
│   └── 2025-11-09-xyz.json  # Routing decisions
└── runs/
    └── 2025-11-09-xyz/      # Logs, patches, outputs
        ├── run.log
        └── patches/
```

## Commands

### Agent Management

#### `arela agents scan`
Discover all available agents.

```bash
npx arela agents scan

# Output:
# Scanning for agents...
# ✓ Found 5 agents
#   Saved to .arela/agents/registry.json
```

#### `arela agents grant`
Configure permissions for each agent.

```bash
npx arela agents grant

# Output:
# Agent Grant Configuration
# ✓ ollama:llama3.1  scopes [read, write]
# ✓ openai:gpt-4o-mini  scopes [read, write, network, repo:patch]
```

#### `arela agents list`
Show all agents with status and scores.

```bash
npx arela agents list

# Output:
# Agents Registry
#
# ✓ ollama:llama3.1
#    Kind: local | Transport: http
#    Capabilities: plan, codegen, refactor, doc
#    Scores: cost: 0.10 | speed: 0.60 | quality: 0.55
#    Scopes: read, write
#
# ✓ openai:gpt-4o-mini
#    Kind: cloud | Transport: http
#    Capabilities: plan, codegen, refactor, tests, doc
#    Scores: cost: 0.30 | speed: 0.90 | quality: 0.80
#    Scopes: read, write, network, repo:patch
```

### Ticket Workflow

#### `arela plan "<request>"`
Create a structured ticket from natural language.

```bash
npx arela plan "Refactor StackCard to Shadcn Card; keep props stable; add tests"

# Output:
# ✓ Ticket created: 2025-11-09-abc123
#   Saved to .arela/tickets/2025-11-09-abc123.json
```

#### `arela assign <ticketId>`
Route ticket to the best agent.

```bash
npx arela assign 2025-11-09-abc123

# Output:
# Assigning ticket: 2025-11-09-abc123
# ✓ Assigned to: openai:gpt-4o-mini
#   Score: 0.782
#   Backups: ollama:llama3.1
```

#### `arela run <ticketId>`
Execute the ticket.

```bash
npx arela run 2025-11-09-abc123

# Or dry-run first:
npx arela run 2025-11-09-abc123 --dry-run

# Output:
# Running ticket: 2025-11-09-abc123
# Agent: openai:gpt-4o-mini
#
# ✓ Run completed successfully
#   Patches: 3
#     - src/components/StackCard.tsx
#     - src/components/__tests__/StackCard.test.tsx
#     - package.json
#   Log: .arela/runs/2025-11-09-abc123/run.log
```

### Inspection

#### `arela tickets ls`
List all tickets.

```bash
npx arela tickets ls

# Output:
# Tickets
#
# 2025-11-09-abc123
#   Refactor StackCard to use Shadcn Card component
#   Category: refactor | Priority: p1
```

#### `arela runs ls`
List all execution runs.

```bash
npx arela runs ls

# Output:
# Runs
#   2025-11-09-abc123
#   2025-11-08-def456
```

## Data Models

### Agent
```typescript
{
  id: "ollama:llama3.1",
  kind: "local",
  transport: "http",
  endpoint: "http://localhost:11434",
  model: "llama3.1",
  capabilities: [
    { name: "plan", strengths: ["typescript", "python"] },
    { name: "codegen", strengths: ["react-native", "tailwind"] }
  ],
  costScore: 0.1,    // 0-1, lower is cheaper
  speedScore: 0.6,   // 0-1, higher is faster
  qualityScore: 0.55, // 0-1, historical success
  tags: ["offline", "privacy"]
}
```

### Grant
```typescript
{
  agentId: "openai:gpt-4o-mini",
  allow: true,
  scopes: ["read", "write", "network", "repo:patch", "open-pr"],
  tokenRef: "env:OPENAI_API_KEY"  // Never stores actual secrets
}
```

### Ticket
```typescript
{
  id: "2025-11-09-abc123",
  title: "Refactor StackCard to Shadcn Card",
  description: "Convert StackCard component to use Shadcn Card...",
  files: ["src/components/StackCard.tsx"],
  stack: ["react-native", "shadcn", "typescript"],
  category: "refactor",
  acceptance: [
    "Props interface unchanged",
    "Tests passing",
    "Visual parity confirmed"
  ],
  priority: "p1",
  createdAt: "2025-11-09T14:30:00Z"
}
```

### Assignment
```typescript
{
  ticketId: "2025-11-09-abc123",
  primary: "openai:gpt-4o-mini",
  backups: ["ollama:llama3.1"],
  scoreBreakdown: {
    "openai:gpt-4o-mini": 0.782,
    "ollama:llama3.1": 0.623
  },
  createdAt: "2025-11-09T14:31:00Z"
}
```

## Permission Model

### Scopes
- **read**: Read files and repo state
- **write**: Modify files
- **network**: Make external API calls
- **repo:patch**: Create patches/commits
- **open-pr**: Open pull requests

### Security Defaults
- ✅ Everything off by default
- ✅ Explicit consent required
- ✅ Secrets stored as references only (`env:OPENAI_API_KEY`)
- ✅ Grants file committed to git (no secrets)
- ✅ Dry-run mode available
- ✅ All runs logged and auditable

### Example Grants
```json
[
  {
    "agentId": "ollama:llama3.1",
    "allow": true,
    "scopes": ["read", "write"]
  },
  {
    "agentId": "openai:gpt-4o-mini",
    "allow": true,
    "scopes": ["read", "write", "network", "repo:patch"],
    "tokenRef": "env:OPENAI_API_KEY"
  },
  {
    "agentId": "cursor:workspace",
    "allow": false,
    "scopes": []
  }
]
```

## Adapters

### Ollama
- Endpoint: `http://localhost:11434/api/chat`
- Streaming: Supported
- Tools: File editing via diffs
- Cost: Free (local)

### OpenAI
- Endpoint: `https://api.openai.com/v1/chat/completions`
- Models: gpt-4o, gpt-4o-mini
- Tools: Function calling for structured output
- Cost: Per-token pricing

### Anthropic
- Endpoint: `https://api.anthropic.com/v1/messages`
- Models: claude-3-5-sonnet, claude-3-5-haiku
- Tools: Function calling
- Cost: Per-token pricing

### IDE Agents (Future)
- Cursor: IPC or file-drop
- Windsurf: Cascade API
- Claude Desktop: File-drop + watch

## Routing Examples

### Bug Fix (High Priority)
```
Ticket: "Fix null pointer in user profile"
Category: bug
Stack: ["typescript", "react"]

Scores:
- openai:gpt-4o (0.85) ← Selected
- anthropic:claude-3-5-sonnet (0.82)
- ollama:llama3.1 (0.58)

Rationale: High quality score, fast, has "typescript" strength
```

### Feature (Cost-Sensitive)
```
Ticket: "Add dark mode toggle"
Category: feature
Stack: ["react", "tailwind"]

Scores:
- openai:gpt-4o-mini (0.76) ← Selected
- anthropic:claude-3-5-haiku (0.74)
- openai:gpt-4o (0.72)

Rationale: Good quality, very fast, lower cost
```

### Refactor (Quality-Critical)
```
Ticket: "Extract auth logic to hooks"
Category: refactor
Stack: ["react", "typescript"]

Scores:
- anthropic:claude-3-5-sonnet (0.88) ← Selected
- openai:gpt-4o (0.85)
- openai:gpt-4o-mini (0.71)

Rationale: Highest quality score, excellent reasoning
```

## Audit Trail

Every run creates:
```
.arela/runs/2025-11-09-abc123/
├── run.log              # Timestamped execution log
└── patches/
    ├── StackCard.diff
    └── StackCard.test.diff
```

Log format:
```
[2025-11-09T14:35:00Z] Starting OpenAI run
Agent: openai:gpt-4o-mini
Model: gpt-4o-mini
Sending request to OpenAI API
Response received (2847 chars)
Extracted 3 patches
Run completed successfully
```

## Integration with Existing Arela

Agent orchestration **extends** Arela's existing functionality:

- ✅ Rules still enforced via `arela doctor`
- ✅ CI still validates via pre-commit hooks
- ✅ Evaluation rubric still applies
- ✅ Context integrity still required

Agents must follow the same rules humans do.

## Future Enhancements

- [ ] Interactive TUI for grants (inquirer/prompts)
- [ ] LLM-powered ticket parsing
- [ ] Automatic fallback on failure
- [ ] Cost tracking and budgets
- [ ] Quality feedback loop (update scores)
- [ ] Multi-agent collaboration
- [ ] Streaming execution logs
- [ ] PR creation with GitHub API
- [ ] Patch application with git
- [ ] IDE adapter implementations

## Philosophy

**Give the robots a union and a job.**

- Agents are **discovered**, not hardcoded
- Permissions are **explicit**, not assumed
- Routing is **scored**, not random
- Execution is **audited**, not hidden
- Failures are **logged**, not silent

Arela becomes the rude project manager who knows all your models by name, asks permission like a decent citizen, and hands out tickets to whoever's actually good at the job.

You get speed, auditability, and fewer excuses.
