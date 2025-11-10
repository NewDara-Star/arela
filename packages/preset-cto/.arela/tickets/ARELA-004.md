# ARELA-004: YAML Ticket Format Support

**Complexity:** medium
**Priority:** medium
**Agent:** codex

## Context

Markdown tickets are hard to parse programmatically. Add YAML ticket format with schema validation for better automation.

## Requirements

1. Create YAML ticket schema
2. Support both `.md` and `.yaml` ticket files
3. Add validation for YAML tickets
4. Create migration tool: `npx arela migrate tickets --to yaml`
5. Update ticket parser to handle both formats

## Acceptance Criteria

- [ ] YAML tickets can be created and parsed
- [ ] Schema validation catches invalid tickets
- [ ] Migration tool converts MD → YAML
- [ ] Both formats work with dispatch system
- [ ] YAML format includes all metadata fields
- [ ] Acceptance criteria can include test commands

## YAML Format Example

```yaml
id: CODEX-001
title: Add security scanning
agent: codex
priority: highest
complexity: simple
status: pending
estimated_time: 30m
estimated_cost: $0.15

context: |
  Part of security scanning initiative.
  Need to add SECURITY.md and Dependabot config.

requirements:
  - Create SECURITY.md with vulnerability reporting process
  - Add Dependabot configuration for dependency updates
  - Configure security scanning in CI

acceptance:
  - id: ac-1
    description: SECURITY.md created with all required sections
    status: pending
    test: "test -f SECURITY.md && grep -q 'Reporting' SECURITY.md"
  
  - id: ac-2
    description: Dependabot config validates
    status: pending
    test: "npx arela validate .github/dependabot.yml"

files:
  - path: SECURITY.md
    action: create
  - path: .github/dependabot.yml
    action: create

dependencies: []

tags:
  - security
  - compliance
  - quick-win
```

## Files to Create/Modify

- `src/ticket-parser.ts` - New module for parsing both formats
- `src/ticket-schema.ts` - JSON schema for YAML validation
- `src/ticket-migrator.ts` - Migration tool
- `src/dispatch.ts` - Update to use new parser
- `src/cli.ts` - Add migrate command

## Testing

```bash
# Create YAML ticket
cat > .arela/tickets/TEST-001.yaml << EOF
id: TEST-001
title: Test ticket
agent: codex
priority: high
complexity: simple
EOF

# Validate
npx arela doctor

# Dispatch
npx arela dispatch --tickets TEST-001

# Migrate existing tickets
npx arela migrate tickets --to yaml --dry-run
```

## Dependencies

None

## Tags

- v2.0.0
- ticket-format
- automation
