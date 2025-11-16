# Testing the Arela VS Code Extension

## 🚀 Quick Start

### 1. Build the Extension

```bash
# From the root of the monorepo
npm run build --workspace arela-extension
```

### 2. Open Extension in VS Code

```bash
# Open the extension folder
cd packages/extension
code .
```

### 3. Press F5

- This will:
  1. Build the extension (runs `npm run build`)
  2. Open a new "Extension Development Host" window
  3. Activate the Arela extension

### 4. Test the Extension

In the Extension Development Host window:

1. **Open Command Palette:**
   - macOS: `Cmd+Shift+P`
   - Windows/Linux: `Ctrl+Shift+P`

2. **Run Command:**
   - Type: `Arela: Open Chat`
   - Press Enter

3. **Verify:**
   - ✅ WebView panel opens in side column
   - ✅ Shows "Hello from Svelte!"
   - ✅ Button is clickable
   - ✅ Theme colors match VS Code theme

---

## 🐛 Expected Behavior (POC)

### What Works ✅

- ✅ Extension activates on startup
- ✅ Command "Arela: Open Chat" is registered
- ✅ WebView opens with Svelte UI
- ✅ UI is interactive (button click)
- ✅ Theme integration works

### What Doesn't Work Yet ⚠️

- ⚠️ **Server download will fail** (GitHub Releases don't exist yet)
  - This is expected until EXTENSION-017 (CI/CD) creates releases
  - Error message will show: "Failed to download Arela server binary"
  - This is graceful - extension still activates, just can't spawn server

- ⚠️ **Server won't spawn** (no binary available)
  - Expected until binaries are published
  - Status bar will show error state

- ⚠️ **Chat won't work** (no AI integration yet)
  - UI is just a placeholder
  - Real chat functionality comes in EXTENSION-011-014

---

## 🔍 Debugging

### View Extension Logs

1. **Output Channel:**
   - View → Output
   - Select "Arela Server" from dropdown

2. **Developer Console:**
   - Help → Toggle Developer Tools
   - Check Console tab for errors

3. **Extension Host Logs:**
   - View → Output
   - Select "Extension Host" from dropdown

### Common Issues

#### Issue: "Cannot find module 'vscode'"
**Fix:** Run `npm install` in `packages/extension`

#### Issue: "bundle.js not found"
**Fix:** Run `npm run build:webview` in `packages/extension`

#### Issue: Extension doesn't activate
**Fix:** Check `activationEvents` in `package.json` - should be `"onStartupFinished"`

#### Issue: WebView shows blank screen
**Fix:** 
1. Check browser console for CSP violations
2. Verify `out/webview/bundle.js` exists
3. Check `ChatProvider.getHtml()` for correct asset paths

---

## 🧪 Manual Testing Checklist

### Extension Activation
- [ ] Extension activates on VS Code startup
- [ ] No errors in Extension Host output
- [ ] Status bar shows "Arela: Starting..." then error (expected)

### Command Registration
- [ ] "Arela: Open Chat" appears in Command Palette
- [ ] Command executes without errors

### WebView
- [ ] Panel opens in side column
- [ ] Shows "Hello from Svelte!"
- [ ] Shows "Arela chat UI will go here."
- [ ] Shows "Click me" button

### Interactivity
- [ ] Button click changes text to "Button clicked!"
- [ ] No console errors
- [ ] No CSP violations

### Theme Integration
- [ ] Colors match VS Code theme
- [ ] Switch theme (dark/light) - colors update
- [ ] Font matches editor font

### Cleanup
- [ ] Close panel - no errors
- [ ] Reopen panel - singleton behavior (same panel)
- [ ] Reload window - extension reactivates

---

## 📊 What to Test Next

After EXTENSION-017 (CI/CD) creates releases:

1. **Server Download:**
   - [ ] Binary downloads on first activation
   - [ ] Progress notification shows
   - [ ] Checksum verification works
   - [ ] Binary is executable

2. **Server Lifecycle:**
   - [ ] Server spawns successfully
   - [ ] Status bar shows "Arela: Ready"
   - [ ] Health checks run every 30s
   - [ ] Server restarts on crash

3. **IPC Communication:**
   - [ ] Ping requests work
   - [ ] JSON-RPC responses parsed correctly
   - [ ] No zombie processes on deactivation

---

## 🎯 Current POC Status

**Completed (5/5):**
- ✅ EXTENSION-001: Monorepo Setup
- ✅ EXTENSION-002: Server IPC
- ✅ EXTENSION-003: Downloader Shim
- ✅ EXTENSION-004: Server Lifecycle
- ✅ EXTENSION-005: Svelte + WebView

**Next Steps:**
- 🔴 EXTENSION-006-010: UI Implementation
- 🔴 EXTENSION-011-014: AI Integration
- 🔴 EXTENSION-015-016: Context Management
- 🔴 EXTENSION-017-020: CI/CD & Publishing

---

## 🚀 Development Workflow

### Watch Mode (Recommended)

**Terminal 1 - Watch TypeScript:**
```bash
cd packages/extension
npm run watch
```

**Terminal 2 - Watch Webview:**
```bash
cd packages/extension
npm run watch:webview
```

**Then:** Press F5 to launch, and changes will recompile automatically.

**Note:** You'll need to reload the Extension Development Host window (Cmd+R / Ctrl+R) to see changes.

---

## 📝 Notes

- **No hot reload** - VS Code extensions require window reload after changes
- **Server binary** - Won't work until EXTENSION-017 publishes releases
- **Chat functionality** - Placeholder UI only, real chat in EXTENSION-011-014
- **This is a POC** - Foundation is complete, features come next

---

**Happy testing!** 🎉
