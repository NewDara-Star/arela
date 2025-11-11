# CLAUDE-003: Smart .ragignore Auto-Generation (v3.3.2)

**Agent:** claude  
**Priority:** high  
**Complexity:** medium  
**Status:** pending

## Context

When RAG indexing encounters files that fail to embed (too large, invalid strings, etc.), it should:
1. **Automatically add them to `.ragignore`**
2. **Analyze the file to decide if it should be refactored or ignored**
3. **Provide intelligent recommendations**

## The Problem

**Current behavior:**
```bash
⚠ Failed to embed chunk in venv/lib/python3.14/site-packages/idna/uts46data.py
⚠ Failed to embed chunk in venv/lib/python3.14/site-packages/idna/uts46data.py
...
😵‍💫 Indexing went sideways: Invalid string length
```

User has to manually:
1. Figure out which files failed
2. Create `.ragignore`
3. Add patterns
4. Re-run indexing

## The Solution

**Smart auto-generation with analysis:**

1. **Detect failures** - Track which files fail to embed
2. **Auto-create `.ragignore`** - Add failed patterns automatically
3. **Analyze each file** - Decide: refactor or ignore?
4. **Provide recommendations** - Tell user what to do

## User Experience

**New behavior:**
```bash
$ arela index

📚 Building your RAG brain...
Found 3659 files to index

⚠️  Failed to embed: venv/lib/python3.14/site-packages/idna/uts46data.py
    Reason: File too large (2.3 MB)
    
🤖 Analyzing failure...
    
✅ Auto-added to .ragignore:
    venv/

💡 Recommendation: IGNORE
    This is a Python virtual environment dependency.
    These files are not part of your source code.
    
⚠️  Failed to embed: src/data/large-dataset.json
    Reason: File too large (5.1 MB)
    
🤖 Analyzing failure...
    
⚠️  Recommendation: REFACTOR
    This appears to be application data.
    Consider:
    1. Split into smaller files
    2. Move to database
    3. Use pagination/streaming
    
    Added to .ragignore for now.
    
📝 Created .ragignore with 2 patterns
🔄 Re-running index without failed files...

✅ Indexed 127 files successfully
```

## Technical Implementation

### 1. Track Failures During Indexing

```typescript
interface IndexingFailure {
  file: string;
  reason: string;
  size: number;
  type: 'too_large' | 'invalid_string' | 'timeout' | 'other';
}

const failures: IndexingFailure[] = [];

// In embedding loop
try {
  await embedChunk(chunk);
} catch (error) {
  failures.push({
    file: filePath,
    reason: error.message,
    size: fileStats.size,
    type: categorizeError(error),
  });
}
```

### 2. Analyze Failures

```typescript
async function analyzeFailure(failure: IndexingFailure): Promise<{
  action: 'ignore' | 'refactor' | 'split';
  reason: string;
  suggestions: string[];
}> {
  const { file, size } = failure;
  
  // Check if it's a dependency
  if (file.includes('node_modules/') || 
      file.includes('venv/') || 
      file.includes('.venv/') ||
      file.includes('site-packages/')) {
    return {
      action: 'ignore',
      reason: 'Third-party dependency',
      suggestions: ['These files are not part of your source code'],
    };
  }
  
  // Check if it's generated code
  if (file.includes('dist/') || 
      file.includes('build/') ||
      file.includes('.min.js') ||
      file.endsWith('.bundle.js')) {
    return {
      action: 'ignore',
      reason: 'Generated/compiled code',
      suggestions: ['Index source files instead of build output'],
    };
  }
  
  // Check if it's data
  if (file.endsWith('.json') || 
      file.endsWith('.csv') ||
      file.endsWith('.xml')) {
    return {
      action: 'refactor',
      reason: 'Large data file',
      suggestions: [
        'Split into smaller files',
        'Move to database',
        'Use pagination/streaming',
      ],
    };
  }
  
  // Check if it's a huge source file
  if (size > 100_000 && 
      (file.endsWith('.ts') || 
       file.endsWith('.js') || 
       file.endsWith('.py'))) {
    return {
      action: 'split',
      reason: 'Large source file',
      suggestions: [
        'Split into smaller modules',
        'Extract functions/classes',
        'Consider architectural refactoring',
      ],
    };
  }
  
  // Default: ignore
  return {
    action: 'ignore',
    reason: 'Unknown file type or size issue',
    suggestions: ['Added to .ragignore for now'],
  };
}
```

### 3. Auto-Generate .ragignore

