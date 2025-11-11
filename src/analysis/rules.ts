// src/analysis/rules.ts
import { Page } from 'playwright';

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
    const styles = await element.evaluate((el: any) => {
      const computed = (globalThis as any).window.getComputedStyle(el);
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
