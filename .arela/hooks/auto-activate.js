/**
 * Auto-Activation Hook for Arela Rules
 * 
 * Triggered on: UserPromptSubmit
 * Purpose: Analyzes user prompts and suggests relevant rules/workflows
 * 
 * Based on: https://github.com/diet103/claude-code-infrastructure-showcase
 */

const fs = require('fs');
const path = require('path');

/**
 * Main hook function
 * @param {Object} context - Claude Code hook context
 * @param {string} context.prompt - User's prompt
 * @param {Array} context.files - Currently open files
 * @param {string} context.workspaceRoot - Workspace root path
 */
async function onUserPromptSubmit(context) {
  const { prompt, files, workspaceRoot } = context;
  
  // Load skill rules
  const rulesPath = path.join(workspaceRoot, '.arela', 'skill-rules.json');
  if (!fs.existsSync(rulesPath)) {
    return null; // No rules configured
  }
  
  const skillRules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
  
  // Analyze prompt and context
  const matches = analyzePrompt(prompt, files, skillRules);
  
  if (matches.length === 0) {
    return null; // No relevant rules found
  }
  
  // Generate suggestion message
  return generateSuggestion(matches, workspaceRoot);
}

/**
 * Analyze prompt against skill rules
 */
function analyzePrompt(prompt, files, skillRules) {
  const matches = [];
  const promptLower = prompt.toLowerCase();
  
  // Get file contexts
  const filePatterns = files.map(f => f.path);
  
  for (const rule of skillRules.rules) {
    let score = 0;
    const reasons = [];
    
    // Check keywords
    if (rule.triggers.keywords) {
      for (const keyword of rule.triggers.keywords) {
        if (promptLower.includes(keyword.toLowerCase())) {
          score += 10;
          reasons.push(`Keyword: "${keyword}"`);
        }
      }
    }
    
    // Check file patterns
    if (rule.triggers.filePatterns && filePatterns.length > 0) {
      for (const pattern of rule.triggers.filePatterns) {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        if (filePatterns.some(f => regex.test(f))) {
          score += 15;
          reasons.push(`File context: ${pattern}`);
        }
      }
    }
    
    // Check contexts
    if (rule.triggers.contexts) {
      const contextIndicators = skillRules.contexts || {};
      for (const contextName of rule.triggers.contexts) {
        const context = contextIndicators[contextName];
        if (context && context.indicators) {
          for (const indicator of context.indicators) {
            if (promptLower.includes(indicator.toLowerCase())) {
              score += 5;
              reasons.push(`Context: ${contextName}`);
              break;
            }
          }
        }
      }
    }
    
    // If score is high enough, add to matches
    if (score >= 10) {
      matches.push({
        rule,
        score,
        reasons: [...new Set(reasons)], // Deduplicate
      });
    }
  }
  
  // Sort by priority and score
  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  matches.sort((a, b) => {
    const priorityDiff = (priorityOrder[b.rule.priority] || 0) - (priorityOrder[a.rule.priority] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return b.score - a.score;
  });
  
  return matches.slice(0, 3); // Top 3 matches
}

/**
 * Generate suggestion message
 */
function generateSuggestion(matches, workspaceRoot) {
  const lines = [
    '📋 **Arela CTO Guidance**',
    '',
    'Based on your request, these rules/workflows may be relevant:',
    '',
  ];
  
  for (const match of matches) {
    const { rule, reasons } = match;
    const priority = rule.priority === 'critical' ? '🚨' : rule.priority === 'high' ? '⚠️' : 'ℹ️';
    
    lines.push(`${priority} **${rule.id}** (${rule.priority} priority)`);
    lines.push(`   Matched: ${reasons.join(', ')}`);
    lines.push('');
    
    // List activated rules/workflows
    for (const resource of rule.activates) {
      const fullPath = path.join(workspaceRoot, '.arela', resource);
      if (fs.existsSync(fullPath)) {
        lines.push(`   📄 \`.arela/${resource}\``);
      }
    }
    lines.push('');
  }
  
  lines.push('---');
  lines.push('💡 *Tip: These rules are automatically loaded. Review them for best practices.*');
  
  return {
    type: 'suggestion',
    message: lines.join('\n'),
    files: matches.flatMap(m => m.rule.activates.map(r => `.arela/${r}`)),
  };
}

module.exports = { onUserPromptSubmit };
