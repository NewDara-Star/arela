# Rule 140: Current Context Awareness

**Status:** Active  
**Priority:** Critical  
**Category:** Research & Information Gathering  
**Last Updated:** 2025-11-09

## Purpose

Ensure AI agents always use current date/time context when researching, searching, or making assumptions about available technology, models, or features.

## The Problem

AI agents may have training data from months or years ago. Without current context awareness:

- Search for "latest models" but get 2024 results
- Assume GPT-4 is the newest when GPT-5 exists
- Miss new features released this quarter
- Provide outdated recommendations

## The Solution

**Always check current date/time before research:**

```typescript
import { getCurrentContext, buildSearchQuery } from './utils/current-context';

// Get current context
const ctx = getCurrentContext();
console.log(`Current: ${ctx.fullDate} (${ctx.year} ${ctx.quarter})`);

// Build search query with current context
const query = buildSearchQuery('OpenAI models', {
  includeYear: true,
  includeQuarter: true,
  includeLatest: true,
});
// Result: "OpenAI models 2025 Q4 latest"
```

## Rules

### 1. Check Date Before Research

**Always run this first:**

```typescript
const ctx = getCurrentContext();
console.log(getSearchContextMessage());
// "Searching with context: 2025 Q4 (2025-11-09)"
```

### 2. Include Current Context in Searches

**Bad:**
```
Search: "AI models list"
```

**Good:**
```typescript
const query = buildSearchQuery("AI models list");
// "AI models list 2025 latest"
```

### 3. Warn About Stale Data

**Check if information is outdated:**

```typescript
const warning = getStaleDataWarning('2024-06-15');
if (warning) {
  console.log(warning);
  // "⚠️  This data was last updated on 2024-06-15. 
  //     Current date is 2025-11-09. Information may be outdated."
}
```

### 4. Never Hardcode Years

**Bad:**
```typescript
const models = [
  "gpt-4", // Assumes this is latest
  "claude-3", // Hardcoded version
];
```

**Good:**
```typescript
const ctx = getCurrentContext();
// Search for models available in current year
const query = buildSearchQuery("OpenAI models complete list");
// Dynamically discover what's available NOW
```

## When to Use

### Research & Discovery

- ✅ Searching for latest models
- ✅ Finding current best practices
- ✅ Discovering new features
- ✅ Checking API availability

### Documentation

- ✅ Writing "as of [date]" disclaimers
- ✅ Noting when information was gathered
- ✅ Warning about potentially stale data

### Agent Discovery

- ✅ Finding available AI providers
- ✅ Listing current model versions
- ✅ Checking feature availability

## Examples

### Example 1: Model Discovery

```typescript
import { getCurrentContext, buildSearchQuery } from './utils/current-context';

async function discoverLatestModels() {
  const ctx = getCurrentContext();
  
  console.log(`Discovering models as of ${ctx.fullDate}`);
  
  // Build search with current context
  const query = buildSearchQuery('OpenAI GPT models', {
    includeYear: true,
    includeQuarter: true,
    includeLatest: true,
  });
  
  // Search: "OpenAI GPT models 2025 Q4 latest"
  const results = await searchWeb(query);
  
  return results;
}
```

### Example 2: Stale Data Warning

```typescript
import { getStaleDataWarning } from './utils/current-context';

function showModelInfo(model: { name: string; lastUpdated: string }) {
  console.log(`Model: ${model.name}`);
  
  const warning = getStaleDataWarning(model.lastUpdated);
  if (warning) {
    console.log(warning);
  }
}

showModelInfo({
  name: 'gpt-4',
  lastUpdated: '2024-03-15'
});
// Output:
// Model: gpt-4
// ⚠️  This data was last updated on 2024-03-15. 
//     Current date is 2025-11-09. Information may be outdated.
```

### Example 3: Dynamic Search Queries

```typescript
import { buildSearchQuery } from './utils/current-context';

// Instead of hardcoding year
const badQuery = "AI models 2024";

// Use dynamic context
const goodQuery = buildSearchQuery("AI models");
// Result: "AI models 2025 latest"

// With options
const detailedQuery = buildSearchQuery("Claude models", {
  includeYear: true,
  includeQuarter: true,
  includeLatest: true,
});
// Result: "Claude models 2025 Q4 latest"
```

## Integration

### In CLI Commands

```typescript
import { getCurrentContext, getSearchContextMessage } from './utils/current-context';

program
  .command('discover-models')
  .action(async () => {
    console.log(getSearchContextMessage());
    // "Searching with context: 2025 Q4 (2025-11-09)"
    
    const ctx = getCurrentContext();
    const query = `AI models ${ctx.year} ${ctx.quarter} latest`;
    
    // Perform search with current context
  });
```

### In Documentation

```markdown
# Available Models

**Last Updated:** ${getCurrentContext().fullDate}

This list reflects models available as of ${getCurrentContext().quarter} ${getCurrentContext().year}.
```

### In Agent Discovery

```typescript
import { getCurrentContext } from './utils/current-context';

async function discoverAgents() {
  const ctx = getCurrentContext();
  
  console.log(`Discovering agents (${ctx.fullDate})`);
  
  // Search for current models
  const openaiQuery = buildSearchQuery('OpenAI models');
  const claudeQuery = buildSearchQuery('Claude models');
  
  // Results will include current year and "latest"
}
```

## Benefits

### Accuracy

- Always get current information
- No outdated assumptions
- Discover new features automatically

### Transparency

- Clear when data was gathered
- Warn users about stale information
- Document temporal context

### Maintainability

- No hardcoded years to update
- Automatic context updates
- Future-proof searches

## Anti-Patterns

### ❌ Hardcoded Years

```typescript
const query = "AI models 2024"; // Will be wrong in 2025
```

### ❌ Assuming Latest

```typescript
const latestModel = "gpt-4"; // Assumes without checking
```

### ❌ No Date Context

```typescript
searchWeb("latest models"); // "Latest" when?
```

### ❌ Ignoring Stale Data

```typescript
// Using 6-month-old data without warning
return cachedModels; // No freshness check
```

## Checklist

Before any research or search:

- [ ] Import `getCurrentContext()`
- [ ] Log current date context
- [ ] Use `buildSearchQuery()` for searches
- [ ] Check data staleness with `getStaleDataWarning()`
- [ ] Include temporal context in documentation
- [ ] Never hardcode years or versions

## Monitoring

Track context awareness:

```typescript
// Log all searches with context
console.log(getSearchContextMessage());

// Warn about stale data
const warning = getStaleDataWarning(lastUpdated);
if (warning) {
  console.warn(warning);
}

// Display current context
console.log(formatCurrentContext());
```

## Related Rules

- **Rule 050:** Research & Documentation - Use current sources
- **Rule 130:** Automated QA Testing - Test with current tools
- **Rule 010:** Code Quality - Keep dependencies current

## Version History

- **2025-11-09:** Created rule for dynamic date context awareness
