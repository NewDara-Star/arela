// Test the analysis modules
import { chromium } from 'playwright';
import { analyzeScreenshot } from './src/analysis/index.js';
import path from 'path';
import fs from 'fs-extra';

async function testAnalysis() {
  console.log('🧪 Testing vision analysis...\n');

  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to test page
  await page.goto('http://localhost:8080');
  await page.waitForTimeout(1000);

  // Take screenshot
  const screenshotPath = path.join(process.cwd(), 'test-screenshot.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 Screenshot saved: ${screenshotPath}\n`);

  // Analyze
  console.log('🤖 Running analysis...\n');
  const result = await analyzeScreenshot(
    screenshotPath,
    page,
    'Test page - Tic Tac Toe game'
  );

  // Print results
  console.log('📊 Analysis Results:\n');
  console.log(`Summary: ${result.summary}\n`);

  if (result.aiIssues.length > 0) {
    console.log('🤖 AI Issues:');
    result.aiIssues.forEach((issue: any) => {
      console.log(`  ${issue.severity.toUpperCase()}: ${issue.message}`);
      console.log(`  💡 ${issue.suggestion}\n`);
    });
  }

  if (result.ruleIssues.length > 0) {
    console.log('📏 Rule-Based Issues:');
    result.ruleIssues.forEach((issue: any) => {
      console.log(`  ${issue.severity.toUpperCase()} [${issue.category}]: ${issue.message}`);
      console.log(`  💡 ${issue.suggestion}\n`);
    });
  }

  console.log('📊 Scores:');
  console.log(`  WCAG: ${result.scores.wcag}/100`);
  console.log(`  UX: ${result.scores.ux}/100`);
  console.log(`  Accessibility: ${result.scores.accessibility}/100`);

  await browser.close();
}

testAnalysis().catch(console.error);
