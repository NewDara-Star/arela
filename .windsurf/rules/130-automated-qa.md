---
id: arela.automated_qa
title: Automated QA Testing
category: testing
severity: should
version: 1.0.0
---

# Automated QA Testing

## Principle

**Manual QA is slow, expensive, and error-prone.** Automate browser testing with AI-powered tools to ship faster with confidence.

## The Problem

Traditional QA approaches:

**Manual QA:**
- ❌ Slow (hours per release)
- ❌ Expensive (dedicated QA team)
- ❌ Inconsistent (human error)
- ❌ Doesn't scale

**Traditional E2E (Selenium/Playwright):**
- ❌ Brittle (breaks on UI changes)
- ❌ High maintenance (constant fixing)
- ❌ Slow to write (requires code)
- ❌ Flaky (timing issues)

## The Solution: AI-Powered Browser Automation

**Use natural language to test:**
- ✅ Fast (minutes per release)
- ✅ Cheap (no QA team needed)
- ✅ Consistent (same test every time)
- ✅ Scales infinitely
- ✅ Self-healing (adapts to UI changes)

## Tools

### Primary: Stagehand + Claude

**Stagehand:** AI browser automation framework
- Natural language instructions
- More context-efficient than Playwright
- Self-healing selectors
- Built for AI agents

**Claude Code Plugin:**
```bash
/plugin marketplace add browserbase/agent-browse
/plugin install browser-automation@browser-tools
```

**Usage:**
```
"QA test http://localhost:3000 and fix any bugs"
"Test the checkout flow end-to-end"
"Verify signup works with invalid email"
```

### Alternative: Playwright with AI

For projects already using Playwright:
- Use Playwright + GPT-4 Vision for assertions
- Keep existing test infrastructure
- Add AI-powered visual validation

## Testing Levels

### Level 1: Smoke Tests (Critical Paths)

**Run on:** Every deploy
**Duration:** < 5 minutes
**Coverage:** Core user journeys

**Examples:**
- User can sign up
- User can log in
- User can create a post
- User can checkout

**Implementation:**
```typescript
// Natural language with Stagehand
"Test the signup flow:
1. Go to /signup
2. Fill in email, password
3. Click submit
4. Verify dashboard loads"
```

### Level 2: Feature Tests (New Features)

**Run on:** Feature branches
**Duration:** < 15 minutes
**Coverage:** New functionality

**Examples:**
- New payment method works
- New dashboard widget displays correctly
- New API integration functions

**Implementation:**
```typescript
"Test the new payment flow:
1. Add item to cart
2. Go to checkout
3. Select 'Pay with Apple Pay'
4. Complete payment
5. Verify order confirmation"
```

### Level 3: Regression Tests (Full Suite)

**Run on:** Nightly or weekly
**Duration:** < 1 hour
**Coverage:** All features

**Examples:**
- All user flows
- All edge cases
- All error states
- All integrations

## Test Scenarios

### Happy Path

**What:** User completes flow successfully

**Example:**
```
Test: User signs up successfully
1. Navigate to /signup
2. Enter valid email: test@example.com
3. Enter valid password: SecurePass123!
4. Click "Sign Up"
5. Verify: Redirected to /dashboard
6. Verify: Welcome message displays
7. Verify: User email shows in header
```

### Error Handling

**What:** User encounters errors gracefully

**Example:**
```
Test: Signup with invalid email
1. Navigate to /signup
2. Enter invalid email: notanemail
3. Enter valid password: SecurePass123!
4. Click "Sign Up"
5. Verify: Error message "Invalid email format"
6. Verify: Form does not submit
7. Verify: User stays on /signup
```

### Edge Cases

**What:** Unusual but valid scenarios

**Example:**
```
Test: Signup with very long name
1. Navigate to /signup
2. Enter email: test@example.com
3. Enter name: [300 character string]
4. Enter password: SecurePass123!
5. Click "Sign Up"
6. Verify: Name is truncated or error shown
7. Verify: System doesn't crash
```

### Cross-Browser

**What:** Works on all major browsers