```typescript
async function generateRagignore(
  failures: IndexingFailure[],
  cwd: string
): Promise<void> {
  const patterns = new Set<string>();
  const recommendations: string[] = [];
  
  for (const failure of failures) {
    const analysis = await analyzeFailure(failure);
    
    // Extract pattern
    const pattern = extractPattern(failure.file);
    patterns.add(pattern);
    
    // Log recommendation
    console.log(pc.yellow(`\n⚠️  Failed to embed: ${failure.file}`));
    console.log(pc.gray(`    Reason: ${failure.reason}`));
    console.log(pc.cyan(`\n🤖 Analyzing failure...`));
    
    if (analysis.action === 'ignore') {
      console.log(pc.green(`\n✅ Recommendation: IGNORE`));
      console.log(pc.gray(`    ${analysis.reason}`));
    } else if (analysis.action === 'refactor') {
      console.log(pc.yellow(`\n⚠️  Recommendation: REFACTOR`));
      console.log(pc.gray(`    ${analysis.reason}`));
      console.log(pc.gray(`    Consider:`));
      analysis.suggestions.forEach((s, i) => {
        console.log(pc.gray(`    ${i + 1}. ${s}`));
      });
      recommendations.push(`${failure.file}: ${analysis.reason}`);
    } else if (analysis.action === 'split') {
      console.log(pc.yellow(`\n⚠️  Recommendation: SPLIT`));
      console.log(pc.gray(`    ${analysis.reason}`));
      console.log(pc.gray(`    Consider:`));
      analysis.suggestions.forEach((s, i) => {
        console.log(pc.gray(`    ${i + 1}. ${s}`));
      });
      recommendations.push(`${failure.file}: ${analysis.reason}`);
    }
    
    console.log(pc.gray(`\n    Added to .ragignore for now.`));
  }
  
  // Create or update .ragignore
  const ragignorePath = path.join(cwd, '.ragignore');
  const existingContent = await fs.pathExists(ragignorePath)
    ? await fs.readFile(ragignorePath, 'utf-8')
    : '';
  
  const newContent = [
    existingContent,
    '',
    '# Auto-generated from indexing failures',
    `# Generated: ${new Date().toISOString()}`,
    '',
    ...Array.from(patterns).map(p => p),
  ].join('\n');
  
  await fs.writeFile(ragignorePath, newContent);
  
  console.log(pc.green(`\n📝 Created/updated .ragignore with ${patterns.size} patterns`));
  
  // Save recommendations
  if (recommendations.length > 0) {
    const recsPath = path.join(cwd, '.arela', 'indexing-recommendations.md');
    await fs.ensureDir(path.dirname(recsPath));
    await fs.writeFile(recsPath, [
      '# RAG Indexing Recommendations',
      '',
      'These files failed to index and may need attention:',
      '',
      ...recommendations.map(r => `- ${r}`),
    ].join('\n'));
    
    console.log(pc.cyan(`📋 Saved recommendations to .arela/indexing-recommendations.md`));
  }
}

function extractPattern(filePath: string): string {
  // Extract directory patterns
  if (filePath.includes('node_modules/')) return 'node_modules/';
  if (filePath.includes('venv/')) return 'venv/';
  if (filePath.includes('.venv/')) return '.venv/';
  if (filePath.includes('site-packages/')) return '**/site-packages/';
  if (filePath.includes('dist/')) return 'dist/';
  if (filePath.includes('build/')) return 'build/';
  
  // Extract file patterns
  if (filePath.endsWith('.min.js')) return '*.min.js';
  if (filePath.endsWith('.bundle.js')) return '*.bundle.js';
  
  // Default: exact file
  return filePath;
}
```

### 4. Retry Indexing

```typescript
export async function indexWithAutoRetry(opts: IndexOptions): Promise<void> {
  const failures: IndexingFailure[] = [];
  
  try {
    await indexFiles(opts, failures);
  } catch (error) {
    if (failures.length > 0) {
      console.log(pc.yellow(`\n⚠️  ${failures.length} files failed to index`));
      
      // Generate .ragignore
      await generateRagignore(failures, opts.cwd);
      
      // Retry
      console.log(pc.cyan(`\n🔄 Re-running index without failed files...\n`));
      await indexFiles(opts, []);
      
      console.log(pc.green(`\n✅ Indexing completed successfully`));
    } else {
      throw error;
    }
  }
}
```

## Acceptance Criteria

- [ ] Detects files that fail to embed
- [ ] Tracks failure reason and file size
- [ ] Analyzes each failure intelligently
- [ ] Categorizes: dependencies, generated code, data, source
- [ ] Auto-creates/updates `.ragignore`
- [ ] Provides clear recommendations (IGNORE, REFACTOR, SPLIT)
- [ ] Saves recommendations to `.arela/indexing-recommendations.md`
- [ ] Automatically retries indexing after creating `.ragignore`
- [ ] Works for Python (venv), Node (node_modules), and other ecosystems
- [ ] Handles edge cases gracefully

## Files to Modify

- `src/rag/index.ts` - Add failure tracking and analysis
- `src/utils/ragignore.ts` - Create new file for .ragignore generation
- `src/types.ts` - Add IndexingFailure type

## Benefits

1. **Zero Manual Work** - Auto-handles failures
2. **Intelligent** - Knows what to ignore vs refactor
3. **Educational** - Teaches users about their codebase
4. **Faster** - Auto-retries without failed files
5. **Actionable** - Provides specific recommendations

## Example Output

```bash
$ arela index

📚 Building your RAG brain...
Found 3659 files to index

Indexing: [██░░░░░░░░] 7% (260/3659)

⚠️  Failed to embed: venv/lib/python3.14/site-packages/idna/uts46data.py
    Reason: File too large (2.3 MB)
    
🤖 Analyzing failure...
    
✅ Recommendation: IGNORE
    Third-party dependency
    These files are not part of your source code
    
    Added to .ragignore for now.

⚠️  Failed to embed: src/data/users.json
    Reason: File too large (5.1 MB)
    
🤖 Analyzing failure...
    
⚠️  Recommendation: REFACTOR
    Large data file
    Consider:
    1. Split into smaller files
    2. Move to database
    3. Use pagination/streaming
    
    Added to .ragignore for now.

📝 Created .ragignore with 2 patterns:
    - venv/
    - src/data/users.json

📋 Saved recommendations to .arela/indexing-recommendations.md

🔄 Re-running index without failed files...

Indexing: [████████████████████████████████████████] 100% (127/127)

✅ Indexed 127 files successfully in 8.3s
```

## Philosophy Alignment

**Good Taste:**
- Graceful failure handling
- Intelligent automation
- Clear communication

**Pragmatic:**
- Solves real problem
- Zero manual work
- Actionable recommendations

**User-First:**
- Teaches users about their codebase
- Provides specific guidance
- Saves time

## Next Steps

When ready to implement:
```bash
arela orchestrate --tickets CLAUDE-003-v3.3.2-smart-ragignore
```

---

**This turns a frustrating error into an intelligent assistant!** 🤖✨
