# Auto-Update System

**Version:** v4.1.0+  
**Status:** ✅ Active

---

## How It Works

### Automatic Check (Non-blocking)

Every time you run ANY `arela` command:

1. **Background check** - Queries npm registry for latest version (3s timeout)
2. **Compare versions** - Semantic version comparison
3. **Show notification** - If newer version exists

**Example:**
```bash
$ arela agents

┌─────────────────────────────────────────────┐
│  📦 Update available!                      │
│                                            │
│  4.0.2 → 4.1.0                             │
│                                            │
│  Run: npm install -g arela@latest          │
└─────────────────────────────────────────────┘

Discovering AI agents...
```

### Manual Check

```bash
arela update
```

**Output:**
```
🔍 Checking for updates...

┌─────────────────────────────────────────────┐
│  📦 Update available!                      │
│                                            │
│  4.0.2 → 4.1.0                             │
│                                            │
│  Run: npm install -g arela@latest          │
└─────────────────────────────────────────────┘
```

Or if you're up to date:
```
🔍 Checking for updates...

✅ You're on the latest version!
   Current: 4.1.0
```

---

## Installation

### Global Install (Recommended)

```bash
npm install -g arela
```

**Benefits:**
- ✅ Use `arela` command anywhere
- ✅ Auto-update notifications
- ✅ One-command updates

### Update to Latest

```bash
npm install -g arela@latest
```

### Update to Specific Version

```bash
npm install -g arela@4.1.0
```

---

## Features

### Non-blocking
- Update check runs in background
- Doesn't slow down commands
- 3-second timeout (fails silently if npm is slow)

### Smart Notifications
- Only shows if newer version exists
- Shows current → latest version
- Provides exact update command

### Semantic Versioning
- Compares major.minor.patch
- Handles pre-release versions
- Accurate version comparison

---

## Implementation

### Update Checker (`src/utils/update-checker.ts`)

```typescript
import { checkForUpdatesAsync } from "./utils/update-checker.js";

// In CLI startup
checkForUpdatesAsync(VERSION);
```

**Functions:**
- `checkForUpdatesAsync(version)` - Background check (non-blocking)
- `forceUpdateCheck(version)` - Manual check (blocking)
- `isNewerVersion(latest, current)` - Semantic version comparison
- `showUpdateNotification(current, latest)` - Pretty notification

---

## Configuration

### Disable Update Checks

Set environment variable:
```bash
export ARELA_NO_UPDATE_CHECK=1
```

Or in `.env`:
```
ARELA_NO_UPDATE_CHECK=1
```

### Custom Update Server

For enterprise/private npm registries:
```bash
export NPM_REGISTRY=https://your-registry.com
```

---

## User Experience

### First Install
```bash
npm install -g arela
arela agents
# No update notification (you're on latest)
```

### After New Release
```bash
arela agents

┌─────────────────────────────────────────────┐
│  📦 Update available!                      │
│                                            │
│  4.0.2 → 4.1.0                             │
│                                            │
│  Run: npm install -g arela@latest          │
└─────────────────────────────────────────────┘

# User updates
npm install -g arela@latest

# No more notifications
arela agents
# Discovering AI agents...
```

---

## Why This Matters

### For Users
- ✅ Always know when updates are available
- ✅ One command to update
- ✅ Never miss new features
- ✅ Stay secure (security patches)

### For Arela
- ✅ Users stay up to date
- ✅ Fewer support issues (old versions)
- ✅ Faster feature adoption
- ✅ Better user experience

---

## Comparison

### Before (v4.0.x)
```bash
arela agents
# No update notification
# User doesn't know v4.1.0 exists
# Stays on old version forever
```

### After (v4.1.0+)
```bash
arela agents

📦 Update available! 4.0.2 → 4.1.0
Run: npm install -g arela@latest

# User updates immediately
npm install -g arela@latest
```

---

## Technical Details

### Version Check Flow

```
User runs: arela agents
    ↓
CLI starts (src/cli.ts)
    ↓
checkForUpdatesAsync(VERSION)
    ↓
[Background] npm view arela version
    ↓
Compare: latest vs current
    ↓
If newer: showUpdateNotification()
    ↓
Continue with command
```

### Timeout Handling

```typescript
const { stdout } = await execAsync("npm view arela version", {
  timeout: 3000, // 3 second timeout
});
```

**If timeout:**
- Silently fail
- Don't block command
- User doesn't see error

**If network error:**
- Silently fail
- Don't block command
- User doesn't see error

---

## Future Enhancements

### v4.2.0
- [ ] Cache update check (once per day)
- [ ] Show changelog on update
- [ ] Auto-install option (with confirmation)

### v4.3.0
- [ ] Update via `arela update --install`
- [ ] Rollback to previous version
- [ ] Version history

---

## Summary

✅ **Auto-update system is live!**

**Every `arela` command:**
- Checks for updates (background, non-blocking)
- Shows notification if newer version exists
- Provides one-command update

**Manual check:**
```bash
arela update
```

**Update command:**
```bash
npm install -g arela@latest
```

**Simple. Fast. User-friendly.** 🚀