**Example:**
```
Test: Checkout on Safari, Chrome, Firefox
1. Run checkout flow on each browser
2. Verify: Same behavior
3. Verify: No browser-specific bugs
4. Verify: UI renders correctly
```

## Integration with CI/CD

### GitHub Actions

```yaml
name: QA Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  qa-smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start app
        run: npm run dev &
        
      - name: Wait for app
        run: npx wait-on http://localhost:3000
      
      - name: Run smoke tests
        run: npm run test:qa:smoke
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: qa-screenshots
          path: screenshots/

  qa-full:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Run full test suite
        run: npm run test:qa:full
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Pre-deployment Gate

```yaml
deploy:
  needs: [qa-smoke]
  runs-on: ubuntu-latest
  steps:
    - name: Deploy to production
      if: success()
      run: npm run deploy
```

## Test Organization

### Directory Structure

```
tests/
├── qa/
│   ├── smoke/
│   │   ├── auth.test.ts
│   │   ├── checkout.test.ts
│   │   └── dashboard.test.ts
│   ├── features/
│   │   ├── payments.test.ts
│   │   ├── social.test.ts
│   │   └── admin.test.ts
│   ├── regression/
│   │   ├── all-flows.test.ts
│   │   └── edge-cases.test.ts
│   └── helpers/
│       ├── setup.ts
│       └── assertions.ts
└── screenshots/
    └── [auto-generated]
```

### Test Template

```typescript
// tests/qa/smoke/auth.test.ts
import { test, expect } from '@playwright/test';
import { stagehand } from './helpers/setup';

test.describe('Authentication', () => {
  test('user can sign up', async ({ page }) => {
    await stagehand(page, `
      Test the signup flow:
      1. Go to http://localhost:3000/signup
      2. Fill in email: test-${Date.now()}@example.com
      3. Fill in password: SecurePass123!
      4. Click the "Sign Up" button
      5. Wait for redirect to dashboard
      6. Verify "Welcome" message appears
    `);
    
    // Additional assertions
    expect(page.url()).toContain('/dashboard');
  });
  
  test('signup fails with invalid email', async ({ page }) => {
    await stagehand(page, `
      Test signup error handling:
      1. Go to http://localhost:3000/signup
      2. Fill in email: notanemail
      3. Fill in password: SecurePass123!
      4. Click "Sign Up"
      5. Verify error message appears
      6. Verify form does not submit
    `);
    
    expect(page.url()).toContain('/signup');
  });
});
```

## Visual Regression Testing

### Screenshot Comparison

```typescript
test('dashboard layout unchanged', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard');
  
  // Take screenshot
  await page.screenshot({ 
    path: 'screenshots/dashboard.png',
    fullPage: true 
  });
  
  // Compare with baseline
  expect(await page.screenshot()).toMatchSnapshot('dashboard.png');
});
```

### AI-Powered Visual QA

```typescript
test('dashboard looks correct', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard');
  
  await stagehand(page, `
    Verify the dashboard:
    1. Check that all widgets are visible
    2. Verify no layout issues
    3. Confirm colors match design system
    4. Check for any visual bugs
    5. Report any inconsistencies
  `);
});
```

## Performance Testing

### Load Time Assertions

```typescript
test('page loads in < 3 seconds', async ({ page }) => {
  const start = Date.now();
  await page.goto('http://localhost:3000');
  const loadTime = Date.now() - start;
  
  expect(loadTime).toBeLessThan(3000);
});
```

### Core Web Vitals

```typescript
test('meets Core Web Vitals', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  const metrics = await page.evaluate(() => {
    return {
      lcp: performance.getEntriesByType('largest-contentful-paint')[0],
      fid: performance.getEntriesByType('first-input')[0],
      cls: performance.getEntriesByType('layout-shift')
    };
  });
  
  expect(metrics.lcp.renderTime).toBeLessThan(2500);
});
```

## Accessibility Testing

### Automated A11y Checks

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('page is accessible', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await injectAxe(page);
  await checkA11y(page);
});
```

### Keyboard Navigation

```typescript
test('can navigate with keyboard', async ({ page }) => {
  await stagehand(page, `
    Test keyboard navigation:
    1. Go to http://localhost:3000
    2. Press Tab to navigate through elements
    3. Verify all interactive elements are reachable
    4. Press Enter on buttons to activate
    5. Verify no keyboard traps
  `);
});
```

