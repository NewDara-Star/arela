# CLAUDE-001: Playwright Web Runner Integration

**Agent:** claude  
**Priority:** high  
**Complexity:** complex  
**Status:** pending

## Context
Build the core web testing runner using Playwright. This is the main feature for v3.2.0 that lets Arela actually use web apps like a real user.

## Technical Task
Create `src/run/web.ts` with:
- Playwright browser launch and management
- Flow execution engine (navigate, click, type, waitFor, screenshot)
- Error handling and recovery
- Screenshot capture with naming
- Result collection and analysis
- Integration with flow loader and reporter

## Acceptance Criteria
- [ ] Launches Playwright browser (Chromium)
- [ ] Executes all flow actions (navigate, click, type, waitFor, screenshot)
- [ ] Captures screenshots on demand and on errors
- [ ] Handles errors gracefully with retry logic
- [ ] Collects results for reporting
- [ ] Supports headless and headed modes
- [ ] Cleans up browser resources properly

## Files to Create
- `src/run/web.ts`

## Key Functions
```typescript
export async function runWebApp(opts: {
  url: string;
  flow: string;
  headless: boolean;
  record?: boolean;
}): Promise<TestResults>;

async function executeFlow(
  page: Page, 
  flow: Flow
): Promise<TestResults>;

async function executeStep(
  page: Page, 
  step: FlowStep
): Promise<TestStep>;
```

## Flow Actions to Implement
1. **navigate** - Go to URL (page.goto)
2. **click** - Click element by selector (page.click)
3. **type** - Type into input (page.fill)
4. **waitFor** - Wait for element (page.waitForSelector)
5. **screenshot** - Capture screenshot (page.screenshot)

## Error Handling
- Retry failed actions (max 3 attempts)
- Capture screenshot on failure
- Continue flow execution when possible
- Collect all errors for reporting

## Screenshot Management
- Save to `.arela/screenshots/`
- Name format: `{flow}-{step}-{timestamp}.png`
- Reference in results

## Dependencies
- playwright: ^1.40.0 (add to package.json)

## Integration Points
- Use `loadFlow()` from flows.ts
- Use `reportResults()` from reporter.ts
- Called from CLI command

## Tests Required
- Integration tests with real browser
- Test each flow action type
- Test error handling and recovery
- Test screenshot capture

## Report Required
- Summary of implementation
- Confirmation of each acceptance criterion
- Test output showing successful flow execution
- Example screenshots captured
