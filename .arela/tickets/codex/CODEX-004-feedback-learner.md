# CODEX-004: Feedback Learning System

**Agent:** codex  
**Priority:** high  
**Complexity:** medium  
**Estimated Time:** 4 hours

---

## Context

Implement a feedback learning system that tracks which context was actually useful to users and adapts routing weights over time. This enables continuous improvement of the Meta-RAG system based on real usage.

**Why this matters:**
- Improves routing accuracy by 10%+ after 100 feedbacks
- Learns user-specific patterns
- Adapts to codebase-specific needs
- Foundation for fine-tuning

**Research basis:**
- Research #1: Learning from user corrections
- Store feedback in Governance layer
- Adjust layer weights dynamically

---

## Requirements

### Must Have
- [ ] Record user feedback (helpful/not helpful)
- [ ] Store feedback in Governance layer
- [ ] Track which layers were actually useful
- [ ] Adjust layer weights based on feedback
- [ ] CLI command: `arela feedback --helpful/--not-helpful`

### Should Have
- [ ] Feedback statistics dashboard
- [ ] Pattern detection (common mistakes)
- [ ] Automatic weight adjustment (weekly)
- [ ] Export feedback for fine-tuning

### Nice to Have
- [ ] User-specific learning profiles
- [ ] Codebase-specific learning
- [ ] A/B testing of routing strategies

---

## Technical Specification

### Feedback Data Model

```typescript
// src/learning/types.ts
export interface FeedbackRecord {
  id: string;
  timestamp: string;
  query: string;
  classification: Classification;
  routing: RoutingResult;
  feedback: UserFeedback;
  context: {
    projectPath: string;
    userId?: string;
  };
}

export interface UserFeedback {
  helpful: boolean;
  correctLayers?: MemoryLayer[]; // User's correction
  correctType?: QueryType; // User's correction
  comment?: string;
}

export interface LearningStats {
  totalFeedback: number;
  helpfulRate: number; // % helpful
  accuracyImprovement: number; // % improvement
  commonMistakes: MistakePattern[];
  layerWeights: Record<MemoryLayer, number>;
}

export interface MistakePattern {
  pattern: string; // e.g., "Classified CODE as ARCHITECTURE"
  frequency: number;
  correction: string;
}
```

### Implementation

