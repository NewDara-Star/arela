# EXTENSION-015: GitHub Actions CI/CD

**Category:** CI/CD  
**Priority:** P1  
**Estimated Time:** 6h  
**Agent:** @claude  
**Status:** 🔴 Not Started

---

## Context

The extension needs automated builds and releases for all platforms. GitHub Actions will:
- Build server binaries for all platforms
- Package extension as VSIX
- Run tests
- Create GitHub releases
- Publish to VS Code Marketplace

**Current state:**
- ✅ Extension builds locally
- ✅ Server builds locally
- ❌ No CI/CD pipeline
- ❌ No automated releases

**Goal:** Full CI/CD pipeline with matrix builds.

---

## Requirements

### Must Have
- [ ] GitHub Actions workflow
- [ ] Matrix builds for all platforms:
  - darwin-x64, darwin-arm64
  - win32-x64, win32-arm64
  - linux-x64, linux-arm64
- [ ] Build server binaries
- [ ] Package VSIX
- [ ] Run tests
- [ ] Create GitHub releases
- [ ] Upload binaries to releases

### Should Have
- [ ] Automated version bumping
- [ ] Changelog generation
- [ ] Release notes
- [ ] Marketplace publishing

### Nice to Have
- [ ] Performance benchmarks
- [ ] Bundle size tracking
- [ ] Security scanning

---

## Acceptance Criteria

- [ ] Push to main triggers build
- [ ] All platforms build successfully
- [ ] Tests run and pass
- [ ] VSIX created
- [ ] GitHub release created on tag
- [ ] Binaries attached to release
- [ ] SHA-256 checksums generated

---

## Technical Details

### 1. GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml

name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  release:
    types: [created]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Build
        run: npm run build
      
      - name: Test
        run: npm test

  build-server:
    needs: test
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          # macOS
          - os: macos-latest
            target: darwin-x64
            node: 20
          - os: macos-latest
            target: darwin-arm64
            node: 20
          
          # Windows
          - os: windows-latest
            target: win32-x64
            node: 20
          - os: windows-latest
            target: win32-arm64
            node: 20
          
          # Linux
          - os: ubuntu-latest
            target: linux-x64
            node: 20
          - os: ubuntu-latest
            target: linux-arm64
            node: 20
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build server
        run: npm run build --workspace arela-server
      
      - name: Package binary
        run: |
          cd packages/server
          npx pkg . --targets node20-${{ matrix.target }} --output ../../dist/arela-server-${{ matrix.target }}
      
      - name: Generate checksum
        run: |
          cd dist
          shasum -a 256 arela-server-${{ matrix.target }} > arela-server-${{ matrix.target }}.sha256
      
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: arela-server-${{ matrix.target }}
          path: |
            dist/arela-server-${{ matrix.target }}
            dist/arela-server-${{ matrix.target }}.sha256

  build-extension:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build extension
        run: npm run build --workspace arela-extension
      
      - name: Package VSIX
        run: |
          cd packages/extension
          npx @vscode/vsce package
      
      - name: Upload VSIX
        uses: actions/upload-artifact@v4
        with:
          name: vsix
          path: packages/extension/*.vsix

  release:
    if: github.event_name == 'release'
    needs: [build-server, build-extension]
    runs-on: ubuntu-latest
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
      
      - name: Upload to release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            arela-server-*/*
            vsix/*.vsix
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  
  publish:
    if: github.event_name == 'release'
    needs: release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Download VSIX
        uses: actions/download-artifact@v4
        with:
          name: vsix
      
      - name: Publish to Marketplace
        run: npx @vscode/vsce publish -p ${{ secrets.VSCE_TOKEN }}
```

### 2. Package Binary Configuration

```json
// packages/server/package.json

{
  "bin": "out/index.js",
  "pkg": {
    "targets": [
      "node20-darwin-x64",
      "node20-darwin-arm64",
      "node20-win-x64",
      "node20-win-arm64",
      "node20-linux-x64",
      "node20-linux-arm64"
    ],
    "outputPath": "dist",
    "assets": [
      "node_modules/**/*"
    ]
  }
}
```

### 3. Version Management

```bash
# scripts/bump-version.sh

#!/bin/bash
set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./bump-version.sh <version>"
  exit 1
fi

# Update package.json files
npm version $VERSION --workspace arela-server --no-git-tag-version
npm version $VERSION --workspace arela-extension --no-git-tag-version

# Update extension manifest
cd packages/extension
jq ".version = \"$VERSION\"" package.json > package.json.tmp
mv package.json.tmp package.json

# Commit and tag
git add .
git commit -m "chore: bump version to $VERSION"
git tag "v$VERSION"

echo "Version bumped to $VERSION"
echo "Push with: git push && git push --tags"
```

---

## Testing

1. **Test CI:**
   - Push to branch
   - Verify workflow runs
   - Check all jobs pass

2. **Test release:**
   - Create tag: `git tag v5.0.0`
   - Push tag: `git push --tags`
   - Verify release created
   - Verify binaries attached

3. **Test binaries:**
   - Download from release
   - Test on each platform
   - Verify checksums

---

**Build this for automated releases!** 🚀
