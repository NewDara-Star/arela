import path from "node:path";
import fs from "fs-extra";
import { chromium, Browser, BrowserContext, Page } from "playwright";
import { Flow, FlowStep, loadFlow } from "./flows.js";
import {
  reportResults,
  reportError,
  reportStart,
  TestIssue,
  TestResults,
  TestStep,
} from "./reporter.js";

interface RunnerContext {
  baseUrl: string;
  flowName: string;
  screenshotsDir: string;
  screenshots: string[];
}

let currentContext: RunnerContext | null = null;
const MAX_RETRIES = 3;

export async function runWebApp(opts: {
  url: string;
  flow: string;
  headless: boolean;
  record?: boolean;
  analyze?: boolean;
  aiPilot?: boolean;
  goal?: string;
}): Promise<TestResults> {
  const { url, flow: flowName, headless, record, analyze, aiPilot, goal } = opts;
  const cwd = process.cwd();
  const screenshotsDir = path.join(cwd, ".arela", "screenshots");
  await fs.ensureDir(screenshotsDir);

  // Skip flow loading in AI Pilot mode
  const flow = aiPilot 
    ? { name: `AI Pilot: ${goal}`, steps: [] }
    : await loadFlow(flowName, cwd);
  reportStart(url, flow.name);

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let tracePath: string | undefined;

  try {
    browser = await chromium.launch({ headless });
    context = await browser.newContext();

    if (record) {
      await context.tracing.start({ screenshots: true, snapshots: true });
      const traceDir = path.join(cwd, ".arela", "traces");
      await fs.ensureDir(traceDir);
      tracePath = path.join(
        traceDir,
        `${sanitize(flow.name)}-${Date.now().toString(36)}.zip`
      );
    }

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    currentContext = {
      baseUrl: url,
      flowName: flow.name,
      screenshotsDir,
      screenshots: [],
    };

    // AI Pilot mode - let AI figure out how to achieve the goal
    if (aiPilot && goal) {
      const { runAIPilot } = await import('./pilot.js');
      const pilotSteps = await runAIPilot(page, {
        goal,
        screenshotsDir,
      });

      // Convert pilot steps to test results
      const results: TestResults = {
        flow: `AI Pilot: ${goal}`,
        url,
        steps: pilotSteps.map(s => ({
          action: s.action.type,
          status: s.success ? 'pass' : 'fail',
          message: s.action.reasoning,
          screenshot: s.screenshot,
          duration: 0,
        })),
        issues: pilotSteps
          .filter(s => !s.success)
          .map(s => ({
            severity: 'critical',
            message: `Step ${s.stepNumber} failed: ${s.error}`,
            suggestion: 'Review AI decision and page state',
          })),
        screenshots: pilotSteps.map(s => s.screenshot),
        duration: 0,
      };

      reportResults(results);
      return results;
    }

    const results = await executeFlow(page, flow);
    if (await stopTracing(context, tracePath)) {
      results.issues.push({
        severity: "info",
        message: "Playwright trace recorded",
        suggestion: `Trace saved to ${tracePath}`,
      });
      tracePath = undefined;
    }

    // Run analysis if requested
    if (analyze && results.screenshots.length > 0) {
      const pc = await import('picocolors');
      const { analyzeScreenshot } = await import('../analysis/index.js');
      
      console.log(pc.default.cyan('\n🤖 Running AI analysis...\n'));
      
      // Analyze the last screenshot (final state)
      const lastScreenshot = results.screenshots[results.screenshots.length - 1];
      const analysisResult = await analyzeScreenshot(
        lastScreenshot,
        page,
        `Flow: ${flow.name}`
      );

      // Print analysis results
      console.log(pc.default.bold('\n📊 Analysis Results:\n'));
      console.log(`${analysisResult.summary}\n`);

      const allIssues = [...analysisResult.aiIssues, ...analysisResult.ruleIssues];
      const critical = allIssues.filter((i: any) => i.severity === 'critical');
      const warnings = allIssues.filter((i: any) => i.severity === 'warning');
      const info = allIssues.filter((i: any) => i.severity === 'info');

      if (critical.length > 0) {
        console.log(pc.default.red(`❌ Critical Issues (${critical.length}):`));
        critical.forEach((issue: any) => {
          console.log(pc.default.red(`   ${issue.message}`));
          console.log(pc.default.gray(`   💡 ${issue.suggestion}\n`));
        });
      }

      if (warnings.length > 0) {
        console.log(pc.default.yellow(`⚠️  Warnings (${warnings.length}):`));
        warnings.forEach((issue: any) => {
          console.log(pc.default.yellow(`   ${issue.message}`));
          console.log(pc.default.gray(`   💡 ${issue.suggestion}\n`));
        });
      }

      if (info.length > 0) {
        console.log(pc.default.cyan(`💡 Suggestions (${info.length}):`));
        info.forEach((issue: any) => {
          console.log(pc.default.cyan(`   ${issue.message}\n`));
        });
      }

      console.log(pc.default.bold('\n📊 Scores:'));
      console.log(`   WCAG: ${analysisResult.scores.wcag}/100`);
      console.log(`   UX: ${analysisResult.scores.ux}/100`);
      console.log(`   Accessibility: ${analysisResult.scores.accessibility}/100\n`);
    }

    reportResults(results);
    return results;
  } catch (error) {
    if (await stopTracing(context, tracePath)) {
      tracePath = undefined;
    }

    reportError(error as Error);
    throw error;
  } finally {
    currentContext = null;
    if (browser) {
      await browser.close();
    }
  }
}