```typescript
// src/learning/feedback-learner.ts
import { GovernanceMemory } from '../memory/governance.js';

export class FeedbackLearner {
  private governance: GovernanceMemory;
  private weights: Map<MemoryLayer, number>;

  constructor(projectPath: string) {
    this.governance = new GovernanceMemory(projectPath);
    this.weights = this.loadWeights();
  }

  /**
   * Record user feedback
   */
  async recordFeedback(
    query: string,
    classification: Classification,
    routing: RoutingResult,
    feedback: UserFeedback
  ): Promise<void> {
    const record: FeedbackRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      query,
      classification,
      routing,
      feedback,
      context: {
        projectPath: process.cwd(),
      },
    };

    // Store in governance layer
    await this.governance.logDecision({
      type: 'feedback',
      data: record,
    });

    console.log(`✅ Feedback recorded: ${feedback.helpful ? '👍' : '👎'}`);

    // Adjust weights if user provided corrections
    if (feedback.correctLayers || feedback.correctType) {
      await this.adjustWeights(record);
    }
  }

  /**
   * Adjust layer weights based on feedback
   */
  private async adjustWeights(record: FeedbackRecord): Promise<void> {
    const { classification, feedback } = record;

    // If user corrected layers
    if (feedback.correctLayers) {
      const predicted = classification.layers;
      const correct = feedback.correctLayers;

      // Increase weight for correct layers
      for (const layer of correct) {
        const current = this.weights.get(layer) || 1.0;
        this.weights.set(layer, current * 1.1); // +10%
      }

      // Decrease weight for incorrect layers
      for (const layer of predicted) {
        if (!correct.includes(layer)) {
          const current = this.weights.get(layer) || 1.0;
          this.weights.set(layer, current * 0.9); // -10%
        }
      }

      await this.saveWeights();
      console.log(`🔄 Weights adjusted based on feedback`);
    }
  }

  /**
   * Get learning statistics
   */
  async getStats(): Promise<LearningStats> {
    const records = await this.loadAllFeedback();

    const totalFeedback = records.length;
    const helpfulCount = records.filter(r => r.feedback.helpful).length;
    const helpfulRate = (helpfulCount / totalFeedback) * 100;

    // Detect common mistakes
    const mistakes = this.detectMistakes(records);

    // Calculate accuracy improvement
    const accuracyImprovement = this.calculateImprovement(records);

    return {
      totalFeedback,
      helpfulRate,
      accuracyImprovement,
      commonMistakes: mistakes,
      layerWeights: Object.fromEntries(this.weights),
    };
  }

  /**
   * Detect common mistake patterns
   */
  private detectMistakes(records: FeedbackRecord[]): MistakePattern[] {
    const mistakes = new Map<string, number>();

    for (const record of records) {
      if (!record.feedback.helpful && record.feedback.correctType) {
        const pattern = `Classified ${record.classification.type} as ${record.feedback.correctType}`;
        mistakes.set(pattern, (mistakes.get(pattern) || 0) + 1);
      }
    }

    return Array.from(mistakes.entries())
      .map(([pattern, frequency]) => ({
        pattern,
        frequency,
        correction: pattern.split(' as ')[1],
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5); // Top 5 mistakes
  }

  /**
   * Calculate accuracy improvement over time
   */
  private calculateImprovement(records: FeedbackRecord[]): number {
    if (records.length < 20) return 0;

    // Compare first 10 vs last 10
    const first10 = records.slice(0, 10);
    const last10 = records.slice(-10);

    const firstAccuracy = first10.filter(r => r.feedback.helpful).length / 10;
    const lastAccuracy = last10.filter(r => r.feedback.helpful).length / 10;

    return ((lastAccuracy - firstAccuracy) / firstAccuracy) * 100;
  }

  /**
   * Load all feedback records
   */
  private async loadAllFeedback(): Promise<FeedbackRecord[]> {
    const decisions = await this.governance.queryDecisions({
      type: 'feedback',
    });

    return decisions.map(d => d.data as FeedbackRecord);
  }

  /**
   * Load layer weights from disk
   */
  private loadWeights(): Map<MemoryLayer, number> {
    const weightsFile = path.join(process.cwd(), '.arela', 'learning', 'weights.json');
    
    if (fs.existsSync(weightsFile)) {
      const data = fs.readJSONSync(weightsFile);
      return new Map(Object.entries(data));
    }

    // Default weights (all equal)
    return new Map([
      [MemoryLayer.SESSION, 1.0],
      [MemoryLayer.PROJECT, 1.0],
      [MemoryLayer.USER, 1.0],
      [MemoryLayer.VECTOR, 1.0],
      [MemoryLayer.GRAPH, 1.0],
      [MemoryLayer.GOVERNANCE, 1.0],
    ]);
  }

  /**
   * Save layer weights to disk
   */
  private async saveWeights(): Promise<void> {
    const weightsFile = path.join(process.cwd(), '.arela', 'learning', 'weights.json');
    await fs.ensureDir(path.dirname(weightsFile));
    await fs.writeJSON(weightsFile, Object.fromEntries(this.weights), { spaces: 2 });
  }

  /**
   * Get current layer weights (for use in routing)
   */
  getWeights(): Map<MemoryLayer, number> {
    return new Map(this.weights);
  }
}
```

### CLI Command

