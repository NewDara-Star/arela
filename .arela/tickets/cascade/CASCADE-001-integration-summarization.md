# CASCADE-001: Integration of Code Summarization Pipeline

**Agent:** cascade  
**Priority:** high  
**Complexity:** medium  
**Estimated Time:** 3 hours  
**Depends On:** CODEX-001, CODEX-002, CODEX-003

---

## Context

Integrate the complete code summarization pipeline (AST Extractor → LLM Synthesizer → Semantic Cache) into the existing Meta-RAG Context Router. This enables intelligent summarization of large files before they're added to context.

**Why this matters:**
- Reduces token usage by 5-10x for large files
- Improves context quality (summaries vs raw code)
- Enables semantic caching for cost savings
- Foundation for future features

**Research basis:**
- Research #1: Hybrid AST + LLM pipeline
- Integration with existing Meta-RAG system
- Cloud-first with local fallback strategy

---

## Requirements

### Must Have
- [ ] Integrate summarization into Context Router
- [ ] Summarize files >1500 tokens automatically
- [ ] Use semantic cache to avoid re-summarization
- [ ] Fallback to raw code if summarization fails
- [ ] CLI command: `arela summarize <file>`

### Should Have
- [ ] Batch summarization for multiple files
- [ ] Progress indicators for long operations
- [ ] Summary validation (CodeBERTScore)
- [ ] Statistics reporting (compression ratio, cache hits)

### Nice to Have
- [ ] Pre-compute summaries in background
- [ ] Summary diff view (before/after)
- [ ] Custom summarization levels (brief, detailed)

---

## Technical Specification

### Integration Point

```typescript
// src/meta-rag/context-router.ts
import { CodeSummarizer } from '../summarization/code-summarizer.js';

export class ContextRouter {
  private summarizer: CodeSummarizer;

  constructor() {
    this.summarizer = new CodeSummarizer();
  }

  async route(query: string, classification: Classification): Promise<RoutingResult> {
    // ... existing routing logic ...

    // NEW: Summarize large files before adding to context
    const files = await this.retrieveFiles(query, classification);
    const summarizedFiles = await this.summarizeIfNeeded(files);

    return {
      layers: classification.layers,
      files: summarizedFiles,
      // ...
    };
  }

  private async summarizeIfNeeded(files: FileResult[]): Promise<FileResult[]> {
    return Promise.all(files.map(async (file) => {
      const tokenCount = this.estimateTokens(file.content);
      
      // Summarize if >1500 tokens
      if (tokenCount > 1500) {
        try {
          const summary = await this.summarizer.summarize(file.path);
          return {
            ...file,
            content: summary.toMarkdown(), // Convert to readable format
            isSummary: true,
            originalTokens: tokenCount,
            summaryTokens: summary.metadata.tokenCount,
            compressionRatio: summary.metadata.compressionRatio,
          };
        } catch (error) {
          console.warn(`Failed to summarize ${file.path}:`, error);
          return file; // Fallback to raw code
        }
      }

      return file;
    }));
  }
}
```

### Code Summarizer (Main Class)

```typescript
// src/summarization/code-summarizer.ts
import { ASTExtractor } from './extractor/ast-extractor.js';
import { LLMSynthesizer } from './synthesizer/llm-synthesizer.js';
import { SemanticCache } from './cache/semantic-cache.js';

export class CodeSummarizer {
  private extractor: ASTExtractor;
  private synthesizer: LLMSynthesizer;
  private cache: SemanticCache;

  constructor(projectPath: string) {
    this.extractor = new ASTExtractor();
    this.synthesizer = new LLMSynthesizer();
    this.cache = new SemanticCache(projectPath);
  }

  /**
   * Summarize a code file (with caching)
   */
  async summarize(filePath: string): Promise<TechnicalSummary> {
    const code = await fs.readFile(filePath, 'utf-8');

    // Stage 1: Extract semantic contract (AST)
    const contract = await this.extractor.extract(code, filePath);

    // Check cache first
    const cached = await this.cache.get(contract);
    if (cached) {
      return cached;
    }

    // Stage 2: Synthesize summary (LLM)
    const summary = await this.synthesizer.synthesize(contract);

    // Store in cache
    await this.cache.set(contract, summary);

    return summary;
  }

  /**
   * Summarize multiple files in parallel
   */
  async summarizeBatch(filePaths: string[]): Promise<Map<string, TechnicalSummary>> {
    const results = await Promise.all(
      filePaths.map(async (path) => {
        const summary = await this.summarize(path);
        return [path, summary] as [string, TechnicalSummary];
      })
    );

    return new Map(results);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}
```

