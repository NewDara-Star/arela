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
    // Gracefully return empty result instead of throwing
    console.log('\n⚠️  Ollama not installed - AI analysis unavailable');
    console.log('💡 Install Ollama for FREE AI-powered analysis:');
    console.log('   brew install ollama');
    console.log('   (Falling back to rule-based checks only)\n');
    return {
      issues: [],
      summary: 'AI analysis unavailable (Ollama not installed)',
    };
  }

  // Check if moondream is available
  try {
    await execAsync('ollama list | grep moondream');
  } catch {
    console.log('📥 Pulling moondream model (first time only, ~1GB)...');
    try {
      await execAsync('ollama pull moondream');
      console.log('✅ Moondream model ready!\n');
    } catch (error) {
      console.log('\n⚠️  Failed to pull moondream model');
      console.log('💡 Try manually: ollama pull moondream');
      console.log('   (Falling back to rule-based checks only)\n');
      return {
        issues: [],
        summary: 'AI analysis unavailable (failed to pull model)',
      };
    }
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
  try {
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
  } catch (error) {
    console.log('\n⚠️  AI analysis failed');
    console.log('💡 Continuing with rule-based checks only\n');
    return {
      issues: [],
      summary: 'AI analysis failed (continuing with rules)',
    };
  }
}
