# Arela Auto-Activation System

## Overview

Arela now includes an **auto-activation system** that suggests relevant rules and workflows based on your prompts and file context.

**Inspired by:** [claude-code-infrastructure-showcase](https://github.com/diet103/claude-code-infrastructure-showcase)

## The Problem

**Before:**
- You have to remember which rule applies
- You have to manually search for workflows
- Rules sit unused in `.arela/` folder
- No context-aware guidance

**After:**
- Rules activate automatically when relevant
- Workflows suggested based on your prompt
- Context-aware based on files you're editing
- Zero manual lookup required

## How It Works

```
┌─────────────────┐
│  User Prompt    │
│  "Design auth"  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auto-Activate  │
│  Hook Analyzes  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Matches Rules  │
│  - Security     │
│  - Architecture │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Suggests       │
│  Relevant Docs  │
└─────────────────┘
```

## Quick Start

### 1. Install Arela (if not already)

```bash
npx @newdara/preset-cto@latest setup
```

### 2. Configure Claude Code

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": ".arela/hooks/auto-activate.js",
    "FileOpen": ".arela/hooks/file-context.js"
  }
}
```

### 3. Restart Claude Code

```bash
# Restart your IDE
```

### 4. Test It

Type in Claude Code:
```
"How should we design the authentication system?"
```

Expected output:
```
📋 Arela CTO Guidance

Based on your request, these rules/workflows may be relevant:

🚨 security (critical priority)
   Matched: Keyword: "authentication", Context: new feature
   
   📄 .arela/rules/060-security-first.md
   📄 .arela/workflows/architect-spec.prompt.md

⚠️ architecture-decisions (high priority)
   Matched: Keyword: "design", "system"
   
   📄 .arela/rules/015-modular-monolith.md
   📄 .arela/rules/090-adr-discipline.md
```

## Configuration

### skill-rules.json

The brain of the auto-activation system. Located at `.arela/skill-rules.json`.

**Structure:**
```json
{
  "rules": [
    {
      "id": "rule-name",
      "triggers": {
        "keywords": ["word1", "word2"],
        "filePatterns": ["**/path/**"],
        "contexts": ["context-name"]
      },
      "activates": [
        "rules/rule-file.md",
        "workflows/workflow-file.md"
      ],
      "priority": "high"
    }
  ],
  "contexts": {
    "context-name": {
      "indicators": ["indicator1", "indicator2"],
      "suggests": ["rule-id"]
    }
  }
}
```

### Example: Add Custom Rule

```json
{
  "id": "api-design",
  "triggers": {
    "keywords": ["api", "endpoint", "rest", "graphql"],
    "filePatterns": ["**/api/**", "**/routes/**"],
    "contexts": ["new feature"]
  },
  "activates": [
    "rules/015-modular-monolith.md",
    "workflows/architect-spec.prompt.md"
  ],
  "priority": "high"
}
```

## Use Cases

### 1. Architecture Decisions

**Prompt:**
```
"Should we use microservices or a monolith?"
```

**Auto-activates:**
- `rules/015-modular-monolith.md`
- `rules/025-two-way-door-decisions.md`
- `workflows/cto-decision-adr.prompt.md`

### 2. Testing Strategy

**Prompt:**
```
"How should we test this feature?"
```

**Auto-activates:**
- `rules/070-testing-pyramid.md`
- `rules/130-automated-qa.md`
- `workflows/qa-automation.prompt.md`

### 3. Security Review

**Prompt:**
```
"Review this auth code for security issues"
```

**Auto-activates:**
- `rules/060-security-first.md` (critical priority)

### 4. Performance Optimization

**Prompt:**
```
"The page is loading slowly"
```

**Auto-activates:**
- `rules/110-performance-budget.md`

### 5. Production Incident

**Prompt:**
```
"Production is down, need to fix ASAP"
```

**Auto-activates:**
- `workflows/incident-response.prompt.md` (critical priority)
- `rules/085-blameless-culture.md`

### 6. File Context

**Open file:** `tests/auth.test.ts`

**Auto-activates:**
- `rules/070-testing-pyramid.md`
- `rules/130-automated-qa.md`

**Open file:** `docs/adr/001-database.md`

**Auto-activates:**
- `rules/090-adr-discipline.md`
- `workflows/cto-decision-adr.prompt.md`

## Customization

### Adjust Sensitivity

Edit `.arela/hooks/auto-activate.js`:

```javascript
// More sensitive (more suggestions)
if (score >= 5) { // Lower threshold
  matches.push(...);
}

// Less sensitive (fewer suggestions)
if (score >= 20) { // Higher threshold
  matches.push(...);
}
```

### Add Custom Keywords

Edit `.arela/skill-rules.json`:

```json
{
  "id": "your-rule",
  "triggers": {
    "keywords": [
      "your",
      "custom",
      "keywords"
    ]
  }
}
```

### Change Priority

```json
{
  "id": "your-rule",
  "priority": "critical" // critical | high | medium | low
}
```

## Integration with Windsurf

For Windsurf (Cascade), add to `.windsurf/settings.json`:

```json
{
  "arela": {
    "autoActivation": true,
    "hooksPath": ".arela/hooks",
    "skillRules": ".arela/skill-rules.json"
  }
}
```

Then in Cascade:
```
@arela [your prompt]
```

Cascade will automatically load relevant rules.

## The 500-Line Rule

**Problem:** Large rules hit context limits

**Solution:** Progressive disclosure

### Before (Bad)
```
rules/
  huge-rule.md (2000 lines) ❌
