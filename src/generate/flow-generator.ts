// src/generate/flows.ts - AI-powered test flow generator
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs-extra';
import pc from 'picocolors';

const execAsync = promisify(exec);

interface GenerateFlowsOptions {
  goal: string;
  cwd: string;
  files?: string[];
  outputDir?: string;
  model?: 'claude' | 'codex';
}

interface GeneratedFlow {
  name: string;
  path: string;
  content: string;
}

/**
 * Generate test flows by having AI read code and create comprehensive YAML flows
 */
export async function generateFlows(options: GenerateFlowsOptions): Promise<GeneratedFlow[]> {
  const { goal, cwd, files, outputDir = '.arela/flows', model } = options;

  console.log(pc.bold(pc.cyan('\n🤖 AI Flow Generator\n')));
  console.log(pc.gray(`Goal: ${goal}`));
  console.log(pc.gray(`Working Directory: ${cwd}\n`));

  // Select AI model
  const selectedModel = model || await selectBestModel();
  console.log(pc.green(`✅ Using ${selectedModel} for flow generation\n`));

  // Discover relevant files if not provided
  const relevantFiles = files || await discoverRelevantFiles(cwd, goal);
  console.log(pc.cyan(`📂 Reading ${relevantFiles.length} files...\n`));

  // Read file contents
  const fileContents = await readFiles(cwd, relevantFiles);

  // Generate flows using AI
  const flows = await generateFlowsWithAI(selectedModel, goal, fileContents);

  // Save flows to disk
  const outputPath = path.join(cwd, outputDir);
  await fs.ensureDir(outputPath);

  const savedFlows: GeneratedFlow[] = [];
  for (const flow of flows) {
    const flowPath = path.join(outputPath, `${flow.name}.yml`);
    await fs.writeFile(flowPath, flow.content);
    savedFlows.push({
      name: flow.name,
      path: flowPath,
      content: flow.content,
    });
    console.log(pc.green(`✅ Generated: ${flow.name}.yml`));
  }

  console.log(pc.bold(pc.green(`\n🎉 Generated ${savedFlows.length} test flows!\n`)));
  console.log(pc.gray('Run them with:'));
  savedFlows.forEach(f => {
    console.log(pc.cyan(`  arela run web --flow ${f.name} --analyze`));
  });

  return savedFlows;
}

/**
 * Select best available AI model
 */
async function selectBestModel(): Promise<'claude' | 'codex'> {
  // Check for Claude CLI (preferred)
  try {
    await execAsync('which claude');
    return 'claude';
  } catch {
    // Claude not available
  }

  // Check for Codex CLI
  try {
    await execAsync('which codex');
    return 'codex';
  } catch {
    throw new Error('No AI CLI found. Install Claude or Codex CLI.');
  }
}

/**
 * Discover files relevant to the goal
 */
async function discoverRelevantFiles(cwd: string, goal: string): Promise<string[]> {
  // Simple heuristic: look for common patterns based on goal
  const patterns: string[] = [];

  // Extract keywords from goal
  const keywords = goal.toLowerCase().split(/\s+/);

  // Common file patterns
  if (keywords.some(k => ['signup', 'register', 'sign'].includes(k))) {
    patterns.push('**/signup*', '**/register*', '**/auth*');
  }
  if (keywords.some(k => ['login', 'signin'].includes(k))) {
    patterns.push('**/login*', '**/signin*', '**/auth*');
  }
  if (keywords.some(k => ['checkout', 'cart', 'payment'].includes(k))) {
    patterns.push('**/checkout*', '**/cart*', '**/payment*');
  }

  // Default: look for pages and components
  if (patterns.length === 0) {
    patterns.push('**/pages/**/*', '**/components/**/*');
  }

  const files: string[] = [];
  
  // Try multiple common directory structures
  const dirsToCheck = ['src', 'app', 'components', 'pages', 'screens'];
  
  for (const dir of dirsToCheck) {
    try {
      const { stdout } = await execAsync(
        `find ${cwd}/${dir} -type f \\( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \\) 2>/dev/null | head -20`
      );
      const foundFiles = stdout.trim().split('\n').filter(Boolean);
      files.push(...foundFiles);
      
      if (files.length >= 20) break; // Limit to 20 files total
    } catch {
      // Directory doesn't exist, continue
    }
  }

  return files;
}

/**
 * Read file contents
 */
