# CLAUDE-001: Vision Analysis with Moondream + Rule-Based Checks (v3.4.0)

**Agent:** claude  
**Priority:** critical  
**Complexity:** medium  
**Status:** pending

## Context

Add comprehensive screenshot analysis combining:
1. **AI Vision (Moondream via Ollama)** - Free, local, fast
2. **Rule-Based Checks** - WCAG contrast, touch targets, layout validation
3. **Performance Metrics** - Already collected by Playwright

**Why This Approach:**
- ✅ **FREE** - No API costs
- ✅ **Local** - Privacy-first
- ✅ **Fast** - Moondream is tiny (1.8B)
- ✅ **Practical** - Catches real issues

## Technical Task

Create two analysis modules:

### 1. AI Vision Analysis (`src/analysis/vision.ts`)
Uses Moondream via Ollama for semantic understanding

### 2. Rule-Based Analysis (`src/analysis/rules.ts`)
Calculates contrast, validates sizes, checks WCAG compliance

## Implementation

### Part 1: Moondream Vision Analysis

```typescript
// src/analysis/vision.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';

const execAsync = promisify(exec);

interface VisionIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'ux' | 'accessibility' | 'visual';
  message: string;
  suggestion: string;
}

interface VisionResult {
  issues: VisionIssue[];
  summary: string;
}

export async function analyzeWithMoondream(
  screenshotPath: string,
  context: string
): Promise<VisionResult> {
  // Check if Ollama is available
  try {
    await execAsync('ollama --version');
  } catch {
    throw new Error('Ollama not installed. Run: brew install ollama');
  }

  // Check if moondream is available
  try {
    await execAsync('ollama list | grep moondream');
  } catch {
    console.log('Pulling moondream model (first time only)...');
    await execAsync('ollama pull moondream');
  }

  // Prepare prompt
  const prompt = `You are analyzing a screenshot of a web application for UX and accessibility issues.

Context: ${context}

Analyze this screenshot and identify:
1. UX Issues - Poor contrast, small text, unclear buttons, missing feedback
2. Accessibility Issues - WCAG violations, small touch targets, poor color contrast
3. Visual Issues - Broken layouts, overlapping elements, cut-off text

For each issue, provide:
- Severity (critical/warning/info)
- Category (ux/accessibility/visual)
- Clear message
- Actionable suggestion

Format as JSON:
{
  "issues": [
    {
      "severity": "critical",
      "category": "accessibility",
      "message": "Text has very low contrast",
      "suggestion": "Increase text darkness or background lightness"
    }
  ],
  "summary": "Found 2 issues: 1 critical, 1 warning"
}`;

  // Call Ollama with moondream
  const { stdout } = await execAsync(
    `ollama run moondream "${prompt}" < "${screenshotPath}"`
  );

  // Parse JSON from response
  const jsonMatch = stdout.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      issues: [],
      summary: 'No issues detected by AI',
    };
  }

  try {
    const result = JSON.parse(jsonMatch[0]);
    return result;
  } catch {
    return {
      issues: [],
      summary: 'Failed to parse AI response',
    };
  }
}
```

### Part 2: Rule-Based Analysis

