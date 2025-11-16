# EXTENSION-016: VS Code Marketplace Publishing

**Category:** CI/CD  
**Priority:** P1  
**Estimated Time:** 4h  
**Agent:** @codex  
**Status:** 🔴 Not Started

---

## Context

The extension needs to be published to the VS Code Marketplace so users can install it easily. This requires:
- Publisher account
- Marketplace listing
- Screenshots and description
- Automated publishing via CI

**Current state:**
- ✅ Extension builds
- ✅ VSIX packages
- ❌ Not published to marketplace
- ❌ No marketplace listing

**Goal:** Publish extension to VS Code Marketplace with beautiful listing.

---

## Requirements

### Must Have
- [ ] Create publisher account
- [ ] Configure vsce
- [ ] Create marketplace listing
- [ ] Add screenshots
- [ ] Write description
- [ ] Publish extension
- [ ] Automated publishing in CI

### Should Have
- [ ] Demo GIF
- [ ] Feature highlights
- [ ] Installation instructions
- [ ] Changelog
- [ ] Support links

### Nice to Have
- [ ] Video demo
- [ ] User testimonials
- [ ] Comparison with alternatives

---

## Acceptance Criteria

- [ ] Extension published to marketplace
- [ ] Listing has screenshots
- [ ] Description is clear and compelling
- [ ] Installation works via marketplace
- [ ] Updates publish automatically
- [ ] Changelog visible in marketplace

---

## Technical Details

### 1. Publisher Setup

```bash
# Create publisher account
# Go to: https://marketplace.visualstudio.com/manage

# Login with Microsoft account
# Create publisher ID: "arela" or "arela-ai"

# Generate Personal Access Token (PAT)
# Scopes: Marketplace (Manage)
```

### 2. Package.json Configuration

```json
// packages/extension/package.json

{
  "name": "arela",
  "displayName": "Arela - AI CTO Assistant",
  "description": "Your AI pair programmer with full codebase context",
  "version": "5.0.0",
  "publisher": "arela",
  "icon": "resources/icon.png",
  "galleryBanner": {
    "color": "#1e1e1e",
    "theme": "dark"
  },
  "categories": [
    "Programming Languages",
    "Machine Learning",
    "Other"
  ],
  "keywords": [
    "ai",
    "assistant",
    "copilot",
    "chat",
    "gpt",
    "claude",
    "coding",
    "pair programming"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/arela"
  },
  "bugs": {
    "url": "https://github.com/yourusername/arela/issues"
  },
  "homepage": "https://github.com/yourusername/arela#readme",
  "license": "MIT",
  "qna": "marketplace"
}
```

### 3. README for Marketplace

```markdown
<!-- packages/extension/README.md -->

# Arela - AI CTO Assistant

Your AI pair programmer with full codebase context, powered by GPT-4, Claude, and local models.

## Features

### 💬 Intelligent Chat
- Stream responses token-by-token
- Markdown rendering with syntax highlighting
- Stop generation anytime

### 📎 Rich Context
- Attach files to your questions
- @ mention files in your workspace
- Automatic code selection context
- Full workspace awareness

### 🤖 Multiple AI Providers
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3.5, Claude 3)
- Ollama (Local models, free!)

### ⚡ Fast & Efficient
- Native server for speed
- Minimal bundle size
- Works offline with Ollama

## Installation

1. Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=arela.arela)
2. Open Command Palette (`Cmd+Shift+P`)
3. Run "Arela: Open Settings"
4. Add your API key
5. Start chatting! (`Cmd+Shift+A`)

## Usage

### Quick Start
1. Select code in your editor
2. Press `Cmd+Shift+A` to open Arela
3. Ask: "Explain this code"
4. Get instant AI-powered answers!

### Attach Files
1. Click 📎 button in chat
2. Select files to attach
3. Ask questions about them

### @ Mentions
1. Type `@` in chat
2. Select files from your workspace
3. AI will reference them

## Screenshots

![Chat Interface](https://raw.githubusercontent.com/yourusername/arela/main/docs/screenshots/chat.png)
![Code Selection](https://raw.githubusercontent.com/yourusername/arela/main/docs/screenshots/selection.png)
![Settings](https://raw.githubusercontent.com/yourusername/arela/main/docs/screenshots/settings.png)

## Requirements

- VS Code 1.85.0 or higher
- Node.js 20+ (for local server)
- API key for OpenAI or Anthropic (or use Ollama for free)

## Extension Settings

- `arela.provider`: AI provider (openai, anthropic, ollama)
- `arela.model`: AI model to use
- `arela.openai.apiKey`: OpenAI API key
- `arela.anthropic.apiKey`: Anthropic API key
- `arela.ollama.enabled`: Enable Ollama
- `arela.ollama.baseUrl`: Ollama server URL

## Known Issues

- Large file attachments may be slow
- Ollama requires local installation

## Release Notes

### 5.0.0
- Initial release
- Chat interface with streaming
- Multiple AI providers
- Code selection context
- File attachments
- @ mentions

## Contributing

Contributions welcome! See [CONTRIBUTING.md](https://github.com/yourusername/arela/blob/main/CONTRIBUTING.md)

## License

MIT
```

### 4. Publishing Script

```bash
# scripts/publish.sh

#!/bin/bash
set -e

# Check if logged in
npx @vscode/vsce ls-publishers

# Package
cd packages/extension
npx @vscode/vsce package

# Publish
npx @vscode/vsce publish -p $VSCE_TOKEN

echo "Published successfully!"
```

### 5. CI Integration

```yaml
# .github/workflows/publish.yml

name: Publish to Marketplace

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build --workspace arela-extension
      
      - name: Publish
        run: |
          cd packages/extension
          npx @vscode/vsce publish -p ${{ secrets.VSCE_TOKEN }}
```

---

## Testing

1. **Test package:**
   - Run `npx @vscode/vsce package`
   - Install .vsix locally
   - Verify works

2. **Test publish:**
   - Publish to test publisher
   - Install from marketplace
   - Verify all features work

3. **Test updates:**
   - Bump version
   - Publish update
   - Verify auto-update works

---

## Checklist

- [ ] Create publisher account
- [ ] Generate PAT token
- [ ] Add token to GitHub secrets
- [ ] Create icon (128x128 PNG)
- [ ] Take screenshots
- [ ] Write README
- [ ] Configure package.json
- [ ] Test package locally
- [ ] Publish to marketplace
- [ ] Verify listing looks good
- [ ] Test installation
- [ ] Set up CI publishing

---

**Build this to ship to users!** 📦
