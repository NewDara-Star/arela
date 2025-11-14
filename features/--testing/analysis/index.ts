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