async function readFiles(cwd: string, files: string[]): Promise<Map<string, string>> {
  const contents = new Map<string, string>();

  for (const file of files) {
    try {
      const fullPath = file.startsWith('/') ? file : path.join(cwd, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const relativePath = path.relative(cwd, fullPath);
      contents.set(relativePath, content);
    } catch (error) {
      console.log(pc.yellow(`⚠️  Could not read ${file}`));
    }
  }

  return contents;
}

/**
 * Generate flows using AI
 */
async function generateFlowsWithAI(
  model: 'claude' | 'codex',
  goal: string,
  fileContents: Map<string, string>
): Promise<Array<{ name: string; content: string }>> {
  const prompt = buildPrompt(goal, fileContents);

  // Write prompt to temp file
  const tempPromptPath = path.join('/tmp', `arela-flow-gen-${Date.now()}.txt`);
  await fs.writeFile(tempPromptPath, prompt);

  try {
    let stdout: string;

    if (model === 'claude') {
      const { stdout: result } = await execAsync(
        `cat "${tempPromptPath}" | claude --print`
      );
      stdout = result;
    } else {
      const { stdout: result } = await execAsync(
        `cat "${tempPromptPath}" | codex --print`
      );
      stdout = result;
    }

    await fs.remove(tempPromptPath);

    // Parse AI response to extract flows
    return parseFlowsFromResponse(stdout);
  } catch (error) {
    await fs.remove(tempPromptPath);
    throw new Error(`AI flow generation failed: ${(error as Error).message}`);
  }
}

/**
 * Build prompt for AI
 */
function buildPrompt(goal: string, fileContents: Map<string, string>): string {
  let prompt = `You are a QA engineer creating comprehensive test flows.

GOAL: ${goal}

CODE FILES:
`;

  for (const [file, content] of fileContents) {
    prompt += `\n--- ${file} ---\n${content}\n`;
  }

  prompt += `

TASK: Generate 3 test flows in YAML format for the goal: "${goal}"

IMPORTANT: You MUST respond with EXACTLY 3 YAML code blocks, each wrapped in \`\`\`yaml and \`\`\`.

FLOW TYPES TO GENERATE:
1. Happy path - Everything works perfectly
2. Validation errors - Test form validation  
3. Edge cases - Unusual but valid scenarios

EXACT FORMAT FOR EACH FLOW:
\`\`\`yaml
name: Descriptive Flow Name
steps:
  - action: navigate
    target: /
  - action: click
    selector: button[data-testid="signup"]
  - action: type
    selector: input[name="email"]
    value: test@example.com
  - action: waitFor
    selector: .success-message
  - action: screenshot
    name: success-screen
\`\`\`

AVAILABLE ACTIONS:
- navigate: Go to URL (target: string)
- click: Click element (selector: string)
- type: Fill input (selector: string, value: string)
- waitFor: Wait for element (selector: string, timeout?: number)
- screenshot: Capture screenshot (name: string)

REQUIREMENTS:
- Use specific selectors (data-testid, name, class, or element type)
- Add screenshots at key points
- Include waitFor before checking results
- Keep flows realistic and executable

NOW GENERATE EXACTLY 3 YAML FLOWS (each in its own \`\`\`yaml block):`;

  return prompt;
}

/**
 * Parse flows from AI response
 */
function parseFlowsFromResponse(response: string): Array<{ name: string; content: string }> {
  const flows: Array<{ name: string; content: string }> = [];

  // Extract YAML blocks from response
  const yamlBlocks = response.match(/```yaml\n([\s\S]*?)\n```/g);

  if (!yamlBlocks || yamlBlocks.length === 0) {
    // Debug: show what we got
    console.log(pc.yellow('\n⚠️  AI Response (first 500 chars):'));
    console.log(pc.gray(response.substring(0, 500)));
    throw new Error('No YAML flows found in AI response. Check format above.');
  }

  yamlBlocks.forEach((block, index) => {
    const content = block.replace(/```yaml\n/, '').replace(/\n```/, '');
    
    // Extract name from YAML
    const nameMatch = content.match(/name:\s*(.+)/);
    const name = nameMatch 
      ? nameMatch[1].trim().toLowerCase().replace(/\s+/g, '-')
      : `generated-flow-${index + 1}`;

    flows.push({ name, content });
  });

  return flows;
}
