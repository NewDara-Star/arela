# CODEX-002: LLM Synthesizer for Code Summarization

**Agent:** codex  
**Priority:** high  
**Complexity:** medium  
**Estimated Time:** 4 hours  
**Depends On:** CODEX-001 (AST Extractor)

---

## Context

Take the structured `SemanticContract` from AST extraction and synthesize it into a concise, human-readable technical summary using an LLM. This is Phase 2 of the Advanced Summarization feature.

**Why this matters:**
- Converts structured data into fluent, semantic summaries
- Enables 5-10x token compression
- Maintains 90%+ semantic accuracy
- Foundation for semantic caching

**Research basis:**
- Research #1: Few-shot + Chain-of-Thought prompting
- Use GPT-4o-mini for cost-effectiveness
- Output structured JSON (`TechnicalSummary.json`)

---

## Requirements

### Must Have
- [ ] Synthesize `SemanticContract` into `TechnicalSummary`
- [ ] Use Claude Sonnet (BYOK - user's API key)
- [ ] Few-shot prompting with examples
- [ ] JSON Schema enforcement
- [ ] <3s per file synthesis
- [ ] User-friendly API key setup guide
- [ ] Clear error messages if no API key

### Should Have
- [ ] Chain-of-Thought reasoning
- [ ] Fallback to OpenAI if Claude fails
- [ ] Fallback to Ollama (local) if no API keys
- [ ] API key validation with helpful errors
- [ ] Cost tracking and display
- [ ] Batch processing support

### Nice to Have
- [ ] Multiple summary levels (brief, detailed)
- [ ] Custom prompts per language
- [ ] Critique-based refinement

---

## Technical Specification

### Output Schema

```typescript
// src/summarization/synthesizer/types.ts
export interface TechnicalSummary {
  filePath: string;
  mainResponsibility: string; // 1-2 sentences
  publicAPI: string[]; // List of exported functions/classes
  ioContracts: IOContract[]; // Input/output contracts
  dependencies: string; // Key dependencies summary
  sideEffects: string; // Side effects (DB, network, file system)
  keyAlgorithms?: string; // Notable algorithms or patterns
  metadata: {
    tokenCount: number;
    compressionRatio: number; // original tokens / summary tokens
    synthesizedAt: string;
  };
}

export interface IOContract {
  name: string; // function/method name
  definition: string; // "add(a: number, b: number): number"
}
```

### Implementation

```typescript
// src/summarization/synthesizer/llm-synthesizer.ts
import Anthropic from '@anthropic-ai/sdk';

export class LLMSynthesizer {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Synthesize semantic contract into technical summary
   */
  async synthesize(contract: SemanticContract): Promise<TechnicalSummary> {
    const prompt = this.buildPrompt(contract);
    
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }],
      response_format: { type: 'json_object' } // Enforce JSON
    });

    const summary = JSON.parse(response.content[0].text);
    
    return {
      ...summary,
      filePath: contract.filePath,
      metadata: {
        tokenCount: this.countTokens(summary),
        compressionRatio: this.calculateCompression(contract, summary),
        synthesizedAt: new Date().toISOString(),
      },
    };
  }

  private buildPrompt(contract: SemanticContract): string {
    return `You are a technical documentation expert. Summarize this code file's semantic contract into a concise technical summary.

INPUT (Semantic Contract):
${JSON.stringify(contract, null, 2)}

OUTPUT (Technical Summary):
Generate a JSON object with the following structure:
{
  "mainResponsibility": "1-2 sentence description of what this file does",
  "publicAPI": ["list", "of", "exported", "functions/classes"],
  "ioContracts": [
    { "name": "functionName", "definition": "functionName(params): returnType" }
  ],
  "dependencies": "Summary of key dependencies",
  "sideEffects": "Summary of side effects (DB, network, file system, etc.)",
  "keyAlgorithms": "Notable algorithms or patterns (optional)"
}

EXAMPLES:

Example 1 - Utility File:
Input: { exports: [{ name: "add", kind: "function", signature: { params: [{ name: "a", type: "number" }, { name: "b", type: "number" }], returnType: "number" } }] }
Output: {
  "mainResponsibility": "Provides basic arithmetic utility functions for addition operations.",
  "publicAPI": ["add"],
  "ioContracts": [{ "name": "add", "definition": "add(a: number, b: number): number" }],
  "dependencies": "None",
  "sideEffects": "None - pure functions",
  "keyAlgorithms": "Simple arithmetic"
}

Example 2 - API Handler:
Input: { exports: [{ name: "createUser", kind: "function", signature: { params: [{ name: "req", type: "Request" }, { name: "res", type: "Response" }], returnType: "Promise<void>", isAsync: true } }] }
Output: {
  "mainResponsibility": "Handles user creation API endpoint with validation and database persistence.",
  "publicAPI": ["createUser"],
  "ioContracts": [{ "name": "createUser", "definition": "createUser(req: Request, res: Response): Promise<void>" }],
  "dependencies": "Database (users table), validation library",
  "sideEffects": "Writes to database, sends HTTP response",
  "keyAlgorithms": "Input validation, password hashing"
}

Now generate the summary for the provided semantic contract. Output ONLY valid JSON, no markdown or explanations.`;
  }

  private countTokens(summary: TechnicalSummary): number {
    // Rough token count (1 token ≈ 4 characters)
    const text = JSON.stringify(summary);
    return Math.ceil(text.length / 4);
  }

  private calculateCompression(contract: SemanticContract, summary: TechnicalSummary): number {
    const originalTokens = Math.ceil(JSON.stringify(contract).length / 4);
    const summaryTokens = summary.metadata.tokenCount;
    return originalTokens / summaryTokens;
  }
}
```

---

## Files to Create

1. **`src/summarization/synthesizer/types.ts`**
   - `TechnicalSummary` interface
   - `IOContract` interface

2. **`src/summarization/synthesizer/llm-synthesizer.ts`**
   - Main synthesizer class
   - Prompt engineering
   - LLM integration

3. **`src/summarization/synthesizer/prompts.ts`**
   - Prompt templates
   - Few-shot examples

4. **`test/summarization/synthesizer.test.ts`**
   - Unit tests
   - Mock LLM responses

---

## Test Cases

### Test 1: Simple Utility File
```typescript
// Input (SemanticContract)
{
  filePath: 'src/utils/math.ts',
  exports: [{
    name: 'add',
    kind: 'function',
    signature: {
      params: [
        { name: 'a', type: 'number' },
        { name: 'b', type: 'number' }
      ],
      returnType: 'number'
    }
  }]
}

// Expected Output (TechnicalSummary)
{
  mainResponsibility: 'Provides basic arithmetic utility functions.',
  publicAPI: ['add'],
  ioContracts: [{ name: 'add', definition: 'add(a: number, b: number): number' }],
  dependencies: 'None',
  sideEffects: 'None - pure functions',
  metadata: {
    tokenCount: ~50,
    compressionRatio: ~5,
    synthesizedAt: '2025-11-15T...'
  }
}
```

---

## Acceptance Criteria

- [ ] Synthesizes `SemanticContract` into `TechnicalSummary`
- [ ] Uses GPT-4o-mini (or Claude Sonnet)
- [ ] Outputs valid JSON (enforced by schema)
- [ ] <3s per file
- [ ] 5-10x compression ratio
- [ ] 90%+ semantic accuracy (validated by CodeBERTScore)
- [ ] All tests pass

---

## Success Metrics

- **Compression:** 5-10x token reduction
- **Accuracy:** 90%+ semantic similarity (CodeBERTScore >0.85)
- **Performance:** <3s per file
- **Quality:** Fluent, concise, accurate summaries

---

## Notes

- Use Claude Sonnet (not GPT-4o-mini) for better JSON adherence
- Few-shot examples are CRITICAL for quality
- Enforce JSON output with `response_format`
- This is Stage 2 of 2-stage pipeline (depends on CODEX-001)

---

## Related Tickets

- CODEX-001: AST Extractor (prerequisite)
- CODEX-003: Semantic Caching (uses this output)
- CODEX-004: Integration with Context Router
