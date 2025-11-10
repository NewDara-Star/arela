# ARELA-001: Auto-Generate Tickets from Audit

**Complexity:** medium
**Priority:** high
**Agent:** codex
**Estimated time:** 45m

## Context

v2.0.0 needs the ability to automatically generate tickets from `npx arela doctor` violations. This will save massive time by converting audit results into actionable tickets.

## Requirements

1. Create `src/auto-tickets.ts` module
2. Parse doctor output to extract violations
3. Generate ticket files in `.arela/tickets/`
4. Auto-assign to appropriate agent based on violation type
5. Add `--create-tickets` flag to `doctor` command
6. Group similar violations into single tickets

## Acceptance Criteria

- [ ] `npx arela doctor --create-tickets` generates tickets from violations
- [ ] Tickets are properly formatted with all metadata
- [ ] Tickets are auto-assigned to best agent (codex for simple, claude for complex)
- [ ] Similar violations are grouped (e.g., all missing tests → one ticket)
- [ ] Tickets include file paths and line numbers where applicable
- [ ] Dry-run mode available: `--create-tickets --dry-run`

## Files to Create/Modify

- `src/auto-tickets.ts` - New module for ticket generation
- `src/cli.ts` - Add `--create-tickets` flag to doctor command
- `src/loaders.ts` - Export doctor violations in structured format

## Example Output

```bash
npx arela doctor --create-tickets

# Output:
# 🎫 Generated Tickets:
#
# CODEX-001: Fix console.log in production (8 occurrences)
#   Priority: high
#   Estimated: 15m
#   Files: src/api/users.ts, src/api/posts.ts
#
# CLAUDE-001: Add error handling to API routes (4 occurrences)
#   Priority: medium
#   Estimated: 1h
#   Files: src/api/*.ts
#
# Created 2 tickets in .arela/tickets/
```

## Testing

```bash
# Test ticket generation
cd /Users/Star/arela/packages/preset-cto
npx arela doctor --create-tickets --dry-run

# Verify tickets created
ls .arela/tickets/

# Verify ticket format
cat .arela/tickets/CODEX-001.md
```

## Dependencies

None

## Tags

- v2.0.0
- automation
- quick-win
