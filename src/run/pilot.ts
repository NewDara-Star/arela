// src/run/pilot.ts - AI Pilot Mode for autonomous testing
import { Page } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs-extra';
import pc from 'picocolors';

const execAsync = promisify(exec);

/**
 * Smart model selection:
 * 1. Use Claude CLI (already authenticated, fast & cloud-based)
 * 2. Fall back to Codex CLI if Claude unavailable
 * 3. Last resort: local moondream (slow, uses laptop resources)
 */
async function selectBestModel(userModel?: string): Promise<'claude' | 'codex' | 'moondream'> {
  // User specified model takes priority
  if (userModel) {
    return userModel as any;
  }

  // Check for Claude CLI (BEST option - already authenticated!)
  try {
    await execAsync('which claude');
    console.log(pc.green(`✅ Using Claude CLI (fast & cloud-based)`));
    return 'claude';
  } catch {
    // Claude not available
  }

  // Check for Codex CLI (GOOD option)
  try {
    await execAsync('which codex');
    console.log(pc.green(`✅ Using Codex CLI (fast & cloud-based)`));
    return 'codex';
  } catch {
    // Codex not available
  }

  // Last resort: local model (SLOW, uses laptop resources)
  console.log(pc.yellow(`⚠️  No cloud CLIs found, falling back to local moondream`));
  console.log(pc.gray('💡 Install Claude or Codex CLI for faster testing\n'));
  return 'moondream';
}

interface PilotOptions {
  goal: string;
  maxSteps?: number;
  model?: string;
  screenshotsDir: string;
}

interface PilotAction {
  type: 'click' | 'type' | 'scroll' | 'wait' | 'done';
  selector?: string;
  text?: string;
  reasoning: string;
}

interface PilotStep {
  stepNumber: number;
  screenshot: string;
  action: PilotAction;
  success: boolean;
  error?: string;
}

