/**
 * File Context Hook for Arela Rules
 * 
 * Triggered on: FileOpen
 * Purpose: Suggests rules based on file type and location
 */

const fs = require('fs');
const path = require('path');

/**
 * Main hook function
 * @param {Object} context - Claude Code hook context
 * @param {string} context.filePath - Opened file path
 * @param {string} context.workspaceRoot - Workspace root path
 */
async function onFileOpen(context) {
  const { filePath, workspaceRoot } = context;
  
  // Load skill rules
  const rulesPath = path.join(workspaceRoot, '.arela', 'skill-rules.json');
  if (!fs.existsSync(rulesPath)) {
    return null;
  }
  
  const skillRules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
  
  // Analyze file context
  const matches = analyzeFile(filePath, skillRules);
  
  if (matches.length === 0) {
    return null;
  }
  
  // Generate contextual suggestion
  return generateFileSuggestion(matches, filePath, workspaceRoot);
}

/**
 * Analyze file against skill rules
 */
function analyzeFile(filePath, skillRules) {
  const matches = [];
  const relativePath = filePath;
  
  for (const rule of skillRules.rules) {
    if (!rule.triggers.filePatterns) continue;
    
    for (const pattern of rule.triggers.filePatterns) {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      
      if (regex.test(relativePath)) {
        matches.push({
          rule,
          pattern,
          priority: rule.priority,
        });
        break; // One match per rule is enough
      }
    }
  }
  
  // Sort by priority
  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  matches.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
  
  return matches.slice(0, 2); // Top 2 matches
}

/**
 * Generate file-specific suggestion
 */
function generateFileSuggestion(matches, filePath, workspaceRoot) {
  const fileName = path.basename(filePath);
  
  const lines = [
    `📁 **Context for \`${fileName}\`**`,
    '',
  ];
  
  for (const match of matches) {
    const { rule } = match;
    const priority = rule.priority === 'critical' ? '🚨' : rule.priority === 'high' ? '⚠️' : 'ℹ️';
    
    lines.push(`${priority} **${rule.id}**`);
    
    // List relevant resources
    for (const resource of rule.activates.slice(0, 2)) {
      lines.push(`   📄 \`.arela/${resource}\``);
    }
    lines.push('');
  }
  
  return {
    type: 'context',
    message: lines.join('\n'),
    files: matches.flatMap(m => m.rule.activates.slice(0, 2).map(r => `.arela/${r}`)),
  };
}

module.exports = { onFileOpen };
