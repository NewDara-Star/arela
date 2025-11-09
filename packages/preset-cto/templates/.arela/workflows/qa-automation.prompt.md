---
id: arela.qa_automation
title: QA Automation Workflow
category: testing
version: 1.0.0
---

# QA Automation Workflow

## Purpose

Systematically test web applications using AI-powered browser automation. Catch bugs before they reach production.

## When to Use

- Before every deploy
- On every pull request
- After every feature completion
- During regression testing
- For exploratory testing

## Prerequisites

### 1. Install Browser Automation

**For Claude Code:**
```bash
/plugin marketplace add browserbase/agent-browse
/plugin install browser-automation@browser-tools
```

**For Playwright:**
```bash
npm install -D @playwright/test
npx playwright install
```

### 2. Set API Key

```bash
export ANTHROPIC_API_KEY="your-api-key"
```

### 3. Start Application

```bash
npm run dev
# App running on http://localhost:3000
```

## Workflow Steps

### Step 1: Define Test Scenarios

**Template:**
```markdown
## Test: [Feature Name]

**Priority:** Critical | High | Medium | Low
**Type:** Smoke | Feature | Regression
**Duration:** [estimated minutes]

### Happy Path
[What should work]

### Error Cases
[What should fail gracefully]

### Edge Cases
[Unusual but valid scenarios]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

**Example:**
```markdown
## Test: User Signup

**Priority:** Critical
**Type:** Smoke
**Duration:** 3 minutes

### Happy Path
1. User enters valid email and password
2. User clicks "Sign Up"
3. User is redirected to dashboard
4. Welcome message displays

### Error Cases
1. Invalid email format → Error message
2. Password too short → Error message
3. Email already exists → Error message

### Edge Cases
1. Very long email (100+ chars)
2. Special characters in password
3. Signup during server downtime

### Acceptance Criteria
- [ ] Valid signup creates user account
- [ ] Invalid inputs show clear errors
- [ ] No crashes on edge cases
```

### Step 2: Write Test Instructions

**Natural Language Format:**

```
Test the [feature name]:

1. Navigate to [URL]
2. [Action 1]
3. [Action 2]
4. Verify: [Expected outcome]
5. Verify: [Expected outcome]

If [error condition]:
- Verify: [Error message]
- Verify: [System behavior]
```

**Example:**
```
Test the signup flow:

1. Navigate to http://localhost:3000/signup
2. Fill in email field with: test-${timestamp}@example.com
3. Fill in password field with: SecurePass123!
4. Click the "Sign Up" button
5. Wait for page to redirect
6. Verify: URL contains "/dashboard"
7. Verify: "Welcome" message is visible
8. Verify: User email appears in header

If email is invalid:
- Verify: Error message "Invalid email format" appears
- Verify: Form does not submit
- Verify: User stays on /signup page
```

### Step 3: Execute Tests

**Using Claude Code:**
```
@claude QA test http://localhost:3000

Test the signup flow:
1. Go to /signup
2. Fill in email: test@example.com
3. Fill in password: SecurePass123!
4. Click "Sign Up"
5. Verify dashboard loads
6. Verify welcome message shows
```

**Using Playwright:**
```typescript
import { test, expect } from '@playwright/test';

test('user can sign up', async ({ page }) => {
  await page.goto('http://localhost:3000/signup');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.click('button:has-text("Sign Up")');
  
  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.locator('text=Welcome')).toBeVisible();
});
```

### Step 4: Review Results

**Check for:**
- ✅ All assertions passed
- ✅ No console errors
- ✅ No network failures
- ✅ Screenshots look correct
- ✅ Performance is acceptable

**If failures:**
1. Review error message
2. Check screenshot
3. Reproduce manually
4. File bug report
5. Fix or mark as known issue

### Step 5: Document Findings

**Bug Report Template:**
```markdown
## Bug: [Title]

**Severity:** Critical | High | Medium | Low
**Found by:** QA Automation
**Test:** [Test name]
**URL:** [Where bug occurs]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Screenshots
[Attach screenshots]

### Environment
- Browser: Chrome 120
- OS: macOS 14
- App Version: v1.2.3

### Impact
[How this affects users]

### Suggested Fix
[If obvious]
```

## Test Scenarios Library

### Authentication

**Signup:**
```
Test signup flow:
1. Go to /signup
2. Enter email: test-${Date.now()}@example.com
3. Enter password: SecurePass123!
4. Click "Sign Up"
5. Verify: Redirected to /dashboard
6. Verify: Welcome message shows
7. Verify: Email in header

Test signup errors:
1. Go to /signup
2. Enter invalid email: notanemail
3. Click "Sign Up"
4. Verify: Error "Invalid email format"
5. Verify: Form doesn't submit
```

**Login:**
```
Test login flow:
1. Go to /login
2. Enter email: existing@example.com
3. Enter password: correctpassword
4. Click "Log In"
5. Verify: Redirected to /dashboard

