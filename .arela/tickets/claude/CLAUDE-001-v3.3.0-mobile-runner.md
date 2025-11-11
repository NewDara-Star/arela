# CLAUDE-001: Mobile Runner with Appium

**Agent:** claude  
**Priority:** high  
**Complexity:** complex  
**Status:** pending  
**Depends on:** CODEX-001

## Context
Build the mobile testing runner using Appium for iOS/Android apps. Similar to the Playwright web runner, but for mobile simulators/emulators.

## Technical Task
Create `src/run/mobile.ts` with:
- Appium/WebDriverIO integration
- iOS simulator support (XCUITest driver)
- Android emulator support (UIAutomator2 driver)
- Flow execution engine (reuse from flows.ts)
- Screenshot capture for mobile
- Result collection and reporting
- Expo app detection and handling

## Acceptance Criteria
- [ ] Launches Appium with correct capabilities
- [ ] Connects to iOS simulator or Android emulator
- [ ] Executes all flow actions (navigate, click, type, waitFor, screenshot)
- [ ] Captures screenshots on demand and on errors
- [ ] Handles errors gracefully with retry logic
- [ ] Collects results for reporting
- [ ] Supports both iOS and Android platforms
- [ ] Cleans up Appium session properly

## Files to Create
- `src/run/mobile.ts`

## Key Functions
```typescript
export async function runMobileApp(opts: {
  platform: "ios" | "android";
  device?: string;
  flow: string;
  app?: string;  // Path to .app or .apk, or auto-detect Expo
}): Promise<void>;

async function executeFlow(
  driver: WebdriverIO.Browser,
  flow: Flow
): Promise<TestResults>;

async function executeStep(
  driver: WebdriverIO.Browser,
  step: FlowStep,
  platform: "ios" | "android"
): Promise<TestStep>;
```

## Flow Actions to Implement
1. **navigate** - Navigate to screen/deep link
2. **click** - Tap element by accessibility ID or XPath
3. **type** - Type into input field
4. **waitFor** - Wait for element to appear
5. **screenshot** - Capture screenshot
6. **swipe** - Swipe gesture (mobile-specific)

## Platform-Specific Handling
**iOS (XCUITest):**
- Use accessibility IDs for selectors
- Handle iOS-specific gestures
- Screenshot format: PNG

**Android (UIAutomator2):**
- Use resource IDs or XPath
- Handle Android-specific gestures
- Screenshot format: PNG

## Expo Detection
```typescript
// Auto-detect Expo app
async function findExpoApp(platform: "ios" | "android"): Promise<string> {
  // Check for .expo directory
  // Look for app.json
  // Return path to built app
}
```

## Error Handling
- Retry failed actions (max 3 attempts)
- Capture screenshot on failure
- Continue flow execution when possible
- Collect all errors for reporting

## Screenshot Management
- Save to `.arela/screenshots/mobile/`
- Name format: `{flow}-{platform}-{step}-{timestamp}.png`
- Reference in results

## Dependencies
- appium: ^2.0.0
- appium-xcuitest-driver: ^5.0.0
- appium-uiautomator2-driver: ^3.0.0
- webdriverio: ^8.0.0

## Integration Points
- Use `loadFlow()` from flows.ts
- Use `reportResults()` from reporter.ts
- Called from CLI command

## Tests Required
- Integration tests with iOS simulator
- Integration tests with Android emulator
- Test each flow action type
- Test error handling and recovery
- Test screenshot capture
- Test Expo app detection

## Report Required
- Summary of implementation
- Confirmation of each acceptance criterion
- Test output showing successful flow execution on both platforms
- Example screenshots captured
