# CLAUDE-002: Mobile Web Fallback for v3.3.1

**Agent:** claude  
**Priority:** high  
**Complexity:** medium  
**Status:** pending

## Context
When `arela run mobile` is executed but no simulator/emulator is available or Appium connection fails, we should gracefully fallback to testing the mobile app in a web browser with mobile viewport dimensions.

## The Problem
Currently, if Appium isn't running or no app is found, the mobile runner fails completely. This creates a poor user experience, especially for:
- Expo apps that run on web
- Quick testing without simulator setup
- CI/CD environments without simulators
- Developers who just want to see their app work

## The Solution
Add intelligent fallback to web testing with mobile viewport when Appium fails.

## Technical Task
Modify `src/run/mobile.ts` to:
1. Detect Appium connection failure
2. Check if app has web support (Expo apps, PWAs)
3. Fallback to Playwright with mobile viewport
4. Use appropriate mobile dimensions based on platform

## Acceptance Criteria
- [ ] Detects Appium connection failure gracefully
- [ ] Checks for web-capable apps (Expo, PWA)
- [ ] Falls back to Playwright with mobile viewport
- [ ] iOS fallback: iPhone dimensions (390x844)
- [ ] Android fallback: Pixel dimensions (412x915)
- [ ] Logs clear message about fallback mode
- [ ] Screenshots still captured
- [ ] Flow execution works identically
- [ ] User can force web mode with `--web-fallback` flag

## Implementation Details

### 1. Add Fallback Detection
```typescript
async function tryAppiumConnection(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:4723/status');
    return response.ok;
  } catch {
    return false;
  }
}
```

### 2. Modify runMobileApp
```typescript
export async function runMobileApp(opts: {
  platform: "ios" | "android";
  device?: string;
  flow: string;
  app?: string;
  webFallback?: boolean; // New option
}): Promise<TestResults> {
  // ... existing code ...
  
  try {
    // Check if Appium is available
    const appiumAvailable = await tryAppiumConnection();
    
    if (!appiumAvailable || opts.webFallback) {
      console.log(pc.yellow("⚠️  Appium not available, falling back to web mode"));
      console.log(pc.cyan("📱 Testing with mobile viewport in browser"));
      return await runMobileWebFallback(opts, flow);
    }
    
    // ... existing Appium code ...
  } catch (error) {
    // If Appium fails, try web fallback
    if (!opts.webFallback) {
      console.log(pc.yellow("⚠️  Mobile testing failed, trying web fallback..."));
      return await runMobileWebFallback(opts, flow);
    }
    throw error;
  }
}
```

### 3. Implement Web Fallback
```typescript
async function runMobileWebFallback(
  opts: { platform: "ios" | "android"; flow: string; app?: string },
  flow: Flow
): Promise<TestResults> {
  const { chromium } = await import("playwright");
  
  // Mobile viewport dimensions
  const viewport = opts.platform === "ios"
    ? { width: 390, height: 844 }  // iPhone 15 Pro
    : { width: 412, height: 915 }; // Pixel 7
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport,
    userAgent: opts.platform === "ios"
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
      : "Mozilla/5.0 (Linux; Android 13)",
    isMobile: true,
    hasTouch: true,
  });
  
  const page = await context.newPage();
  
  // Detect app URL (Expo default: localhost:8081)
  const appUrl = opts.app || "http://localhost:8081";
  
  try {
    await page.goto(appUrl);
    
    // Execute flow using Playwright
    const results = await executeFlowWithPlaywright(page, flow, opts.platform);
    return results;
  } finally {
    await browser.close();
  }
}
```

### 4. Update CLI
Add `--web-fallback` flag:
```typescript
.option("--web-fallback", "Force web fallback mode (mobile viewport in browser)", false)
```

## User Experience

**Before (v3.3.0):**
```bash
$ arela run mobile --flow test
❌ Test execution failed
No app found. Provide 'app' parameter or ensure Expo app is available
```

**After (v3.3.1):**
```bash
$ arela run mobile --flow test
⚠️  Appium not available, falling back to web mode
📱 Testing with mobile viewport in browser (iPhone 15 Pro: 390x844)
🌐 Starting mobile web testing at http://localhost:8081

🧪 Running user flow: test
  ✅ Navigated to http://localhost:8081/
  ✅ Captured screenshot (mobile viewport)
  
📊 Results:
  - 4 steps passed
  - Mode: Web fallback (mobile viewport)
  
💡 Tip: Install Appium for native mobile testing
```

## Edge Cases
- [ ] Handle case where web URL is also unavailable
- [ ] Detect if app is web-capable before fallback
- [ ] Provide clear instructions for native testing
- [ ] Allow custom viewport dimensions
- [ ] Support landscape orientation

## Files to Modify
- `src/run/mobile.ts` - Add fallback logic
- `src/cli.ts` - Add `--web-fallback` flag
- `src/types.ts` - Add webFallback to options

## Tests Required
- Test Appium connection detection
- Test web fallback with Expo app
- Test viewport dimensions (iOS and Android)
- Test flow execution in web fallback mode
- Test screenshots in fallback mode

## Documentation Updates
- README: Mention web fallback feature
- QUICKSTART: Add section on web fallback
- CHANGELOG: Document v3.3.1 changes

## Benefits
- ✅ Better user experience (no hard failures)
- ✅ Works without simulator setup
- ✅ Perfect for Expo apps
- ✅ Great for CI/CD
- ✅ Faster iteration (no simulator boot time)
- ✅ Still captures screenshots
- ✅ Same flow format

## Report Required
- Summary of implementation
- Confirmation of each acceptance criterion
- Test output showing fallback working
- Screenshots from both modes (Appium vs web)
- Performance comparison
