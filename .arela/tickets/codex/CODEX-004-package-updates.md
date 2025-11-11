# CODEX-004: Update Package Dependencies and Version

**Agent:** codex  
**Priority:** high  
**Complexity:** simple  
**Status:** pending

## Context
Update package.json for v3.2.0 with Playwright dependency and version bump.

## Technical Task
Update `package.json`:
- Bump version to 3.2.0
- Add playwright dependency
- Update description if needed

## Acceptance Criteria
- [ ] Version is 3.2.0
- [ ] playwright: ^1.40.0 added to dependencies
- [ ] Package builds successfully
- [ ] No breaking changes to existing functionality

## Files to Modify
- `package.json`

## Changes Required
```json
{
  "name": "arela",
  "version": "3.2.0",
  "description": "AI-powered CTO with multi-agent orchestration and visual testing for blazing fast development.",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "commander": "^12.0.0",
    "execa": "^9.0.0",
    "fs-extra": "^11.2.0",
    "gray-matter": "^4.0.3",
    "glob": "^11.0.0",
    "ora": "^8.0.0",
    "picocolors": "^1.1.0",
    "playwright": "^1.40.0",
    "yaml": "^2.4.0",
    "zod": "^3.23.0"
  }
}
```

## Tests Required
- Run `npm run build` successfully
- Verify playwright installs correctly
- Test existing commands still work

## Report Required
- Summary of changes
- Confirmation package builds
- Confirmation existing functionality works