async function executeFlow(page: Page, flow: Flow): Promise<TestResults> {
  if (!currentContext) {
    throw new Error("Runner context not initialized");
  }

  const steps: TestStep[] = [];
  const issues: TestIssue[] = [];
  const flowStart = Date.now();

  for (const step of flow.steps) {
    let attempt = 0;
    let completed = false;
    let lastError: Error | null = null;

    while (attempt < MAX_RETRIES && !completed) {
      attempt++;
      const stepStart = Date.now();
      try {
        const result = await executeStep(page, step);
        result.duration = Date.now() - stepStart;
        steps.push(result);
        completed = true;
      } catch (error) {
        lastError = error as Error;

        if (attempt >= MAX_RETRIES) {
          const message = formatStepError(step, lastError);
          const screenshot = await captureScreenshot(
            page,
            `${step.action}-error`
          );

          steps.push({
            action: step.action,
            status: "fail",
            message,
            screenshot,
            duration: Date.now() - stepStart,
          });

          issues.push({
            severity: "critical",
            message,
            suggestion: getSuggestionForStep(step),
          });
        } else {
          await page.waitForTimeout(500 * attempt);
        }
      }
    }
  }

  return {
    flow: flow.name,
    url: currentContext.baseUrl,
    steps,
    issues,
    screenshots: [...currentContext.screenshots],
    duration: Date.now() - flowStart,
  };
}

async function executeStep(page: Page, step: FlowStep): Promise<TestStep> {
  if (!currentContext) {
    throw new Error("Runner context not initialized");
  }

  switch (step.action) {
    case "navigate": {
      const target = step.target ?? currentContext.baseUrl;
      const destination = resolveTargetUrl(target, currentContext.baseUrl);
      await page.goto(destination, { waitUntil: "load" });
      return {
        action: "navigate",
        status: "pass",
        message: `Navigated to ${destination}`,
      };
    }
    case "click": {
      if (!step.selector) {
        throw new Error("Click step missing selector");
      }
      await page.click(step.selector, { timeout: 10_000 });
      return {
        action: "click",
        status: "pass",
        message: `Clicked ${step.selector}`,
      };
    }
    case "type": {
      if (!step.selector || typeof step.value !== "string") {
        throw new Error("Type step requires selector and value");
      }
      await page.fill(step.selector, step.value);
      return {
        action: "type",
        status: "pass",
        message: `Typed into ${step.selector}`,
      };
    }
    case "waitFor": {
      if (!step.selector) {
        throw new Error("waitFor step missing selector");
      }
      await page.waitForSelector(step.selector, { timeout: 10_000 });
      return {
        action: "waitFor",
        status: "pass",
        message: `Waited for ${step.selector}`,
      };
    }
    case "screenshot": {
      const label = step.name ?? "screenshot";
      const screenshot = await captureScreenshot(page, label);
      return {
        action: "screenshot",
        status: "pass",
        message: `Captured screenshot ${label}`,
        screenshot,
      };
    }
    default:
      throw new Error(`Unsupported action: ${step.action}`);
  }
}

function resolveTargetUrl(target: string, base: string): string {
  if (/^https?:\/\//i.test(target)) {
    return target;
  }
  return new URL(target, base).toString();
}

async function stopTracing(
  context: BrowserContext | undefined,
  tracePath?: string
): Promise<boolean> {
  if (!context || !tracePath) {
    return false;
  }

  await context.tracing.stop({ path: tracePath });
  return true;
}

async function captureScreenshot(page: Page, label: string): Promise<string> {
  if (!currentContext) {
    throw new Error("Runner context not initialized");
  }

  const safeLabel = sanitize(label || "screenshot");
  const fileName = `${sanitize(currentContext.flowName)}-${safeLabel}-${Date.now()}.png`;
  const filePath = path.join(currentContext.screenshotsDir, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  const relativePath = path.relative(process.cwd(), filePath);
  currentContext.screenshots.push(relativePath);
  return relativePath;
}

function sanitize(input: string): string {
  return input.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "capture";
}

function formatStepError(step: FlowStep, error: Error): string {
  return `${step.action} failed: ${error.message}`;
}

function getSuggestionForStep(step: FlowStep): string | undefined {
  switch (step.action) {
    case "navigate":
      return "Verify the target URL is reachable";
    case "click":
      return "Ensure the selector exists and is visible before clicking";
    case "type":
      return "Confirm the input selector is correct and not disabled";
    case "waitFor":
      return "Increase wait time or ensure the selector appears";
    default:
      return undefined;
  }
}
