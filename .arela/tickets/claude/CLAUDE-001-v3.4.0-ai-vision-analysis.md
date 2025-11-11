# CLAUDE-001: AI Vision Analysis Integration (v3.4.0)

**Agent:** claude  
**Priority:** critical  
**Complexity:** complex  
**Status:** pending

## Context

Add AI vision analysis to screenshot testing using **Moondream (Ollama)** - a lightweight, free, local vision model. Combined with rule-based checks for WCAG compliance, contrast, and sizing.

**Why Moondream:**
- FREE (runs locally via Ollama)
- Fast (1.8B parameters)
- Private (screenshots never leave your machine)
- Good enough for UX/accessibility analysis

## Technical Task

Create `src/analysis/vision.ts` that:
1. Takes screenshot path as input
2. Sends to vision AI (Claude or GPT-4V)
3. Analyzes for UX/accessibility issues
4. Returns structured results

## Implementation

```typescript
// src/analysis/vision.ts
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs-extra';
import path from 'path';

interface VisionIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'ux' | 'accessibility' | 'visual' | 'performance';
  message: string;
  suggestion: string;
  location?: string;
}

interface VisionAnalysisResult {
  issues: VisionIssue[];
  scores: {
    accessibility: number;  // 0-100
    ux: number;            // 0-100
    visual: number;        // 0-100
  };
  summary: string;
}

export async function analyzeScreenshot(
  screenshotPath: string,
  context?: string
): Promise<VisionAnalysisResult> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Read screenshot as base64
  const imageBuffer = await fs.readFile(screenshotPath);
  const base64Image = imageBuffer.toString('base64');
  const mediaType = screenshotPath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  // Craft prompt
  const prompt = `You are a UX and accessibility expert analyzing a screenshot.

Context: ${context || 'Web application screenshot'}

Analyze this screenshot for:
1. UX Issues - Poor contrast, small text, unclear CTAs, missing feedback
2. Accessibility Issues - WCAG violations, poor color contrast, small touch targets
3. Visual Issues - Broken layouts, overlapping elements, cut-off text

For each issue found, provide:
- Severity (critical/warning/info)
- Category (ux/accessibility/visual)
- Clear description
- Actionable suggestion to fix

Also provide scores (0-100) for:
- Accessibility (WCAG compliance)
- UX (user experience quality)
- Visual (layout and design quality)

Return as JSON:
{
  "issues": [
    {
      "severity": "critical",
      "category": "accessibility",
      "message": "Email field has contrast ratio 2.1:1",
      "suggestion": "Increase contrast to at least 4.5:1 for WCAG AA compliance",
      "location": "Email input field"
    }
  ],
  "scores": {
    "accessibility": 68,
    "ux": 82,
    "visual": 90
  },
  "summary": "Found 3 issues: 1 critical, 2 warnings"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  // Parse response
  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Extract JSON from response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON from Claude response');
  }

  const result: VisionAnalysisResult = JSON.parse(jsonMatch[0]);
  return result;
}

export async function analyzeFlow(
  screenshots: Array<{ path: string; name: string; step: string }>,
  flowName: string
): Promise<{
  flowIssues: VisionIssue[];
  stepAnalysis: Array<{ step: string; issues: VisionIssue[]; scores: any }>;
  overallScores: { accessibility: number; ux: number; visual: number };
}> {
  const stepAnalysis = [];
  const allIssues: VisionIssue[] = [];

  for (const screenshot of screenshots) {
    const context = `Flow: ${flowName}, Step: ${screenshot.step}`;
    const result = await analyzeScreenshot(screenshot.path, context);
    
    stepAnalysis.push({
      step: screenshot.step,
      issues: result.issues,
      scores: result.scores,
    });

    allIssues.push(...result.issues);
  }

  // Calculate overall scores (average)
  const overallScores = {
    accessibility: Math.round(
      stepAnalysis.reduce((sum, s) => sum + s.scores.accessibility, 0) / stepAnalysis.length
    ),
    ux: Math.round(
      stepAnalysis.reduce((sum, s) => sum + s.scores.ux, 0) / stepAnalysis.length
    ),
    visual: Math.round(
      stepAnalysis.reduce((sum, s) => sum + s.scores.visual, 0) / stepAnalysis.length
    ),
  };

  return {
    flowIssues: allIssues,
    stepAnalysis,
    overallScores,
  };
}
```

## Integration with Web Runner

Update `src/run/web.ts`:

```typescript
// Add to runWebApp options
export interface WebRunnerOptions {
  url: string;
  flow: string;
  headless?: boolean;
  record?: boolean;
  analyze?: boolean;  // NEW
}

