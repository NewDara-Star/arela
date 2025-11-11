import path from "node:path";
import fs from "fs-extra";
import { remote } from "webdriverio";
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
  platform: "ios" | "android";
  flowName: string;
  screenshotsDir: string;
  screenshots: string[];
  device?: string;
}

let currentContext: RunnerContext | null = null;
const MAX_RETRIES = 3;

/**
 * Main entry point for running mobile apps
 */
export async function runMobileApp(opts: {
  platform: "ios" | "android";
  device?: string;
  flow: string;
  app?: string;
}): Promise<TestResults> {
  const { platform, device, flow: flowName, app } = opts;
  const cwd = process.cwd();
  const screenshotsDir = path.join(cwd, ".arela", "screenshots", "mobile");
  await fs.ensureDir(screenshotsDir);

  const flow = await loadFlow(flowName, cwd);
  reportStart(
    `${platform} ${device || "default"}`,
    flow.name
  );

  let driver: WebdriverIO.Browser | undefined;

  try {
    // Resolve app path
    const appPath = app || (await findExpoApp(platform));
    if (!appPath) {
      throw new Error(
        `No app found. Provide 'app' parameter or ensure Expo app is available`
      );
    }

    // Launch driver with appropriate capabilities
    driver = await launchDriver(platform, appPath, device);

    currentContext = {
      platform,
      flowName: flow.name,
      screenshotsDir,
      screenshots: [],
      device,
    };

    const results = await executeFlow(driver, flow, platform);
    reportResults(results);
    return results;
  } catch (error) {
    reportError(error as Error);
    throw error;
  } finally {
    currentContext = null;
    if (driver) {
      await driver.deleteSession();
    }
  }
}

/**
 * Launch WebdriverIO driver with Appium capabilities
 */
async function launchDriver(
  platform: "ios" | "android",
  appPath: string,
  device?: string
): Promise<WebdriverIO.Browser> {
  const capabilities =
    platform === "ios"
      ? {
          platformName: "iOS",
          "appium:deviceName": device || "iPhone 15 Simulator",
          "appium:app": appPath,
          "appium:automationName": "XCUITest",
          "appium:bundleId": extractBundleId(appPath),
        }
      : {
          platformName: "Android",
          "appium:deviceName": device || "emulator-5554",
          "appium:app": appPath,
          "appium:automationName": "UiAutomator2",
          "appium:appPackage": extractPackageId(appPath),
        };

  const driver = await remote({
    hostname: "localhost",
    port: 4723,
    path: "/",
    logLevel: "warn",
    capabilities,
  });

  return driver;
}

/**
 * Execute flow on mobile driver
 */
async function executeFlow(
  driver: WebdriverIO.Browser,
  flow: Flow,
  platform: "ios" | "android"
): Promise<TestResults> {
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
        const result = await executeStep(driver, step, platform);
        result.duration = Date.now() - stepStart;
        steps.push(result);
        completed = true;
      } catch (error) {
        lastError = error as Error;

        if (attempt >= MAX_RETRIES) {
          const message = formatStepError(step, lastError);
          const screenshot = await captureScreenshot(
            driver,
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
          await driver.pause(500 * attempt);
        }
      }
    }
  }

  return {
    flow: flow.name,
    url: `${currentContext.platform}://${currentContext.device || "device"}`,
    steps,
    issues,
    screenshots: [...currentContext.screenshots],
    duration: Date.now() - flowStart,
  };
}

/**
 * Execute individual step on mobile driver
 */