### CLI Command

```typescript
// src/cli.ts
program
  .command('summarize <file>')
  .description('Summarize a code file')
  .option('--no-cache', 'Skip cache, force re-summarization')
  .option('--output <format>', 'Output format (json|markdown)', 'markdown')
  .action(async (file, options) => {
    const summarizer = new CodeSummarizer(process.cwd());
    
    console.log(`📝 Summarizing ${file}...`);
    
    const summary = await summarizer.summarize(file);
    
    if (options.output === 'json') {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(summary.toMarkdown());
    }
    
    const stats = summarizer.getCacheStats();
    console.log(`\n📊 Stats: ${stats.hitRate}% cache hit rate, $${stats.savings.toFixed(4)} saved`);
  });
```

---

## Files to Create/Modify

### New Files

1. **`src/summarization/code-summarizer.ts`**
   - Main orchestrator class
   - Integrates extractor + synthesizer + cache

2. **`src/summarization/index.ts`**
   - Public API exports

### Modified Files

1. **`src/meta-rag/context-router.ts`**
   - Add `summarizeIfNeeded()` method
   - Integrate with file retrieval

2. **`src/cli.ts`**
   - Add `arela summarize` command

---

## Test Cases

### Test 1: End-to-End Summarization
```typescript
const summarizer = new CodeSummarizer('/project');
const summary = await summarizer.summarize('src/utils/large-file.ts');

expect(summary.mainResponsibility).toBeDefined();
expect(summary.publicAPI.length).toBeGreaterThan(0);
expect(summary.metadata.compressionRatio).toBeGreaterThan(5);
```

### Test 2: Cache Integration
```typescript
// First call (cache miss)
const summary1 = await summarizer.summarize('src/utils/math.ts');
const stats1 = summarizer.getCacheStats();
expect(stats1.misses).toBe(1);

// Second call (cache hit)
const summary2 = await summarizer.summarize('src/utils/math.ts');
const stats2 = summarizer.getCacheStats();
expect(stats2.hits).toBe(1);
expect(summary2).toEqual(summary1);
```

### Test 3: Context Router Integration
```typescript
const router = new ContextRouter();
const result = await router.route('How does auth work?', classification);

// Large files should be summarized
const authFile = result.files.find(f => f.path.includes('auth.ts'));
expect(authFile.isSummary).toBe(true);
expect(authFile.compressionRatio).toBeGreaterThan(5);
```

---

## Acceptance Criteria

- [ ] Summarization integrated into Context Router
- [ ] Files >1500 tokens automatically summarized
- [ ] Semantic cache working (70%+ hit rate)
- [ ] CLI command `arela summarize` works
- [ ] Fallback to raw code on errors
- [ ] All tests pass
- [ ] Performance: <3s per file, <5s for batch

---

## Success Metrics

- **Token Reduction:** 5-10x for large files
- **Cache Hit Rate:** 70-80%
- **Performance:** <3s per file
- **Accuracy:** 90%+ semantic similarity
- **Reliability:** <1% failure rate

---

## Notes

- This is the INTEGRATION ticket (depends on all CODEX tickets)
- Review and merge all CODEX implementations first
- Test with real Arela files (large ones like `hexi-memory.ts`)
- Ensure graceful degradation (fallback to raw code)

---

## Related Tickets

- CODEX-001: AST Extractor (prerequisite)
- CODEX-002: LLM Synthesizer (prerequisite)
- CODEX-003: Semantic Caching (prerequisite)
- CASCADE-002: Learning from Feedback (next feature)