// After flow execution
if (opts.analyze) {
  console.log(pc.cyan('\n🤖 Running AI analysis...\n'));
  
  const analysis = await analyzeFlow(
    results.screenshots.map((s, i) => ({
      path: s,
      name: `step-${i}`,
      step: results.steps[i].action,
    })),
    flow.name
  );

  // Print results
  console.log(pc.bold('\n📊 AI Analysis Results:\n'));
  
  if (analysis.flowIssues.length > 0) {
    const critical = analysis.flowIssues.filter(i => i.severity === 'critical');
    const warnings = analysis.flowIssues.filter(i => i.severity === 'warning');
    const info = analysis.flowIssues.filter(i => i.severity === 'info');

    if (critical.length > 0) {
      console.log(pc.red(`\n❌ Critical Issues (${critical.length}):`));
      critical.forEach(issue => {
        console.log(pc.red(`   ${issue.message}`));
        console.log(pc.gray(`   💡 ${issue.suggestion}`));
      });
    }

    if (warnings.length > 0) {
      console.log(pc.yellow(`\n⚠️  Warnings (${warnings.length}):`));
      warnings.forEach(issue => {
        console.log(pc.yellow(`   ${issue.message}`));
        console.log(pc.gray(`   💡 ${issue.suggestion}`));
      });
    }

    if (info.length > 0) {
      console.log(pc.cyan(`\n💡 Suggestions (${info.length}):`));
      info.forEach(issue => {
        console.log(pc.cyan(`   ${issue.message}`));
      });
    }
  } else {
    console.log(pc.green('✅ No issues found!'));
  }

  console.log(pc.bold('\n📊 Scores:'));
  console.log(`   Accessibility: ${analysis.overallScores.accessibility}/100`);
  console.log(`   UX: ${analysis.overallScores.ux}/100`);
  console.log(`   Visual: ${analysis.overallScores.visual}/100`);
}
```

## CLI Integration

Update `src/cli.ts`:

```typescript
.option('--analyze', 'Run AI analysis on screenshots', false)
```

## Acceptance Criteria

- [ ] Can analyze single screenshot
- [ ] Can analyze entire flow
- [ ] Detects UX issues (contrast, sizing, clarity)
- [ ] Detects accessibility issues (WCAG violations)
- [ ] Detects visual issues (layout problems)
- [ ] Returns structured results
- [ ] Provides actionable suggestions
- [ ] Calculates scores (0-100)
- [ ] Integrates with web runner
- [ ] CLI flag `--analyze` works
- [ ] Clear, colorized output
- [ ] Handles API errors gracefully

## Files to Create/Modify

- `src/analysis/vision.ts` (create)
- `src/run/web.ts` (modify - add analysis)
- `src/cli.ts` (modify - add --analyze flag)
- `package.json` (add @anthropic-ai/sdk)

## Dependencies

```bash
npm install @anthropic-ai/sdk
```

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## Testing

```bash
# Test with tic-tac-toe
arela run web --url http://localhost:8080 --flow tic-tac-toe --analyze

# Test with Stride app
arela run web --url http://localhost:8081 --flow stride-guest --analyze
```

## Expected Output

```
🤖 Running AI analysis...

📊 AI Analysis Results:

❌ Critical Issues (1):
   Email field has contrast ratio 2.1:1 (needs 4.5:1)
   💡 Increase text color darkness or background lightness

⚠️  Warnings (2):
   Submit button too small (32x32px, needs 44x44px)
   💡 Increase button size for better touch targets
   
   No loading indicator on form submit
   💡 Add spinner or disable button while submitting

💡 Suggestions (1):
   Consider adding form validation feedback

📊 Scores:
   Accessibility: 68/100
   UX: 82/100
   Visual: 90/100
```

## Report Required

- Summary of implementation
- Test results with real apps
- Screenshots showing analysis output
- Performance impact (API call time)
- Cost per analysis (~$0.01 per screenshot)

---

**This is the core feature that makes v3.4.0 magical.** 🎯
