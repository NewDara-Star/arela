# Arela Tickets

Create tickets in agent-specific folders:

- `codex/` - Simple tasks (CRUD, boilerplate)
- `claude/` - Complex tasks (architecture, refactoring)
- `deepseek/` - Optimization tasks
- `ollama/` - Offline/unlimited tasks
- `cascade/` - IDE-integrated tasks

## Ticket Format

### Markdown (TICKET-001.md)
```markdown
# CODEX-001: Create Login Component

**Agent:** codex
**Priority:** high
**Complexity:** simple

## Description
Build login form with email/password validation

## Tasks
- [ ] Email input
- [ ] Password input
- [ ] Form validation
```

### YAML (TICKET-001.yaml)
```yaml
id: CODEX-001
title: Create Login Component
agent: codex
priority: high
complexity: simple
description: Build login form with email/password validation
tasks:
  - Email input
  - Password input
  - Form validation
```

## Running Tickets

```bash
# Run all tickets
arela orchestrate

# Run in parallel
arela orchestrate --parallel

# Run specific agent
arela orchestrate --agent codex

# Check status
arela status
```
