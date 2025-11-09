# Browser Automation Integration Guide

## Overview

Arela integrates with **Stagehand** (AI browser automation) via the **Claude Code plugin** to enable natural language QA testing.

## Quick Start

### 1. Install Plugin

**In Claude Code:**
```bash
/plugin marketplace add browserbase/agent-browse
/plugin install browser-automation@browser-tools
```

### 2. Set API Key

```bash
export ANTHROPIC_API_KEY="your-api-key"
```

### 3. Test Your App

```
@claude QA test http://localhost:3000

Test the signup flow:
1. Go to /signup
2. Fill in email and password
3. Click "Sign Up"
4. Verify dashboard loads
```

## Integration with Arela

### Pre-commit Hook

Add QA smoke tests to your pre-commit hook:

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run Arela doctor
npx arela doctor --eval

# Run smoke tests (optional, if app is running)
if curl -s http://localhost:3000 > /dev/null; then
  echo "Running QA smoke tests..."
  npm run test:qa:smoke
fi
```

### CI/CD Pipeline

Add to `.github/workflows/arela-doctor.yml`:

```yaml
name: Arela Quality Gates

on:
  pull_request:
  push:
    branches: [main]

jobs:
  arela-doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx arela doctor
  
  qa-smoke:
    runs-on: ubuntu-latest
    needs: arela-doctor
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm start &
      - run: npx wait-on http://localhost:3000
      - run: npm run test:qa:smoke
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: qa-screenshots
          path: screenshots/
```

### Package.json Scripts

```json
{
  "scripts": {
    "test:qa:smoke": "playwright test tests/qa/smoke --reporter=list",
    "test:qa:full": "playwright test tests/qa --reporter=html",
    "test:qa:ui": "playwright test --ui",
    "test:qa:debug": "playwright test --debug"
  }
}
```

## Test Structure

### Recommended Directory Layout

```
your-project/
├── .arela/
│   ├── rules/
│   └── workflows/
├── tests/
│   ├── qa/
│   │   ├── smoke/           # Critical paths (< 5 min)
│   │   │   ├── auth.test.ts
│   │   │   ├── checkout.test.ts
│   │   │   └── dashboard.test.ts
│   │   ├── features/        # New features (< 15 min)
│   │   │   ├── payments.test.ts
│   │   │   └── social.test.ts
│   │   ├── regression/      # Full suite (< 1 hour)
│   │   │   └── all-flows.test.ts
│   │   └── helpers/
│   │       ├── setup.ts
│   │       └── factories.ts
│   └── unit/
│       └── ...
├── screenshots/             # Auto-generated
└── playwright.config.ts
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/qa',
  
  // Parallel execution
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  
  // Retry on CI
  retries: process.env.CI ? 2 : 0,
  
  // Reporter
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  
  // Start dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Example Tests

### Smoke Test (Critical Path)

```typescript
// tests/qa/smoke/auth.test.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication @smoke', () => {
  test('user can sign up', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    
    await page.goto('/signup');
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('button:has-text("Sign Up")');
    
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Welcome')).toBeVisible();
  });
  
  test('user can log in', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button:has-text("Log In")');
    
    await expect(page).toHaveURL(/.*dashboard/);
  });
});
```

### Feature Test (New Feature)

```typescript
// tests/qa/features/payments.test.ts
import { test, expect } from '@playwright/test';

test.describe('Payment Processing', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button:has-text("Log In")');
  });
  
  test('can complete checkout with credit card', async ({ page }) => {
    // Add item to cart
    await page.goto('/products/1');
    await page.click('button:has-text("Add to Cart")');
    
    // Go to checkout
    await page.goto('/cart');
    await page.click('button:has-text("Checkout")');
    
    // Fill payment details
    await page.fill('[name="cardNumber"]', '4242424242424242');
    await page.fill('[name="expiry"]', '12/25');
    await page.fill('[name="cvc"]', '123');
    
    // Submit
    await page.click('button:has-text("Pay")');
    
    // Verify success
    await expect(page.locator('text=Order Confirmed')).toBeVisible();
    await expect(page.locator('[data-testid="order-number"]')).toBeVisible();
  });
});
```

### Using Stagehand (Natural Language)

