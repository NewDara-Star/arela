# Arela Hooks System

## Overview

Arela hooks enable **automatic rule activation** based on context. No more remembering which rule to apply—the system suggests them automatically.

## How It Works

```
User types prompt → Hook analyzes → Suggests relevant rules → Rules auto-load
```

## Available Hooks

### 1. Auto-Activate Hook (`auto-activate.js`)

**Triggered on:** `UserPromptSubmit`  
**Purpose:** Analyzes prompts and suggests relevant rules

**Example:**
```
User: "How should we design the authentication system?"

Hook detects:
- Keywords: "design", "authentication", "system"
- Suggests:
  - rules/060-security-first.md
  - rules/090-adr-discipline.md
  - workflows/architect-spec.prompt.md
```

### 2. File Context Hook (`file-context.js`)

**Triggered on:** `FileOpen`  
**Purpose:** Suggests rules based on file type/location

**Example:**
```
User opens: tests/auth.test.ts

Hook detects:
- File pattern: **/test/**/*.test.ts
- Suggests:
  - rules/070-testing-pyramid.md
  - rules/130-automated-qa.md
```

### 3. Pre-Commit Hook (`pre-commit.js`)

**Triggered on:** `PreCommit`  
**Purpose:** Runs `arela doctor` before commits

**Example:**
```
User: git commit -m "Add feature"

Hook runs:
- npx arela doctor --eval
- Blocks commit if quality gates fail
```

## Configuration

### skill-rules.json

The `skill-rules.json` file defines activation rules:

```json
{
  "rules": [
    {
      "id": "architecture-decisions",
      "triggers": {
        "keywords": ["architecture", "design", "system"],
        "filePatterns": ["**/docs/adr/**"],
        "contexts": ["new feature", "refactoring"]
      },
      "activates": [
        "rules/015-modular-monolith.md",
        "rules/090-adr-discipline.md"
      ],
      "priority": "high"
    }
  ]
}
```

### Trigger Types

**Keywords:**
- Matches words in user prompts
- Case-insensitive
- Example: `["test", "testing", "qa"]`

**File Patterns:**
- Glob patterns for file paths
- Example: `["**/test/**", "**/*.test.ts"]`

**Contexts:**
- High-level scenarios
- Example: `["new feature", "bug fix", "refactoring"]`

**Priority:**
- `critical` - Show first, red icon 🚨
- `high` - Show early, warning icon ⚠️
- `medium` - Show if relevant, info icon ℹ️
- `low` - Show only if highly relevant

## Installation

### For Claude Code

1. **Copy hooks to your project:**
```bash
cp -r .arela/hooks /path/to/your/project/.arela/
```

2. **Copy skill-rules.json:**
```bash
cp .arela/skill-rules.json /path/to/your/project/.arela/
```

3. **Configure Claude Code:**

Add to `.claude/settings.json`:
```json
{
  "hooks": {
    "UserPromptSubmit": ".arela/hooks/auto-activate.js",
    "FileOpen": ".arela/hooks/file-context.js",
    "PreCommit": ".arela/hooks/pre-commit.js"
  }
}
```

4. **Restart Claude Code**

### For Windsurf

Add to `.windsurf/settings.json`:
```json
{
  "arela": {
    "autoActivation": true,
    "hooksPath": ".arela/hooks"
  }
}
```

## Customization

### Add New Trigger

Edit `skill-rules.json`:

```json
{
  "id": "my-custom-rule",
  "triggers": {
    "keywords": ["my", "custom", "keywords"],
    "filePatterns": ["**/my-files/**"],
    "contexts": ["my context"]
  },
  "activates": [
    "rules/my-rule.md"
  ],
  "priority": "high"
}
```

### Add New Context

Define context indicators:

```json
{
  "contexts": {
    "my context": {
      "indicators": ["indicator1", "indicator2"],
      "suggests": ["rule-id-1", "rule-id-2"]
    }
  }
}
```

### Adjust Scoring

Edit `auto-activate.js`:

```javascript
// Keyword match
if (promptLower.includes(keyword.toLowerCase())) {
  score += 10; // Adjust this value
}

// File pattern match
if (regex.test(filePath)) {
  score += 15; // Adjust this value
}

// Context match
if (indicator matches) {
  score += 5; // Adjust this value
}

// Minimum score to show
if (score >= 10) { // Adjust threshold
  matches.push(...);
}
```