```typescript
// src/analysis/rules.ts
import { Page } from 'playwright';
import pc from 'picocolors';

interface RuleIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'wcag' | 'ux' | 'performance';
  message: string;
  suggestion: string;
  element?: string;
}

interface RuleResult {
  issues: RuleIssue[];
  scores: {
    wcag: number;      // 0-100
    ux: number;        // 0-100
    performance: number; // 0-100
  };
}

export async function analyzeWithRules(page: Page): Promise<RuleResult> {
  const issues: RuleIssue[] = [];

  // 1. Check contrast ratios (WCAG AA: 4.5:1, AAA: 7:1)
  const contrastIssues = await checkContrast(page);
  issues.push(...contrastIssues);

  // 2. Check touch target sizes (minimum 44x44px)
  const sizeIssues = await checkTouchTargets(page);
  issues.push(...sizeIssues);

  // 3. Check for missing alt text
  const altIssues = await checkAltText(page);
  issues.push(...altIssues);

  // 4. Check for proper heading hierarchy
  const headingIssues = await checkHeadings(page);
  issues.push(...headingIssues);

  // Calculate scores
  const critical = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;

  const wcagScore = Math.max(0, 100 - (critical * 20) - (warnings * 5));
  const uxScore = Math.max(0, 100 - (critical * 15) - (warnings * 5));

  return {
    issues,
    scores: {
      wcag: wcagScore,
      ux: uxScore,
      performance: 100, // Will be calculated from Playwright metrics
    },
  };
}

async function checkContrast(page: Page): Promise<RuleIssue[]> {
  const issues: RuleIssue[] = [];

  // Get all text elements
  const elements = await page.$$('body *');

  for (const element of elements) {
    const text = await element.textContent();
    if (!text || text.trim().length === 0) continue;

    // Get computed styles
    const styles = await element.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontSize: computed.fontSize,
      };
    });

    // Calculate contrast ratio
    const ratio = calculateContrastRatio(styles.color, styles.backgroundColor);
    const fontSize = parseFloat(styles.fontSize);

    // WCAG AA: 4.5:1 for normal text, 3:1 for large text (18pt+)
    const minRatio = fontSize >= 18 ? 3.0 : 4.5;

    if (ratio < minRatio) {
      const tagName = await element.evaluate(el => el.tagName);
      issues.push({
        severity: ratio < 3.0 ? 'critical' : 'warning',
        category: 'wcag',
        message: `Low contrast ratio: ${ratio.toFixed(1)}:1 (needs ${minRatio}:1)`,
        suggestion: 'Increase text darkness or background lightness',
        element: tagName,
      });
    }
  }

  return issues;
}

async function checkTouchTargets(page: Page): Promise<RuleIssue[]> {
  const issues: RuleIssue[] = [];

  // Get all interactive elements
  const interactiveElements = await page.$$('button, a, input, select, textarea');

  for (const element of interactiveElements) {
    const box = await element.boundingBox();
    if (!box) continue;

    // Minimum touch target: 44x44px (iOS), 48x48px (Android)
    const minSize = 44;

    if (box.width < minSize || box.height < minSize) {
      const tagName = await element.evaluate(el => el.tagName);
      issues.push({
        severity: box.width < 32 || box.height < 32 ? 'critical' : 'warning',
        category: 'ux',
        message: `Touch target too small: ${Math.round(box.width)}x${Math.round(box.height)}px`,
        suggestion: `Increase to at least ${minSize}x${minSize}px`,
        element: tagName,
      });
    }
  }

  return issues;
}

async function checkAltText(page: Page): Promise<RuleIssue[]> {
  const issues: RuleIssue[] = [];

  const images = await page.$$('img');

  for (const img of images) {
    const alt = await img.getAttribute('alt');
    const src = await img.getAttribute('src');

    if (alt === null || alt.trim() === '') {
      issues.push({
        severity: 'warning',
        category: 'wcag',
        message: 'Image missing alt text',
        suggestion: 'Add descriptive alt text for screen readers',
        element: src || 'img',
      });
    }
  }

  return issues;
}

async function checkHeadings(page: Page): Promise<RuleIssue[]> {
  const issues: RuleIssue[] = [];

  const headings = await page.$$('h1, h2, h3, h4, h5, h6');
  const levels: number[] = [];

  for (const heading of headings) {
    const tagName = await heading.evaluate(el => el.tagName);
    const level = parseInt(tagName[1]);
    levels.push(level);
  }

  // Check for skipped levels (h1 -> h3 without h2)
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      issues.push({
        severity: 'info',
        category: 'wcag',
        message: `Heading level skipped: h${levels[i - 1]} to h${levels[i]}`,
        suggestion: 'Use sequential heading levels for proper document structure',
      });
    }
  }

  return issues;
}

function calculateContrastRatio(color1: string, color2: string): number {
  // Parse RGB values
  const rgb1 = parseRGB(color1);
  const rgb2 = parseRGB(color2);

  // Calculate relative luminance
  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);

  // Calculate contrast ratio
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

function parseRGB(color: string): [number, number, number] {
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return [0, 0, 0];
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

function getRelativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
```

