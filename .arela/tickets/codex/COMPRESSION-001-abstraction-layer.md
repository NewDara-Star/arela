# CODEX-COMPRESSION-001: Build Compression Abstraction Layer

**Agent:** codex  
**Priority:** high  
**Complexity:** simple  
**Estimated Time:** 4-6 hours

---

## 🔍 BEFORE YOU START

```bash
arela_search "compression interface factory"
arela_search "json stringify"
arela memory project --category pattern
```

---

## Context

**Why this exists:**
We need to compress context before sending to LLMs. TOON might be 3x better than JSON, but we don't know if it's fast enough yet. We need an abstraction so we can swap compression strategies without rewriting code.

**Current state:**
- Direct `JSON.stringify()` everywhere
- No abstraction
- Can't easily test TOON

**Desired state:**
- Clean `ContextCompressor` interface
- `JsonCompressor` (default, safe)
- Easy to add `ToonCompressor` later
- Config-based switching

---

## Requirements

### Must Have
- [ ] `ContextCompressor` interface
- [ ] `JsonCompressor` implementation
- [ ] Factory function (`createCompressor`)
- [ ] Config-based selection
- [ ] Token counting method

### Should Have
- [ ] TypeScript types
- [ ] Error handling
- [ ] Performance logging

---

## Technical Implementation

### Files to Create
```
src/compression/
├── interface.ts         # ContextCompressor interface
├── json-compressor.ts   # JSON implementation
└── index.ts             # Factory + exports
```

### Interface

**`src/compression/interface.ts`:**
```typescript
export interface ContextCompressor {
  /**
   * Compress data to string format
   */
  compress(data: any): string;
  
  /**
   * Decompress string back to data
   */
  decompress(data: string): any;
  
  /**
   * Count tokens in compressed string
   */
  getTokenCount(data: string): number;
  
  /**
   * Get compressor name
   */
  getName(): string;
}

export type CompressionType = 'json' | 'toon';

export interface CompressionConfig {
  type: CompressionType;
  fallback?: boolean; // If true, fallback to JSON on error
}
```

### JSON Implementation

**`src/compression/json-compressor.ts`:**
```typescript
import { ContextCompressor } from './interface';

export class JsonCompressor implements ContextCompressor {
  compress(data: any): string {
    try {
      return JSON.stringify(data, null, 0); // No pretty-print
    } catch (error) {
      throw new Error(`JSON compression failed: ${error.message}`);
    }
  }
  
  decompress(data: string): any {
    try {
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`JSON decompression failed: ${error.message}`);
    }
  }
  
  getTokenCount(data: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    // For accurate counting, use tiktoken later
    return Math.ceil(data.length / 4);
  }
  
  getName(): string {
    return 'json';
  }
}
```

### Factory

**`src/compression/index.ts`:**
```typescript
import { ContextCompressor, CompressionConfig, CompressionType } from './interface';
import { JsonCompressor } from './json-compressor';

// Registry of available compressors
const compressors: Record<CompressionType, () => ContextCompressor> = {
  json: () => new JsonCompressor(),
  toon: () => {
    throw new Error('TOON compressor not yet implemented');
  },
};

/**
 * Create a compressor based on config
 */
export function createCompressor(config: CompressionConfig): ContextCompressor {
  const factory = compressors[config.type];
  
  if (!factory) {
    throw new Error(`Unknown compression type: ${config.type}`);
  }
  
  try {
    return factory();
  } catch (error) {
    if (config.fallback && config.type !== 'json') {
      console.warn(`⚠️  ${config.type} failed, falling back to JSON`);
      return new JsonCompressor();
    }
    throw error;
  }
}

/**
 * Default compressor (JSON)
 */
export function getDefaultCompressor(): ContextCompressor {
  return new JsonCompressor();
}

// Re-export types
export * from './interface';
export { JsonCompressor } from './json-compressor';
```

### Config Integration

**`.arela/config.json`:**
```json
{
  "compression": {
    "type": "json",
    "fallback": true
  }
}
```

### Usage Example

```typescript
import { createCompressor } from './compression';

// Load config
const config = loadConfig();

// Create compressor
const compressor = createCompressor(config.compression);

// Use it
const data = { files: [...], context: '...' };
const compressed = compressor.compress(data);
const tokens = compressor.getTokenCount(compressed);

console.log(`Compressed to ${tokens} tokens using ${compressor.getName()}`);

// Send to LLM
await sendToLLM(compressed);

// Decompress response
const response = compressor.decompress(llmResponse);
```

---

## Acceptance Criteria

- [ ] `ContextCompressor` interface defined
- [ ] `JsonCompressor` works correctly
- [ ] `createCompressor` factory works
- [ ] Config-based selection works
- [ ] Token counting works (rough estimate OK)
- [ ] Error handling works
- [ ] TypeScript types correct
- [ ] Exports clean

---

## Test Plan

### Unit Tests
```typescript
describe('JsonCompressor', () => {
  it('should compress and decompress', () => {
    const compressor = new JsonCompressor();
    const data = { test: 'value', nested: { key: 123 } };
    
    const compressed = compressor.compress(data);
    const decompressed = compressor.decompress(compressed);
    
    expect(decompressed).toEqual(data);
  });
  
  it('should count tokens', () => {
    const compressor = new JsonCompressor();
    const data = { test: 'value' };
    const compressed = compressor.compress(data);
    const tokens = compressor.getTokenCount(compressed);
    
    expect(tokens).toBeGreaterThan(0);
  });
  
  it('should handle errors', () => {
    const compressor = new JsonCompressor();
    
    expect(() => compressor.decompress('invalid json')).toThrow();
  });
});

describe('createCompressor', () => {
  it('should create JSON compressor', () => {
    const compressor = createCompressor({ type: 'json' });
    expect(compressor.getName()).toBe('json');
  });
  
  it('should fallback to JSON on error', () => {
    const compressor = createCompressor({ 
      type: 'toon', 
      fallback: true 
    });
    expect(compressor.getName()).toBe('json');
  });
});
```

---

## Success Metrics

**Performance:**
- Compress: < 1ms for 10KB data
- Decompress: < 1ms
- Token count: < 1ms

**Quality:**
- No data loss (compress → decompress = original)
- Clean error messages
- Type-safe

---

## Dependencies

**NPM packages:**
- None (pure TypeScript)

**Future:**
- `tiktoken` for accurate token counting
- `@toon-format/toon` for TOON compressor

---

## Notes

**Important:**
- Keep it simple (YAGNI)
- JSON is the safe default
- TOON will be added in TOON-001
- Token counting is rough estimate (good enough for now)

**Related:**
- TOON-001 (will add ToonCompressor)

---

## Remember

**This abstraction makes TOON swappable!**

If TOON is slow, we just change config. No code changes needed.

🚀 **Build it clean, build it simple.**
