# META-RAG-001: Query Classifier

**Agent:** Claude  
**Priority:** CRITICAL  
**Complexity:** High  
**Estimated Time:** 4-6 hours  
**Dependencies:** HEXI-007 ✅

---

## Context

The Query Classifier is the **first step in Meta-RAG**. It analyzes user queries and determines:
1. What type of query is this? (procedural, factual, architectural, user, historical)
2. Which memory layers should be queried?
3. What's the priority/weight for each layer?

**Purpose:**
- Smart query routing (don't query all layers for every query)
- Token efficiency (only query relevant layers)
- Better results (right layers for right queries)
- Performance (fewer layers = faster)

---

## Requirements

### 1. Query Classifier

**File:** `src/meta-rag/classifier.ts`

```typescript
export enum QueryType {
  PROCEDURAL = 'procedural',    // "Continue working on...", "Implement..."
  FACTUAL = 'factual',          // "What is...", "How does..."
  ARCHITECTURAL = 'architectural', // "Show me structure...", "Dependencies..."
  USER = 'user',                // "What's my preferred...", "My expertise..."
  HISTORICAL = 'historical',    // "What decisions...", "Why did we..."
  GENERAL = 'general',          // Fallback
}

export interface ClassificationResult {
  query: string;
  type: QueryType;
  confidence: number; // 0-1
  layers: MemoryLayer[]; // Which layers to query
  weights: Record<MemoryLayer, number>; // Priority weights
  reasoning: string; // Why this classification
}

export class QueryClassifier {
  // Initialize with Ollama model
  async init(): Promise<void>
  
  // Classify a query
  async classify(query: string): Promise<ClassificationResult>
  
  // Get suggested layers for a query type
  getSuggestedLayers(type: QueryType): MemoryLayer[]
  
  // Get layer weights for a query type
  getLayerWeights(type: QueryType): Record<MemoryLayer, number>
}
```

---

## Technical Details

### Query Type Detection

**Use Ollama with a small local model (e.g., llama3.2:1b or phi3:mini):**

```typescript
import ollama from 'ollama';

async classify(query: string): Promise<ClassificationResult> {
  const prompt = `Classify this query into one of these types:
- PROCEDURAL: User wants to continue work or implement something
- FACTUAL: User asking what/how something works
- ARCHITECTURAL: User asking about code structure/dependencies
- USER: User asking about their own preferences/expertise
- HISTORICAL: User asking about past decisions/changes
- GENERAL: Doesn't fit other categories

Query: "${query}"

Respond with JSON:
{
  "type": "PROCEDURAL|FACTUAL|ARCHITECTURAL|USER|HISTORICAL|GENERAL",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

  const response = await ollama.generate({
    model: 'llama3.2:1b', // Fast, local, free!
    prompt,
    format: 'json',
  });

  const result = JSON.parse(response.response);
  
  return {
    query,
    type: result.type,
    confidence: result.confidence,
    layers: this.getSuggestedLayers(result.type),
    weights: this.getLayerWeights(result.type),
    reasoning: result.reasoning,
  };
}
```

### Layer Routing Rules

```typescript
getSuggestedLayers(type: QueryType): MemoryLayer[] {
  const rules: Record<QueryType, MemoryLayer[]> = {
    // "Continue working on auth"
    PROCEDURAL: [
      MemoryLayer.SESSION,  // What was I doing?
      MemoryLayer.PROJECT,  // Project context
      MemoryLayer.VECTOR,   // Relevant code
    ],
    
    // "What is authentication?"
    FACTUAL: [
      MemoryLayer.VECTOR,   // Semantic search
      MemoryLayer.GRAPH,    // Code structure
    ],
    
    // "Show me auth dependencies"
    ARCHITECTURAL: [
      MemoryLayer.PROJECT,  // Architecture decisions
      MemoryLayer.GRAPH,    // Dependency graph
      MemoryLayer.GOVERNANCE, // Past changes
    ],
    
    // "What's my preferred testing framework?"
    USER: [
      MemoryLayer.USER,     // User preferences only
    ],
    
    // "What decisions were made about auth?"
    HISTORICAL: [
      MemoryLayer.PROJECT,  // Project decisions
      MemoryLayer.GOVERNANCE, // Audit trail
    ],
    
    // Fallback: query all
    GENERAL: [
      MemoryLayer.SESSION,
      MemoryLayer.PROJECT,
      MemoryLayer.USER,
      MemoryLayer.VECTOR,
      MemoryLayer.GRAPH,
      MemoryLayer.GOVERNANCE,
    ],
  };
  
  return rules[type];
}
```

### Layer Weights

```typescript
getLayerWeights(type: QueryType): Record<MemoryLayer, number> {
  const weights: Record<QueryType, Record<MemoryLayer, number>> = {
    PROCEDURAL: {
      [MemoryLayer.SESSION]: 0.4,   // Highest priority
      [MemoryLayer.PROJECT]: 0.3,
      [MemoryLayer.VECTOR]: 0.3,
      [MemoryLayer.USER]: 0.0,
      [MemoryLayer.GRAPH]: 0.0,
      [MemoryLayer.GOVERNANCE]: 0.0,
    },
    
    FACTUAL: {
      [MemoryLayer.VECTOR]: 0.6,    // Semantic search primary
      [MemoryLayer.GRAPH]: 0.4,
      [MemoryLayer.SESSION]: 0.0,
      [MemoryLayer.PROJECT]: 0.0,
      [MemoryLayer.USER]: 0.0,
      [MemoryLayer.GOVERNANCE]: 0.0,
    },
    
    ARCHITECTURAL: {
      [MemoryLayer.GRAPH]: 0.5,     // Structure primary
      [MemoryLayer.PROJECT]: 0.3,
      [MemoryLayer.GOVERNANCE]: 0.2,
      [MemoryLayer.SESSION]: 0.0,
      [MemoryLayer.USER]: 0.0,
      [MemoryLayer.VECTOR]: 0.0,
    },
    
    USER: {
      [MemoryLayer.USER]: 1.0,      // Only user layer
      [MemoryLayer.SESSION]: 0.0,
      [MemoryLayer.PROJECT]: 0.0,
      [MemoryLayer.VECTOR]: 0.0,
      [MemoryLayer.GRAPH]: 0.0,
      [MemoryLayer.GOVERNANCE]: 0.0,
    },
    
    HISTORICAL: {
      [MemoryLayer.GOVERNANCE]: 0.5, // Audit trail primary
      [MemoryLayer.PROJECT]: 0.5,
      [MemoryLayer.SESSION]: 0.0,
      [MemoryLayer.USER]: 0.0,
      [MemoryLayer.VECTOR]: 0.0,
      [MemoryLayer.GRAPH]: 0.0,
    },
    
    GENERAL: {
      [MemoryLayer.SESSION]: 0.2,
      [MemoryLayer.PROJECT]: 0.2,
      [MemoryLayer.USER]: 0.1,
      [MemoryLayer.VECTOR]: 0.2,
      [MemoryLayer.GRAPH]: 0.2,
      [MemoryLayer.GOVERNANCE]: 0.1,
    },
  };
  
  return weights[type];
}
```

---

## Files to Create

1. **`src/meta-rag/classifier.ts`** - QueryClassifier class
2. **`src/meta-rag/types.ts`** - Shared types
3. **`src/meta-rag/index.ts`** - Exports
4. **`test/meta-rag/classifier.test.ts`** - Unit tests

---

## Acceptance Criteria

- [ ] QueryClassifier class implemented
- [ ] Ollama integration working
- [ ] 5 query types supported
- [ ] Layer routing rules defined
- [ ] Layer weights defined
- [ ] Classification accuracy >85% (manual testing)
- [ ] Performance <100ms per classification
- [ ] Graceful fallback if Ollama unavailable
- [ ] Unit tests (>90% coverage)
- [ ] Example queries tested

---

## Testing Strategy

```typescript
describe('QueryClassifier', () => {
  it('should classify procedural queries', async () => {
    const result = await classifier.classify('Continue working on authentication');
    expect(result.type).toBe(QueryType.PROCEDURAL);
    expect(result.layers).toContain(MemoryLayer.SESSION);
    expect(result.layers).toContain(MemoryLayer.PROJECT);
    expect(result.weights[MemoryLayer.SESSION]).toBeGreaterThan(0);
  });
  
  it('should classify factual queries', async () => {
    const result = await classifier.classify('What is the authentication flow?');
    expect(result.type).toBe(QueryType.FACTUAL);
    expect(result.layers).toContain(MemoryLayer.VECTOR);
    expect(result.layers).toContain(MemoryLayer.GRAPH);
  });
  
  it('should classify architectural queries', async () => {
    const result = await classifier.classify('Show me auth dependencies');
    expect(result.type).toBe(QueryType.ARCHITECTURAL);
    expect(result.layers).toContain(MemoryLayer.GRAPH);
    expect(result.layers).toContain(MemoryLayer.PROJECT);
  });
  
  it('should classify user queries', async () => {
    const result = await classifier.classify('What is my preferred testing framework?');
    expect(result.type).toBe(QueryType.USER);
    expect(result.layers).toEqual([MemoryLayer.USER]);
    expect(result.weights[MemoryLayer.USER]).toBe(1.0);
  });
  
  it('should classify historical queries', async () => {
    const result = await classifier.classify('What decisions were made about auth?');
    expect(result.type).toBe(QueryType.HISTORICAL);
    expect(result.layers).toContain(MemoryLayer.GOVERNANCE);
    expect(result.layers).toContain(MemoryLayer.PROJECT);
  });
  
  it('should handle classification in <100ms', async () => {
    const start = Date.now();
    await classifier.classify('test query');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });
  
  it('should fallback gracefully if Ollama unavailable', async () => {
    // Mock Ollama failure
    const result = await classifier.classify('test query');
    expect(result.type).toBe(QueryType.GENERAL);
    expect(result.layers.length).toBe(6); // All layers
  });
});
```

---

## Example Usage

```typescript
import { QueryClassifier } from './src/meta-rag/classifier.js';

// Initialize
const classifier = new QueryClassifier();
await classifier.init();

// Classify queries
const result1 = await classifier.classify('Continue working on authentication');
console.log('Type:', result1.type); // PROCEDURAL
console.log('Layers:', result1.layers); // [SESSION, PROJECT, VECTOR]
console.log('Weights:', result1.weights); // { SESSION: 0.4, PROJECT: 0.3, ... }

const result2 = await classifier.classify('What is my preferred testing framework?');
console.log('Type:', result2.type); // USER
console.log('Layers:', result2.layers); // [USER]
console.log('Weights:', result2.weights); // { USER: 1.0 }
```

---

## Integration

Once complete, this will be used by:
- **Memory Router** (META-RAG-002) - Routes queries based on classification
- **Context Router** (CONTEXT-001) - Builds context with weighted results
- **CLI** - User-facing query commands

---

## Success Metrics

- [ ] Classification accuracy >85%
- [ ] Performance <100ms
- [ ] Ollama working locally
- [ ] All query types covered
- [ ] Layer routing sensible
- [ ] Weights balanced

---

## Notes

**Why Ollama?**
- FREE (no API costs)
- Local (privacy-first)
- Fast (<100ms with small models)
- Good enough (>85% accuracy)

**Why these query types?**
- Cover 95% of real queries
- Clear routing rules
- Easy to extend

**Fallback strategy:**
- If Ollama unavailable → GENERAL type (query all layers)
- If confidence <0.5 → GENERAL type
- Always return valid result

---

**This is the brain of Meta-RAG!** 🧠