## Mobile Testing

### Responsive Design

```typescript
test('works on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  
  await stagehand(page, `
    Test mobile experience:
    1. Go to http://localhost:3000
    2. Verify menu is hamburger icon
    3. Tap hamburger to open menu
    4. Verify all links work
    5. Test signup flow on mobile
  `);
});
```

## Security Testing

### XSS Prevention

```typescript
test('prevents XSS attacks', async ({ page }) => {
  await stagehand(page, `
    Test XSS prevention:
    1. Go to signup page
    2. Enter <script>alert('xss')</script> in name field
    3. Submit form
    4. Verify script does not execute
    5. Verify input is escaped
  `);
});
```

### CSRF Protection

```typescript
test('has CSRF protection', async ({ page }) => {
  await page.goto('http://localhost:3000/profile');
  
  const csrfToken = await page.locator('[name="csrf_token"]').inputValue();
  expect(csrfToken).toBeTruthy();
});
```

## Monitoring & Reporting

### Test Results Dashboard

```typescript
// Generate HTML report
import { Reporter } from '@playwright/test/reporter';

class CustomReporter implements Reporter {
  onTestEnd(test, result) {
    console.log(`${test.title}: ${result.status}`);
    
    if (result.status === 'failed') {
      // Send to Slack
      // Log to monitoring
      // Create GitHub issue
    }
  }
}
```

### Slack Notifications

```typescript
// On test failure
await fetch(process.env.SLACK_WEBHOOK, {
  method: 'POST',
  body: JSON.stringify({
    text: `🚨 QA Test Failed: ${test.title}`,
    attachments: [{
      color: 'danger',
      fields: [
        { title: 'Test', value: test.title },
        { title: 'Error', value: error.message },
        { title: 'Screenshot', value: screenshotUrl }
      ]
    }]
  })
});
```

## Best Practices

### Do's

✅ **Test critical paths first** - Signup, login, checkout
✅ **Use realistic data** - Real emails, addresses, credit cards (test mode)
✅ **Test error states** - Invalid inputs, network failures
✅ **Run on every PR** - Catch bugs before merge
✅ **Keep tests independent** - No shared state
✅ **Use page objects** - Reusable components
✅ **Take screenshots on failure** - Debug faster

### Don'ts

❌ **Don't test everything** - Focus on high-value flows
❌ **Don't hardcode selectors** - Use AI or data-testid
❌ **Don't skip cleanup** - Reset DB between tests
❌ **Don't ignore flaky tests** - Fix or delete them
❌ **Don't test third-party services** - Mock them
❌ **Don't run tests serially** - Parallelize

## Metrics

Track monthly:

- **Test Coverage:** % of user flows tested
- **Test Execution Time:** Minutes per run
- **Flaky Test Rate:** % of tests that fail intermittently
- **Bug Detection Rate:** % of bugs caught by QA
- **False Positive Rate:** % of test failures that aren't real bugs

**Healthy targets:**
- Test Coverage: > 80% of critical paths
- Execution Time: < 15 minutes (smoke), < 1 hour (full)
- Flaky Test Rate: < 5%
- Bug Detection Rate: > 90%
- False Positive Rate: < 10%

## Cost Analysis

### Traditional QA Team

- **QA Engineer:** $80K/year
- **Time per release:** 4 hours
- **Releases per month:** 20
- **Total time:** 80 hours/month
- **Cost:** ~$6,700/month

### Automated QA

- **Setup time:** 40 hours (one-time)
- **Maintenance:** 4 hours/month
- **Anthropic API:** ~$50/month
- **CI/CD compute:** ~$100/month
- **Total cost:** ~$150/month

**Savings:** $6,550/month (98% reduction)

## Summary

**Automated QA means:**
- Test every PR automatically
- Catch bugs before production
- Ship with confidence
- No QA team needed
- 98% cost savings

**The goal:** Zero manual QA. 100% automated coverage of critical paths.

**Fast tests = fast shipping = competitive advantage.**
