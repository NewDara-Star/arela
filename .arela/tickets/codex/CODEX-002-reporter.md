# CODEX-002: Test Results Reporter

**Agent:** codex  
**Priority:** high  
**Complexity:** simple  
**Status:** pending

## Context
Need a reporter to display test results in a clean, readable format with emojis and colors.

## Technical Task
Create `src/run/reporter.ts` with:
- `reportResults(results: TestResults)` - Format and display results
- Color-coded output (green for pass, red for fail, yellow for warning)
- Summary statistics
- Issue categorization
- Screenshot references

## Acceptance Criteria
- [ ] Displays test results with emojis and colors
- [ ] Shows pass/fail/warning counts
- [ ] Lists issues found with descriptions
- [ ] References screenshots if captured
- [ ] Clean, readable output format

## Files to Create
- `src/run/reporter.ts`

## Types Needed
```typescript
export interface TestStep {
  action: string;
  status: 'pass' | 'fail' | 'warning';
  message?: string;
  screenshot?: string;
}

export interface TestResults {
  flow: string;
  steps: TestStep[];
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
    suggestion?: string;
  }>;
  screenshots: string[];
}
```

## Dependencies
- picocolors (already in dependencies)

## Output Format
```
🌐 Starting web app testing...
📱 Launching browser at http://localhost:3000

🧪 Running user flow: signup
  ✅ Navigate to homepage
  ✅ Click "Sign Up"
  ❌ Email field not visible (z-index issue)
  ⚠️  Password strength indicator missing
  ✅ Form submits successfully

📊 Results:
  - 4 steps passed
  - 1 issue found
  - 1 warning

💡 Recommendations:
  1. Fix z-index on signup modal
  2. Add password strength indicator

📸 Screenshots saved to .arela/screenshots/
```

## Tests Required
- Unit tests for formatting
- Test with different result types
- Verify color output

## Report Required
- Summary of implementation
- Confirmation of each acceptance criterion
- Example output showing formatted results