```typescript
// src/cli.ts
program
  .command('feedback')
  .description('Provide feedback on last query result')
  .option('--helpful', 'Mark as helpful')
  .option('--not-helpful', 'Mark as not helpful')
  .option('--correct-layers <layers>', 'Correct layer selection (comma-separated)')
  .option('--correct-type <type>', 'Correct query type')
  .option('--comment <text>', 'Additional comment')
  .action(async (options) => {
    const learner = new FeedbackLearner(process.cwd());
    
    // Get last query from session
    const lastQuery = await getLastQuery();
    
    const feedback: UserFeedback = {
      helpful: options.helpful || false,
      correctLayers: options.correctLayers?.split(','),
      correctType: options.correctType,
      comment: options.comment,
    };
    
    await learner.recordFeedback(
      lastQuery.query,
      lastQuery.classification,
      lastQuery.routing,
      feedback
    );
    
    console.log('✅ Feedback recorded. Thank you!');
  });

program
  .command('feedback:stats')
  .description('Show learning statistics')
  .action(async () => {
    const learner = new FeedbackLearner(process.cwd());
    const stats = await learner.getStats();
    
    console.log('\n📊 Learning Statistics\n');
    console.log(`Total Feedback: ${stats.totalFeedback}`);
    console.log(`Helpful Rate: ${stats.helpfulRate.toFixed(1)}%`);
    console.log(`Accuracy Improvement: ${stats.accuracyImprovement.toFixed(1)}%`);
    
    if (stats.commonMistakes.length > 0) {
      console.log('\n🔍 Common Mistakes:');
      stats.commonMistakes.forEach((mistake, i) => {
        console.log(`  ${i + 1}. ${mistake.pattern} (${mistake.frequency}x)`);
      });
    }
    
    console.log('\n⚖️  Layer Weights:');
    Object.entries(stats.layerWeights).forEach(([layer, weight]) => {
      console.log(`  ${layer}: ${weight.toFixed(2)}`);
    });
  });
```

---

## Files to Create

1. **`src/learning/types.ts`**
   - Feedback interfaces
   - Learning stats types

2. **`src/learning/feedback-learner.ts`**
   - Main learner class
   - Weight adjustment logic

3. **`src/learning/index.ts`**
   - Public API exports

4. **`test/learning/feedback.test.ts`**
   - Unit tests

---

## Test Cases

### Test 1: Record Helpful Feedback
```typescript
const learner = new FeedbackLearner('/project');

await learner.recordFeedback(query, classification, routing, {
  helpful: true,
});

const stats = await learner.getStats();
expect(stats.totalFeedback).toBe(1);
expect(stats.helpfulRate).toBe(100);
```

### Test 2: Weight Adjustment
```typescript
// User corrects: should have used PROJECT layer, not SESSION
await learner.recordFeedback(query, classification, routing, {
  helpful: false,
  correctLayers: [MemoryLayer.PROJECT],
});

const weights = learner.getWeights();
expect(weights.get(MemoryLayer.PROJECT)).toBeGreaterThan(1.0);
expect(weights.get(MemoryLayer.SESSION)).toBeLessThan(1.0);
```

### Test 3: Accuracy Improvement
```typescript
// Record 20 feedbacks (first 10 bad, last 10 good)
for (let i = 0; i < 20; i++) {
  await learner.recordFeedback(query, classification, routing, {
    helpful: i >= 10, // First 10 not helpful, last 10 helpful
  });
}

const stats = await learner.getStats();
expect(stats.accuracyImprovement).toBeGreaterThan(50); // >50% improvement
```

---

## Acceptance Criteria

- [ ] Records user feedback in Governance layer
- [ ] Adjusts layer weights based on corrections
- [ ] Tracks learning statistics
- [ ] CLI commands work (`arela feedback`, `arela feedback:stats`)
- [ ] Accuracy improves by 10%+ after 100 feedbacks
- [ ] All tests pass

---

## Success Metrics

- **Accuracy Improvement:** 10%+ after 100 feedbacks
- **Helpful Rate:** >80% after learning
- **Weight Convergence:** Weights stabilize after 50 feedbacks
- **Pattern Detection:** Identifies top 5 common mistakes

---

## Notes

- Store feedback in Governance layer (immutable audit trail)
- Weights saved to `.arela/learning/weights.json`
- Foundation for future fine-tuning feature
- User-specific profiles can be added later

---

## Related Tickets

- CASCADE-001: Integration (uses adjusted weights)
- CODEX-005: Multi-Hop Reasoning (next feature)