Test login errors:
1. Go to /login
2. Enter email: existing@example.com
3. Enter wrong password: wrongpassword
4. Click "Log In"
5. Verify: Error "Invalid credentials"
6. Verify: User stays on /login
```

**Logout:**
```
Test logout:
1. Ensure user is logged in
2. Click "Log Out" button
3. Verify: Redirected to /login
4. Verify: Session cleared
5. Try to access /dashboard
6. Verify: Redirected to /login
```

### E-commerce

**Add to Cart:**
```
Test add to cart:
1. Go to /products
2. Click on first product
3. Click "Add to Cart"
4. Verify: Cart icon shows "1"
5. Click cart icon
6. Verify: Product appears in cart
7. Verify: Price is correct
```

**Checkout:**
```
Test checkout flow:
1. Add product to cart
2. Go to /cart
3. Click "Checkout"
4. Fill in shipping address
5. Select shipping method
6. Enter payment details (test card)
7. Click "Place Order"
8. Verify: Order confirmation page
9. Verify: Order number displayed
10. Verify: Confirmation email sent
```

### Forms

**Contact Form:**
```
Test contact form:
1. Go to /contact
2. Fill in name: John Doe
3. Fill in email: john@example.com
4. Fill in message: Test message
5. Click "Send"
6. Verify: Success message
7. Verify: Form clears
8. Verify: Email sent to admin
```

**Profile Update:**
```
Test profile update:
1. Log in as user
2. Go to /profile
3. Change name to: Jane Doe
4. Upload new avatar
5. Click "Save"
6. Verify: Success message
7. Refresh page
8. Verify: Changes persisted
```

### Search

**Basic Search:**
```
Test search:
1. Go to homepage
2. Enter "test query" in search
3. Press Enter
4. Verify: Results page loads
5. Verify: Results contain "test query"
6. Verify: Result count displayed
```

**No Results:**
```
Test search no results:
1. Go to homepage
2. Enter "xyznonexistent" in search
3. Press Enter
4. Verify: "No results found" message
5. Verify: Suggestions displayed
```

### Mobile

**Responsive Design:**
```
Test mobile layout:
1. Set viewport to 375x667 (iPhone)
2. Go to homepage
3. Verify: Hamburger menu visible
4. Tap hamburger menu
5. Verify: Menu opens
6. Verify: All links work
7. Test signup on mobile
8. Verify: Form is usable
```

## Advanced Scenarios

### Multi-Step Flows

```
Test complete user journey:
1. Sign up new account
2. Complete onboarding wizard
3. Add profile information
4. Browse products
5. Add 3 items to cart
6. Apply discount code
7. Complete checkout
8. Verify order in account
9. Log out
10. Verify can't access account pages
```

### Error Recovery

```
Test error recovery:
1. Start checkout process
2. Simulate network failure
3. Verify: Error message shown
4. Restore network
5. Click "Retry"
6. Verify: Process continues
7. Complete checkout
8. Verify: Order successful
```

### Concurrent Users

```
Test concurrent actions:
1. Open 2 browser windows
2. Log in as same user in both
3. In window 1: Update profile
4. In window 2: Update profile differently
5. Verify: Last write wins OR conflict detected
6. Verify: No data corruption
```

## Integration with CI/CD

### GitHub Actions Workflow

```yaml
name: QA Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  qa:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build app
        run: npm run build
      
      - name: Start app
        run: npm start &
        
      - name: Wait for app
        run: npx wait-on http://localhost:3000
      
      - name: Run QA tests
        run: npm run test:qa
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-screenshots
          path: screenshots/
      
      - name: Comment on PR
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ QA tests failed. Check artifacts for screenshots.'
            })
```

### Package.json Scripts

```json
{
  "scripts": {
    "test:qa": "playwright test",
    "test:qa:smoke": "playwright test --grep @smoke",
    "test:qa:ui": "playwright test --ui",
    "test:qa:debug": "playwright test --debug",
    "test:qa:headed": "playwright test --headed"
  }
}
```

## Best Practices

### Test Organization

**Group by feature:**
```
tests/qa/
├── auth/
│   ├── signup.test.ts
│   ├── login.test.ts
│   └── logout.test.ts
├── checkout/
│   ├── cart.test.ts
│   ├── payment.test.ts
│   └── confirmation.test.ts
└── profile/
    ├── update.test.ts
    └── settings.test.ts
```

### Test Data

**Use factories:**
```typescript
// helpers/factories.ts
export const createUser = () => ({
  email: `test-${Date.now()}@example.com`,
  password: 'SecurePass123!',
  name: 'Test User'
});

export const createProduct = () => ({
  name: `Product ${Date.now()}`,
  price: 99.99,
  sku: `SKU-${Date.now()}`
});
```

### Assertions

**Be specific:**
```typescript
// ❌ Bad
await expect(page.locator('div')).toBeVisible();

// ✅ Good
await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
await expect(page.locator('[data-testid="welcome-message"]')).toHaveText('Welcome, John!');
```

### Cleanup

**Reset state:**
```typescript
test.afterEach(async () => {
  // Clear cookies
  await context.clearCookies();
  
  // Reset database
  await db.reset();
  
  // Clear localStorage
  await page.evaluate(() => localStorage.clear());
});
```

## Troubleshooting

### Tests are Flaky

**Problem:** Tests pass sometimes, fail sometimes

**Solutions:**
- Add explicit waits
- Use `waitForLoadState('networkidle')`
- Increase timeouts
- Check for race conditions
- Use retry logic

### Tests are Slow

**Problem:** Test suite takes too long

**Solutions:**
- Run tests in parallel
- Use `test.describe.parallel()`
- Skip unnecessary waits
- Mock external services
- Use faster selectors

### Selectors Break

**Problem:** UI changes break tests

**Solutions:**
- Use `data-testid` attributes
- Use AI-powered selectors (Stagehand)
- Avoid brittle CSS selectors
- Use semantic selectors (role, label)

## Summary

**QA Automation Workflow:**
1. Define test scenarios
2. Write test instructions
3. Execute tests
4. Review results
5. Document findings

**The goal:** Catch every bug before production. Ship with confidence.

**Automated QA = faster shipping + higher quality.**