async function executeStep(
  driver: WebdriverIO.Browser,
  step: FlowStep,
  platform: "ios" | "android"
): Promise<TestStep> {
  if (!currentContext) {
    throw new Error("Runner context not initialized");
  }

  switch (step.action) {
    case "navigate": {
      const target = step.target ?? "/";
      // For mobile, navigation is typically a deep link
      await navigateToDeepLink(driver, platform, target);
      return {
        action: "navigate",
        status: "pass",
        message: `Navigated to ${target}`,
      };
    }

    case "click": {
      if (!step.selector) {
        throw new Error("Click step missing selector");
      }
      const element = await findElement(driver, step.selector, platform);
      await element.click();
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
      const element = await findElement(driver, step.selector, platform);
      await element.clearValue();
      await element.setValue(step.value);
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
      await findElement(driver, step.selector, platform, 10000);
      return {
        action: "waitFor",
        status: "pass",
        message: `Waited for ${step.selector}`,
      };
    }

    case "screenshot": {
      const label = step.name ?? "screenshot";
      const screenshot = await captureScreenshot(driver, label);
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

/**
 * Find element by selector (supports accessibility ID and XPath)
 */
async function findElement(
  driver: WebdriverIO.Browser,
  selector: string,
  platform: "ios" | "android",
  timeout: number = 10000
): Promise<WebdriverIO.Element> {
  // If selector starts with //, treat as XPath
  if (selector.startsWith("//")) {
    return driver.$(`xpath=${selector}`).waitForExist({ timeout });
  }

  // For iOS, use accessibility ID
  if (platform === "ios") {
    try {
      return driver
        .$(`~${selector}`)
        .waitForExist({ timeout });
    } catch {
      // Fallback to XPath if accessibility ID fails
      return driver
        .$(`xpath=//*[@name="${selector}"]`)
        .waitForExist({ timeout });
    }
  }

  // For Android, use resource-id or content-desc
  try {
    return driver
      .$(`id=${selector}`)
      .waitForExist({ timeout });
  } catch {
    // Fallback to content-desc
    return driver
      .$(`accessibility=${selector}`)
      .waitForExist({ timeout });
  }
}

/**
 * Navigate to a deep link
 */
async function navigateToDeepLink(
  driver: WebdriverIO.Browser,
  platform: "ios" | "android",
  deepLink: string
): Promise<void> {
  if (platform === "ios") {
    await driver.executeScript("mobile: launchApp", [
      {
        bundleId: extractBundleId(deepLink),
      },
    ]);
  } else {
    // Android deep link
    await driver.executeScript("mobile: startActivity", [
      {
        action: "android.intent.action.VIEW",
        uri: deepLink,
      },
    ]);
  }
}

/**
 * Capture screenshot and save to disk
 */
async function captureScreenshot(
  driver: WebdriverIO.Browser,
  label: string
): Promise<string> {
  if (!currentContext) {
    throw new Error("Runner context not initialized");
  }

  const safeLabel = sanitize(label || "screenshot");
  const fileName = `${sanitize(currentContext.flowName)}-${currentContext.platform}-${safeLabel}-${Date.now()}.png`;
  const filePath = path.join(currentContext.screenshotsDir, fileName);
  const screenshot = await driver.takeScreenshot();
  await fs.writeFile(filePath, screenshot, "base64");
  const relativePath = path.relative(process.cwd(), filePath);
  currentContext.screenshots.push(relativePath);
  return relativePath;
}

/**
 * Find Expo app on the system
 */
async function findExpoApp(platform: "ios" | "android"): Promise<string | null> {
  const cwd = process.cwd();
  const expoDir = path.join(cwd, ".expo");
  const appJson = path.join(cwd, "app.json");

  // Check if this is an Expo project
  if (!(await fs.pathExists(appJson))) {
    return null;
  }

  // For iOS, look for .app or .app.zip in .expo directory
  if (platform === "ios") {
    const iosDir = path.join(expoDir, "ios");
    if (await fs.pathExists(iosDir)) {
      const files = await fs.readdir(iosDir);
      const appFile = files.find(
        (f) => f.endsWith(".app") || f.endsWith(".app.zip")
      );
      if (appFile) {
        return path.join(iosDir, appFile);
      }
    }
  }

  // For Android, look for .apk in .expo directory
  if (platform === "android") {
    const androidDir = path.join(expoDir, "android");
    if (await fs.pathExists(androidDir)) {
      const files = await fs.readdir(androidDir);
      const apkFile = files.find((f) => f.endsWith(".apk"));
      if (apkFile) {
        return path.join(androidDir, apkFile);
      }
    }
  }

  return null;
}

/**
 * Extract bundle ID from .app path (iOS)
 */
function extractBundleId(appPath: string): string {
  // Extract from app path or use default
  const match = appPath.match(/([a-zA-Z0-9.-]+)\.app/);
  return match ? match[1] : "com.expo.example";
}

/**
 * Extract package ID from .apk path (Android)
 */
function extractPackageId(appPath: string): string {
  // Extract from app path or use default
  const match = appPath.match(/([a-zA-Z0-9.]+)\.apk/);
  return match ? match[1] : "com.expo.example";
}

/**
 * Sanitize string for file names
 */
function sanitize(input: string): string {
  return input
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "capture";
}

/**
 * Format step error message
 */
function formatStepError(step: FlowStep, error: Error): string {
  return `${step.action} failed: ${error.message}`;
}

/**
 * Get suggestion for step failure
 */
function getSuggestionForStep(step: FlowStep): string | undefined {
  switch (step.action) {
    case "navigate":
      return "Verify the deep link is correct and the app supports it";
    case "click":
      return "Ensure the element selector exists and is visible on screen";
    case "type":
      return "Confirm the input field selector is correct and not disabled";
    case "waitFor":
      return "Increase wait time or verify the element appears in the flow";
    default:
      return undefined;
  }
}
