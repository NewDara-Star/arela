# CODEX-001: AST Extractor for Code Summarization

**Agent:** codex  
**Priority:** high  
**Complexity:** medium  
**Status:** pending  
**Estimated Time:** 4 hours

---

## Context

We need to extract key structural elements from code files (functions, classes, exports, imports) to enable intelligent summarization. This is Phase 1 of the Advanced Summarization feature for v4.2.0.

**Why this matters:**
- Enables 5-10x token compression for large files
- Foundation for semantic caching (compare AST, not file hash)
- Supports multi-language code understanding

**Research basis:**
- Research #1 (Code Summarization): Hybrid AST + LLM approach
- Use `tree-sitter` for language-agnostic parsing
- Extract semantic contracts (functions, classes, exports)

---

## Requirements

### Must Have
- [ ] Extract functions (name, params, return type, JSDoc)
- [ ] Extract classes (name, methods, properties)
- [ ] Extract exports (what's public API)
- [ ] Extract imports (dependencies)
- [ ] Support TypeScript and JavaScript
- [ ] Output structured JSON (`SemanticContract.json`)

### Should Have
- [ ] Extract JSDoc comments
- [ ] Extract type definitions
- [ ] Handle async/await patterns
- [ ] Handle decorators

### Nice to Have
- [ ] Support Python (future)
- [ ] Support Go (future)
- [ ] Extract complexity metrics

---

## Technical Specification

### Interface

```typescript
// src/summarization/extractor/types.ts
export interface SemanticContract {
  filePath: string;
  description?: string; // from file-level JSDoc
  exports: ExportInfo[];
  imports: ImportInfo[];
  metadata: {
    language: string;
    linesOfCode: number;
    extractedAt: string;
  };
}

export interface ExportInfo {
  name: string;
  kind: 'function' | 'class' | 'const' | 'type' | 'interface';
  jsDoc?: string;
  signature?: FunctionSignature;
  methods?: MethodInfo[]; // for classes
}

export interface FunctionSignature {
  params: ParamInfo[];
  returnType?: string;
  isAsync: boolean;
}

export interface ParamInfo {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface ImportInfo {
  module: string;
  names: string[];
  isDefault: boolean;
}
```

### Implementation

```typescript
// src/summarization/extractor/ast-extractor.ts
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

export class ASTExtractor {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(TypeScript.typescript);
  }

  /**
   * Extract semantic contract from code
   */
  async extract(code: string, filePath: string): Promise<SemanticContract> {
    const tree = this.parser.parse(code);
    
    return {
      filePath,
      description: this.extractFileDescription(tree),
      exports: this.extractExports(tree),
      imports: this.extractImports(tree),
      metadata: {
        language: 'typescript',
        linesOfCode: code.split('\n').length,
        extractedAt: new Date().toISOString(),
      },
    };
  }

  private extractFileDescription(tree: Parser.Tree): string | undefined {
    // Extract file-level JSDoc comment
    // Look for /** ... */ at top of file
  }

  private extractExports(tree: Parser.Tree): ExportInfo[] {
    // Find all export declarations
    // Extract function/class signatures
    // Parse JSDoc comments
  }

  private extractImports(tree: Parser.Tree): ImportInfo[] {
    // Find all import statements
    // Extract module names and imported symbols
  }
}
```

---

## Files to Create

1. **`src/summarization/extractor/types.ts`**
   - Interface definitions
   - Type exports

2. **`src/summarization/extractor/ast-extractor.ts`**
   - Main extractor class
   - tree-sitter integration
   - AST traversal logic

3. **`src/summarization/extractor/index.ts`**
   - Public API exports

4. **`test/summarization/extractor.test.ts`**
   - Unit tests for extractor
   - Test cases for different code patterns

---

## Test Cases

### Test 1: Simple Function
```typescript
// Input
export function add(a: number, b: number): number {
  return a + b;
}

// Expected Output
{
  exports: [{
    name: 'add',
    kind: 'function',
    signature: {
      params: [
        { name: 'a', type: 'number', optional: false },
        { name: 'b', type: 'number', optional: false }
      ],
      returnType: 'number',
      isAsync: false
    }
  }]
}
```

### Test 2: Class with Methods
```typescript
// Input
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}

// Expected Output
{
  exports: [{
    name: 'Calculator',
    kind: 'class',
    methods: [{
      name: 'add',
      signature: {
        params: [
          { name: 'a', type: 'number', optional: false },
          { name: 'b', type: 'number', optional: false }
        ],
        returnType: 'number',
        isAsync: false
      }
    }]
  }]
}
```

### Test 3: With JSDoc
```typescript
// Input
/**
 * Adds two numbers together
 * @param a First number
 * @param b Second number
 * @returns Sum of a and b
 */
export function add(a: number, b: number): number {
  return a + b;
}

// Expected Output
{
  exports: [{
    name: 'add',
    kind: 'function',
    jsDoc: 'Adds two numbers together\n@param a First number\n@param b Second number\n@returns Sum of a and b',
    signature: { /* ... */ }
  }]
}
```

---

## Dependencies

```bash
npm install tree-sitter tree-sitter-typescript
```

---

## Acceptance Criteria

- [ ] Extracts functions with signatures
- [ ] Extracts classes with methods
- [ ] Extracts exports and imports
- [ ] Extracts JSDoc comments
- [ ] Handles TypeScript and JavaScript
- [ ] Outputs valid `SemanticContract` JSON
- [ ] All tests pass (>90% coverage)
- [ ] <100ms per file (performance)
- [ ] Works with real Arela files

---

## Success Metrics

- **Accuracy:** 100% extraction of public API
- **Performance:** <100ms per file
- **Coverage:** Handles 95%+ of TypeScript patterns
- **Quality:** Clean, typed, well-tested code

---

## Notes

- Use tree-sitter (not ts-morph) for language-agnostic support
- Focus on PUBLIC API (exports), not internal implementation
- JSDoc is critical for LLM synthesis stage
- This is Stage 1 of 2-stage summarization pipeline

---

## Related Tickets

- CODEX-002: LLM Synthesizer (depends on this)
- CODEX-003: Semantic Caching (depends on this)