```

### After (Good)
```
rules/
  rule-name.md (< 500 lines) ✅
  resources/
    topic-1.md (< 500 lines) ✅
    topic-2.md (< 500 lines) ✅
```

### Implementation

**Main file** (`rule-name.md`):
```markdown
# Rule Name

## Quick Reference
[High-level overview, < 500 lines]

## Deep Dives
For detailed guidance, see:
- [Topic 1](resources/topic-1.md)
- [Topic 2](resources/topic-2.md)
```

**Resource files** (`resources/topic-1.md`):
```markdown
# Topic 1 Deep Dive

[Detailed content, < 500 lines]
```

**Benefits:**
- ✅ Faster loading
- ✅ Better context management
- ✅ Progressive disclosure
- ✅ Easier maintenance

## Arela Rules Following 500-Line Rule

Currently refactored:
- ✅ All rules are < 500 lines
- ✅ Workflows are modular
- ✅ Documentation is split

If you find a rule > 500 lines, please refactor it!

## Performance

### Benchmarks

- **Hook execution:** < 50ms
- **Rule matching:** < 20ms
- **File analysis:** < 10ms
- **Total overhead:** < 100ms

### Optimization

**Caching:**
```javascript
// Cache skill rules
let cachedRules = null;

function loadRules() {
  if (!cachedRules) {
    cachedRules = JSON.parse(fs.readFileSync(rulesPath));
  }
  return cachedRules;
}
```

**Lazy loading:**
```javascript
// Only load rules when needed
if (prompt.length < 10) {
  return null; // Skip for short prompts
}
```

## Troubleshooting

### No Suggestions Appearing

**Check:**
1. Is `skill-rules.json` present in `.arela/`?
2. Are hooks registered in settings?
3. Is IDE restarted?
4. Are keywords matching?

**Debug:**
```javascript
// Add to auto-activate.js
console.log('[Arela] Prompt:', prompt);
console.log('[Arela] Matches:', matches);
```

### Wrong Rules Suggested

**Adjust:**
1. Check keyword list
2. Adjust scoring weights
3. Add more specific patterns
4. Review priority levels

### Too Many Suggestions

**Reduce:**
1. Increase minimum score threshold
2. Limit max matches (default: 3)
3. Use more specific keywords
4. Raise priority bar

## Advanced Features

### Multi-Hook Coordination

```javascript
// Share context between hooks
global.arelaContext = {
  lastPrompt: prompt,
  lastFiles: files,
  timestamp: Date.now()
};

// In another hook
const context = global.arelaContext;
if (Date.now() - context.timestamp < 5000) {
  // Use recent context
}
```

### Conditional Activation

```javascript
// Boost score for production issues
if (prompt.includes('production') && rule.id === 'incident-response') {
  score += 100; // Ensure this shows first
}
```

### Custom Messages

```javascript
// Generate urgent message
if (rule.priority === 'critical') {
  return {
    type: 'alert',
    message: '🚨 CRITICAL: ' + rule.id,
    files: rule.activates,
    blocking: true
  };
}
```

## Comparison with Other Systems

### vs. Manual Lookup

| Feature | Manual | Auto-Activation |
|---------|--------|-----------------|
| Speed | Slow (minutes) | Fast (< 100ms) |
| Accuracy | Hit or miss | High (scored) |
| Context | None | File + prompt |
| Effort | High | Zero |

### vs. Static Rules

| Feature | Static | Auto-Activation |
|---------|--------|-----------------|
| Relevance | Always shown | Context-aware |
| Noise | High | Low |
| Adoption | Low | High |
| Maintenance | Hard | Easy |

## Best Practices

### Keywords

✅ **Do:**
- Use specific, technical terms
- Include variations (test, testing, tests)
- Add domain-specific terms

❌ **Don't:**
- Use common words (the, and, is)
- Use ambiguous terms
- Overload with keywords

### File Patterns

✅ **Do:**
- Use specific paths (`**/tests/**/*.test.ts`)
- Match file purpose
- Include common variations

❌ **Don't:**
- Use overly broad patterns (`**/*`)
- Match unrelated files
- Forget about nested paths

### Priorities

✅ **Do:**
- Critical: Security, incidents
- High: Architecture, testing
- Medium: Documentation
- Low: Nice-to-haves

❌ **Don't:**
- Make everything critical
- Ignore priority levels
- Use same priority for all

## Future Enhancements

### Planned Features

- [ ] Machine learning for better matching
- [ ] User feedback loop (thumbs up/down)
- [ ] Historical pattern analysis
- [ ] Team-specific customization
- [ ] A/B testing for rules
- [ ] Analytics dashboard

### Community Contributions

Want to improve auto-activation?

1. Fork the repo
2. Add your enhancement
3. Submit PR
4. Share your patterns

## Summary

**Arela Auto-Activation:**
- ✅ Zero manual lookup
- ✅ Context-aware suggestions
- ✅ < 100ms overhead
- ✅ Fully customizable
- ✅ Production-tested patterns

**Result:** The right rule, at the right time, automatically.

🚀 **Smart CTO guidance, zero effort.**