## Testing

### Test Auto-Activation

```bash
# In Claude Code, type:
"How should we design the authentication system?"

# Expected output:
📋 Arela CTO Guidance

Based on your request, these rules/workflows may be relevant:

🚨 security (critical priority)
   Matched: Keyword: "authentication", Context: new feature
   
   📄 .arela/rules/060-security-first.md
   📄 .arela/workflows/architect-spec.prompt.md
```

### Test File Context

```bash
# Open a test file:
code tests/auth.test.ts

# Expected output:
📁 Context for `auth.test.ts`

⚠️ testing (high priority)
   📄 .arela/rules/070-testing-pyramid.md
   📄 .arela/rules/130-automated-qa.md
```

### Debug Hooks

Add logging to hooks:

```javascript
console.log('[Arela Hook] Analyzing prompt:', prompt);
console.log('[Arela Hook] Matches found:', matches.length);
console.log('[Arela Hook] Top match:', matches[0]);
```

## Performance

### Hook Execution Time

- **Auto-activate:** < 50ms
- **File context:** < 20ms
- **Pre-commit:** Depends on `arela doctor` (usually < 2s)

### Optimization Tips

1. **Limit file patterns** - Use specific patterns
2. **Cache skill rules** - Load once, reuse
3. **Limit matches** - Show top 3 only
4. **Async execution** - Don't block user

## Troubleshooting

### Hooks Not Firing

**Check:**
1. Is `skill-rules.json` present?
2. Are hooks registered in settings?
3. Is Claude Code restarted?
4. Check console for errors

**Debug:**
```javascript
// Add to hook file
console.log('[Arela] Hook loaded');
console.log('[Arela] Rules path:', rulesPath);
console.log('[Arela] Rules loaded:', skillRules.rules.length);
```

### Wrong Rules Suggested

**Adjust:**
1. Check keyword matches
2. Adjust scoring weights
3. Add more specific patterns
4. Increase minimum score threshold

### Too Many Suggestions

**Reduce:**
1. Increase minimum score (default: 10)
2. Reduce max matches (default: 3)
3. Use more specific keywords
4. Increase priority thresholds

## Best Practices

### Keywords

✅ **Good:** Specific, unambiguous
```json
["authentication", "jwt", "oauth"]
```

❌ **Bad:** Generic, common
```json
["the", "and", "code"]
```

### File Patterns

✅ **Good:** Specific paths
```json
["**/tests/**/*.test.ts", "**/src/auth/**"]
```

❌ **Bad:** Too broad
```json
["**/*.ts", "**/*"]
```

### Priorities

- **Critical:** Security, incidents, production issues
- **High:** Architecture, testing, performance
- **Medium:** Documentation, communication
- **Low:** Nice-to-haves, optional practices

## Advanced Usage

### Conditional Activation

```javascript
// In hook file
if (prompt.includes('production') && rule.id === 'incident-response') {
  score += 50; // Boost score for production issues
}
```

### Multi-Hook Coordination

```javascript
// Share context between hooks
const context = {
  lastPrompt: prompt,
  lastFiles: files,
  timestamp: Date.now()
};

global.arelaContext = context;
```

### Custom Suggestions

```javascript
// Generate custom message
return {
  type: 'custom',
  message: '🚨 **CRITICAL**: Production incident detected!\n\nFollow incident-response.prompt.md immediately.',
  files: ['workflows/incident-response.prompt.md'],
  priority: 'critical'
};
```

## Integration with Arela Doctor

Hooks can trigger `arela doctor` checks:

```javascript
// In pre-commit hook
const { execSync } = require('child_process');

try {
  execSync('npx arela doctor --eval', { cwd: workspaceRoot });
  return { type: 'success', message: '✅ Quality gates passed' };
} catch (error) {
  return { 
    type: 'error', 
    message: '❌ Quality gates failed. Fix issues before committing.',
    blocking: true 
  };
}
```

## Summary

**Arela hooks enable:**
- ✅ Automatic rule activation
- ✅ Context-aware suggestions
- ✅ Quality gates enforcement
- ✅ Zero manual lookup

**Result:** The right rule, at the right time, automatically.

🚀 **Smart CTO guidance, zero effort.**