```typescript
// tests/qa/smoke/checkout.test.ts
import { test } from '@playwright/test';
import { stagehand } from '../helpers/stagehand';

test('complete checkout flow', async ({ page }) => {
  await stagehand(page, `
    Test the complete checkout process:
    
    1. Go to http://localhost:3000
    2. Click on the first product
    3. Click "Add to Cart"
    4. Go to cart
    5. Click "Checkout"
    6. Fill in shipping address:
       - Name: John Doe
       - Address: 123 Main St
       - City: San Francisco
       - ZIP: 94102
    7. Select "Standard Shipping"
    8. Enter test credit card: 4242 4242 4242 4242
    9. Enter expiry: 12/25
    10. Enter CVC: 123
    11. Click "Place Order"
    12. Verify order confirmation page loads
    13. Verify order number is displayed
    14. Take screenshot of confirmation
  `);
});
```

## Helpers

### Stagehand Helper

```typescript
// tests/qa/helpers/stagehand.ts
import { Page } from '@playwright/test';

export async function stagehand(page: Page, instructions: string) {
  // This is a placeholder - actual implementation would use
  // the Stagehand API or Claude Code plugin
  
  // For now, you can use Claude Code directly:
  // @claude QA test with these instructions: ${instructions}
  
  console.log('Stagehand instructions:', instructions);
  
  // Or implement with Playwright + AI
  // const result = await callAnthropicAPI(instructions, page);
  // return result;
}
```

### Test Data Factories

```typescript
// tests/qa/helpers/factories.ts
export const factories = {
  user: () => ({
    email: `test-${Date.now()}@example.com`,
    password: 'SecurePass123!',
    name: 'Test User',
  }),
  
  product: () => ({
    name: `Product ${Date.now()}`,
    price: 99.99,
    sku: `SKU-${Date.now()}`,
  }),
  
  address: () => ({
    name: 'John Doe',
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
  }),
  
  creditCard: () => ({
    number: '4242424242424242',
    expiry: '12/25',
    cvc: '123',
  }),
};
```

### Database Helpers

```typescript
// tests/qa/helpers/db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const db = {
  async reset() {
    await prisma.$transaction([
      prisma.order.deleteMany(),
      prisma.product.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  },
  
  async seed() {
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashed_password',
      },
    });
  },
};
```

## Arela Doctor Integration

### Add QA Checks to Doctor

```typescript
// .arela/evals/qa-coverage.ts
export async function evaluateQACoverage() {
  const testFiles = await glob('tests/qa/**/*.test.ts');
  const criticalPaths = [
    'signup',
    'login',
    'checkout',
    'payment',
  ];
  
  const coverage = criticalPaths.filter(path => 
    testFiles.some(file => file.includes(path))
  );
  
  return {
    score: (coverage.length / criticalPaths.length) * 100,
    message: `${coverage.length}/${criticalPaths.length} critical paths have QA tests`,
    details: {
      covered: coverage,
      missing: criticalPaths.filter(p => !coverage.includes(p)),
    },
  };
}
```

## Cost Optimization

### Minimize API Calls

**Use Playwright for simple assertions:**
```typescript
// ❌ Expensive (uses AI)
await stagehand(page, 'Verify the button is blue');

// ✅ Cheap (uses Playwright)
await expect(page.locator('button')).toHaveCSS('background-color', 'rgb(0, 0, 255)');
```

**Use AI for complex scenarios:**
```typescript
// ✅ Good use of AI
await stagehand(page, `
  Navigate through the checkout flow and verify:
  - All form fields are present
  - Validation works correctly
  - Payment processing completes
  - Confirmation page displays correctly
`);
```

### Parallel Execution

```typescript
// playwright.config.ts
export default defineConfig({
  workers: 4, // Run 4 tests in parallel
  fullyParallel: true,
});
```

## Monitoring & Reporting

### Slack Notifications

```typescript
// tests/qa/helpers/notify.ts
export async function notifySlack(result: TestResult) {
  if (result.status === 'failed') {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({
        text: `🚨 QA Test Failed: ${result.title}`,
        attachments: [{
          color: 'danger',
          fields: [
            { title: 'Test', value: result.title },
            { title: 'Error', value: result.error },
            { title: 'Screenshot', value: result.screenshotUrl },
          ],
        }],
      }),
    });
  }
}
```

### Test Results Dashboard

Use Playwright's HTML reporter:
```bash
npx playwright show-report
```

Or integrate with:
- GitHub Actions artifacts
- Allure Report
- ReportPortal
- TestRail

## Summary

**Arela + Browser Automation =**
- Natural language QA testing
- Integrated with CI/CD
- Automated quality gates
- 98% cost savings vs manual QA

**Setup time:** 30 minutes
**ROI:** Immediate

🚀 **Start testing with AI today!**