### Part 3: Combined Analysis

```typescript
// src/analysis/index.ts
import { Page } from 'playwright';
import { analyzeWithMoondream } from './vision.js';
import { analyzeWithRules } from './rules.js';

export interface AnalysisResult {
  aiIssues: Array<any>;
  ruleIssues: Array<any>;
  scores: {
    wcag: number;
    ux: number;
    accessibility: number;
  };
  summary: string;
}

export async function analyzeScreenshot(
  screenshotPath: string,
  page: Page,
  context: string
): Promise<AnalysisResult> {
  // Run both analyses in parallel
  const [aiResult, ruleResult] = await Promise.all([
    analyzeWithMoondream(screenshotPath, context).catch(() => ({
      issues: [],
      summary: 'AI analysis unavailable',
    })),
    analyzeWithRules(page),
  ]);

  // Combine results
  const allIssues = [...aiResult.issues, ...ruleResult.issues];
  const critical = allIssues.filter(i => i.severity === 'critical').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;

  return {
    aiIssues: aiResult.issues,
    ruleIssues: ruleResult.issues,
    scores: {
      wcag: ruleResult.scores.wcag,
      ux: ruleResult.scores.ux,
      accessibility: Math.round((ruleResult.scores.wcag + ruleResult.scores.ux) / 2),
    },
    summary: `Found ${allIssues.length} issues: ${critical} critical, ${warnings} warnings`,
  };
}
```

## Integration with Web Runner

Update `src/run/web.ts` to add `--analyze` flag and call analysis after each screenshot.

## CLI Integration

```bash
# Basic usage (free, local)
arela run web --flow test --analyze

# Skip AI, rules only (faster)
arela run web --flow test --analyze --no-ai

# Verbose output
arela run web --flow test --analyze --verbose
```

## Acceptance Criteria

- [ ] Moondream integration works
- [ ] Auto-pulls model if not available
- [ ] Contrast checking works (WCAG AA/AAA)
- [ ] Touch target validation works
- [ ] Alt text checking works
- [ ] Heading hierarchy checking works
- [ ] Combined analysis works
- [ ] Clear, colorized output
- [ ] Works without Ollama (rules only)
- [ ] Fast (< 5 seconds per screenshot)

## Dependencies

```bash
# User must install Ollama
brew install ollama

# Arela will auto-pull moondream on first use
ollama pull moondream
```

## Files to Create

- `src/analysis/vision.ts` - Moondream integration
- `src/analysis/rules.ts` - Rule-based checks
- `src/analysis/index.ts` - Combined analysis
- Update `src/run/web.ts` - Add --analyze flag
- Update `src/cli.ts` - Add --analyze option

## Expected Output

```bash
$ arela run web --flow signup --analyze

🧪 Running user flow: signup
  ✅ Navigate to /signup
  ✅ Captured screenshot
  
🤖 Analyzing with Moondream + Rules...

📊 Analysis Results:

❌ Critical Issues (2):
   [WCAG] Low contrast ratio: 2.1:1 (needs 4.5:1)
   💡 Increase text darkness or background lightness
   
   [UX] Touch target too small: 32x32px
   💡 Increase to at least 44x44px

⚠️  Warnings (1):
   [WCAG] Image missing alt text
   💡 Add descriptive alt text for screen readers

📊 Scores:
   WCAG: 68/100
   UX: 82/100
   Accessibility: 75/100
```

---

**This is FREE, FAST, and PRACTICAL!** 🎯