export async function runAIPilot(
  page: Page,
  options: PilotOptions
): Promise<PilotStep[]> {
  const { goal, maxSteps = 20, screenshotsDir } = options;
  const steps: PilotStep[] = [];

  console.log(pc.bold(pc.cyan('\n🤖 AI Pilot Mode Activated\n')));
  console.log(pc.gray(`Goal: ${goal}`));
  console.log(pc.gray(`Max Steps: ${maxSteps}\n`));

  // Smart model selection
  const model = await selectBestModel(options.model);
  console.log(pc.gray(`Model: ${model}\n`));

  // Only check Ollama if using local model
  if (model === 'moondream') {
    try {
      await execAsync('ollama --version');
    } catch {
      throw new Error('Ollama not installed. Run: brew install ollama');
    }

    // Check if moondream is available
    try {
      await execAsync(`ollama list | grep moondream`);
    } catch {
      console.log(pc.yellow(`📥 Pulling moondream (first time only)...\n`));
      await execAsync(`ollama pull moondream`);
    }
  }

  let stepNumber = 0;
  let goalAchieved = false;

  while (stepNumber < maxSteps && !goalAchieved) {
    stepNumber++;
    console.log(pc.bold(`\n🎯 Step ${stepNumber}/${maxSteps}`));

    // Take screenshot
    const screenshotPath = path.join(
      screenshotsDir,
      `pilot-step-${stepNumber}-${Date.now()}.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(pc.gray(`📸 Screenshot: ${path.basename(screenshotPath)}`));

    // Get page context
    const url = page.url();
    const title = await page.title();

    // Ask AI what to do next
    const action = await decideNextAction(
      screenshotPath,
      goal,
      stepNumber,
      url,
      title,
      model
    );

    console.log(pc.cyan(`💭 ${action.reasoning}`));
    console.log(pc.yellow(`🎬 Action: ${action.type}${action.selector ? ` → ${action.selector}` : ''}`));

    // Execute action
    const step: PilotStep = {
      stepNumber,
      screenshot: screenshotPath,
      action,
      success: false,
    };

    try {
      if (action.type === 'done') {
        goalAchieved = true;
        step.success = true;
        console.log(pc.green('✅ Goal achieved!'));
      } else {
        await executeAction(page, action);
        step.success = true;
        console.log(pc.green('✅ Action executed'));
      }
    } catch (error) {
      step.error = (error as Error).message;
      step.success = false;
      console.log(pc.red(`❌ Action failed: ${step.error}`));
    }

    steps.push(step);

    // Wait a bit for page to update
    if (!goalAchieved) {
      await page.waitForTimeout(1000);
    }
  }

  if (!goalAchieved) {
    console.log(pc.yellow(`\n⚠️  Max steps (${maxSteps}) reached without achieving goal`));
  }

  return steps;
}

async function decideNextAction(
  screenshotPath: string,
  goal: string,
  stepNumber: number,
  url: string,
  title: string,
  model: string
): Promise<PilotAction> {
  const prompt = `You are an AI testing assistant. Your goal is: "${goal}"

Current state:
- Step: ${stepNumber}
- URL: ${url}
- Page Title: ${title}

Look at this screenshot and decide the NEXT action to take toward the goal.

Available actions:
1. click - Click an element (provide CSS selector)
2. type - Type text into an input (provide selector and text)
3. scroll - Scroll the page (up/down)
4. wait - Wait for page to load
5. done - Goal is achieved

Respond in JSON format:
{
  "type": "click|type|scroll|wait|done",
  "selector": "CSS selector (for click/type)",
  "text": "text to type (for type)",
  "reasoning": "why you chose this action"
}

Be specific with selectors. Use common patterns like:
- button:has-text("Sign Up")
- input[type="email"]
- a[href*="login"]
- [data-testid="submit"]

If the goal is achieved, use type "done".`;

  try {
    let stdout: string;

    // Write prompt to file to avoid shell escaping issues
    const tempPromptPath = path.join('/tmp', `arela-prompt-${Date.now()}.txt`);
    await fs.writeFile(tempPromptPath, prompt);

    if (model === 'claude') {
      // Use Claude CLI with vision
      const { stdout: result } = await execAsync(
        `cat "${tempPromptPath}" | claude --print --image "${screenshotPath}"`
      );
      stdout = result;
      await fs.remove(tempPromptPath);
    } else if (model === 'codex') {
      // Use Codex CLI with vision
      const { stdout: result } = await execAsync(
        `cat "${tempPromptPath}" | codex --print --image "${screenshotPath}"`
      );
      stdout = result;
      await fs.remove(tempPromptPath);
    } else {
      // Fall back to Ollama moondream
      const tempPromptPath = path.join('/tmp', `arela-prompt-${Date.now()}.txt`);
      await fs.writeFile(tempPromptPath, prompt);
      const { stdout: result } = await execAsync(
        `cat "${tempPromptPath}" | ollama run moondream < "${screenshotPath}"`
      );
      await fs.remove(tempPromptPath);
      stdout = result;
    }

    // Parse JSON from response
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        type: 'wait',
        reasoning: 'AI response unclear, waiting for page to load',
      };
    }

    const action = JSON.parse(jsonMatch[0]);
    return action;
  } catch (error) {
    console.log(pc.red(`⚠️  AI decision failed: ${(error as Error).message}`));
    return {
      type: 'wait',
      reasoning: 'AI decision failed, waiting',
    };
  }
}

async function executeAction(page: Page, action: PilotAction): Promise<void> {
  switch (action.type) {
    case 'click':
      if (!action.selector) throw new Error('Click action requires selector');
      await page.click(action.selector, { timeout: 5000 });
      break;

    case 'type':
      if (!action.selector || !action.text) {
        throw new Error('Type action requires selector and text');
      }
      await page.fill(action.selector, action.text, { timeout: 5000 });
      break;

    case 'scroll':
      await page.evaluate(() => {
        const win = globalThis as any;
        win.window.scrollBy(0, win.window.innerHeight);
      });
      break;

    case 'wait':
      await page.waitForTimeout(2000);
      break;

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}
