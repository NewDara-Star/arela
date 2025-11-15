# EXTENSION-001: Setup Monorepo Structure

**Category:** Foundation  
**Priority:** P0 (Blocking)  
**Estimated Time:** 4 hours  
**Assignee:** TBD  
**Status:** 🔴 Not Started

---

## Context

Create the monorepo structure for Arela v5.0.0 VS Code extension with two packages: `extension` (VS Code extension) and `server` (Node.js binary for native modules).

## Requirements

### Must Have
- [ ] Create `packages/extension/` directory
- [ ] Create `packages/server/` directory
- [ ] Setup root `package.json` with workspaces
- [ ] Configure TypeScript for both packages
- [ ] Setup shared dependencies
- [ ] Create `.gitignore` for extension artifacts

### Should Have
- [ ] Setup ESLint configuration
- [ ] Setup Prettier configuration
- [ ] Create README.md for each package

### Nice to Have
- [ ] Setup Husky pre-commit hooks
- [ ] Add VS Code workspace settings

## Acceptance Criteria

- [ ] `npm install` works from root
- [ ] Both packages compile with `npm run build`
- [ ] TypeScript strict mode enabled
- [ ] No compilation errors
- [ ] Directory structure matches architecture doc

## Technical Details

### Root package.json
```json
{
  "name": "arela-monorepo",
  "private": true,
  "workspaces": [
    "packages/extension",
    "packages/server"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "clean": "npm run clean --workspaces"
  }
}
```

### Directory Structure
```
arela/
├── packages/
│   ├── extension/
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── server/
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── package.json
└── tsconfig.base.json
```

### Extension package.json
```json
{
  "name": "arela-extension",
  "version": "5.0.0",
  "engines": {
    "vscode": "^1.85.0"
  },
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "arela.openChat",
        "title": "Arela: Open Chat"
      }
    ]
  }
}
```

### Server package.json
```json
{
  "name": "arela-server",
  "version": "5.0.0",
  "main": "./out/index.js",
  "dependencies": {
    "better-sqlite3": "^9.2.0",
    "tree-sitter": "^0.20.0"
  }
}
```

## Files to Create

- `packages/extension/package.json`
- `packages/extension/tsconfig.json`
- `packages/extension/src/extension.ts`
- `packages/server/package.json`
- `packages/server/tsconfig.json`
- `packages/server/src/index.ts`
- `tsconfig.base.json`
- `.gitignore` (update)

## Dependencies

None (first ticket)

## Testing

- [ ] Run `npm install` from root
- [ ] Run `npm run build` from root
- [ ] Verify `packages/extension/out/extension.js` exists
- [ ] Verify `packages/server/out/index.js` exists
- [ ] No TypeScript errors

## Documentation

Update `README.md` with:
- Monorepo structure explanation
- Build instructions
- Development workflow

## Notes

- Use npm workspaces (not Lerna or Yarn)
- Keep it simple - no complex build orchestration yet
- Extension should have `vscode` as engine, server should not
- Server will be packaged separately as standalone binary later

## Related

- Architecture Decision: Section 5.1
- File Structure: FINAL_ARCHITECTURE_SYNTHESIS.md
