# Multi-Agent Ticket Organization

Organize your tickets by AI agent for optimal cost and performance.

## Folder Structure

```
.arela/tickets/
├── codex/          # Implementation, CRUD, boilerplate ($0.002/1K tokens)
├── claude/         # Architecture, design, complex reasoning ($0.015/1K tokens)
├── deepseek/       # Optimization, refactoring ($0.001/1K tokens)
├── cascade/        # Integration, orchestration (free)
├── .ticket-status.json  # Status tracking (auto-generated)
└── README.md       # This file
```

## Agent Selection Guide

| Task Type | Agent | Cost/1K | Speed | Use Case |
|-----------|-------|---------|-------|----------|
| **CRUD endpoints** | Codex | $0.002 | Fast | Repetitive patterns |
| **Boilerplate** | Codex | $0.002 | Fast | Clear specifications |
| **Test generation** | Codex | $0.002 | Fast | Pattern-based |
| **Architecture** | Claude | $0.015 | Slow | Complex design |
| **Security review** | Claude | $0.015 | Slow | Deep reasoning |
| **Documentation** | Claude | $0.015 | Slow | Context understanding |
| **Refactoring** | DeepSeek | $0.001 | Fast | Code optimization |
| **Performance** | DeepSeek | $0.001 | Fast | Algorithmic improvements |
| **Integration** | Cascade | Free | N/A | Orchestration |

## Cost Optimization Example

**Building 14 React Components:**

**Option A (All Claude):**
- 14 tickets × 3K tokens × $0.015 = **$0.63**

**Option B (Optimized):**
- 14 Codex tickets × 2K tokens × $0.002 = $0.056
- 2 Claude tickets × 4K tokens × $0.015 = $0.120
- **Total: $0.176 (72% savings)**

## Ticket Naming Convention

```
{AGENT}-{NUMBER}-{description}.md

Examples:
- CODEX-001-input-component.md
- CLAUDE-001-system-architecture.md
- DEEPSEEK-001-optimize-queries.md
- CASCADE-001-integration-review.md
```

## Usage

### 1. Create Tickets

Place tickets in the appropriate agent folder based on task type.

### 2. Track Status

Status is automatically tracked in `.ticket-status.json`:

```json
{
  "tickets": {
    "CODEX-001-input-component": {
      "status": "completed",
      "agent": "codex",
      "cost": 0.004
    }
  }
}
```

### 3. Run Tickets

```bash
# Run specific ticket
cat .arela/tickets/codex/CODEX-001-input-component.md | codex exec --full-auto

# Run all tickets for an agent
for ticket in .arela/tickets/codex/*.md; do
  cat "$ticket" | codex exec --full-auto
done
```

## Status Values

- `open` - Not started
- `in_progress` - Currently running
- `completed` - Successfully finished
- `failed` - Execution failed

## Coming in v1.4.0

- ✅ Automated runner scripts (`run-codex-tickets.sh`)
- ✅ Orchestration command (`npx arela orchestrate`)
- ✅ Status tracking CLI (`npx arela status`)
- ✅ Parallel execution
- ✅ Cost reporting

## See Also

- [MULTI-AGENT-GUIDE.md](../../MULTI-AGENT-GUIDE.md) - Complete guide
- [Ticket Template](../ticket-template.md) - Enhanced template with cost estimates
- [RFC](../../RFC-MULTI-AGENT-ORCHESTRATION.md) - Full specification
