# Ticket: [AGENT]-[NUMBER] - [Title]

**Agent:** @codex | @claude | @deepseek | @cascade  
**Priority:** high | medium | low  
**Complexity:** simple | medium | complex  
**Estimated tokens:** [number]  
**Cost estimate:** $[amount]  
**Dependencies:** [TICKET-IDs or None]  
**Estimated time:** [duration]  

## Context

[Why this task exists. What problem does it solve? What's the business value?]

## Requirements

- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

## Acceptance Criteria

- [ ] Testable criterion 1
- [ ] Testable criterion 2
- [ ] Testable criterion 3

## Technical Specification

[Detailed implementation notes, file paths, API signatures, data structures, etc.]

```typescript
// Example code structure
```

## Test Requirements

- [ ] Unit tests for core logic
- [ ] Integration tests for API
- [ ] E2E tests for user flows
- [ ] Performance tests if applicable

## Definition of Done

- [ ] All requirements met
- [ ] All acceptance criteria passing
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Deployed to staging

---

## Agent Selection Guide

**Use @codex for:**
- CRUD operations
- Boilerplate code
- Test generation
- Pattern-based implementations
- **Cost:** $0.002/1K tokens

**Use @claude for:**
- Architecture decisions
- Complex algorithms
- Security reviews
- Documentation
- **Cost:** $0.015/1K tokens

**Use @deepseek for:**
- Code optimization
- Refactoring
- Performance improvements
- **Cost:** $0.001/1K tokens

**Use @cascade for:**
- Integration tasks
- Orchestration
- Code review
- **Cost:** Free

## Cost Estimation

**Token Estimation:**
- Simple task: 1K-2K tokens
- Medium task: 2K-4K tokens
- Complex task: 4K-8K tokens

**Cost Calculation:**
```
Cost = Tokens × Agent Rate

Examples:
- Codex (2K tokens): 2000 × $0.002 = $0.004
- Claude (4K tokens): 4000 × $0.015 = $0.060
- DeepSeek (3K tokens): 3000 × $0.001 = $0.003
```

## Example Tickets

See example tickets in `.arela/tickets/`:
- `codex/EXAMPLE-CODEX-001-component.md` - Component implementation
- `claude/EXAMPLE-CLAUDE-001-architecture.md` - Architecture design
- `deepseek/EXAMPLE-DEEPSEEK-001-optimization.md` - Performance optimization
