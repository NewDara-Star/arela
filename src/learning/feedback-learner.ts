import path from "node:path";
import fs from "fs-extra";
import { randomUUID } from "node:crypto";
import { AuditMemory } from "../memory/audit.js";
import { MemoryLayer } from "../memory/hexi-memory.js";
import { ClassificationResult, RoutingResult } from "../meta-rag/types.js";
import type {
  FeedbackRecord,
  UserFeedback,
  LearningStats,
  MistakePattern,
} from "./types.js";

/**
 * FeedbackLearner - Learns from user feedback to improve routing accuracy
 *
 * Features:
 * - Records user feedback on query results
 * - Stores feedback in governance layer (audit trail)
 * - Adjusts layer weights based on corrections
 * - Tracks accuracy improvement over time
 * - Detects common mistake patterns
 */
export class FeedbackLearner {
  private audit: AuditMemory;
  private weights: Map<MemoryLayer, number>;
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
    this.audit = new AuditMemory(projectPath);
    this.weights = new Map();
  }

  /**
   * Initialize the feedback learner
   */
  async init(): Promise<void> {
    await this.audit.init();
    this.weights = await this.loadWeights();
  }

  /**
   * Record user feedback on a query result
   */
  async recordFeedback(
    query: string,
    classification: ClassificationResult,
    routing: RoutingResult,
    feedback: UserFeedback
  ): Promise<void> {
    const record: FeedbackRecord = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      query,
      classification,
      routing,
      feedback,
      context: {
        projectPath: this.projectPath,
      },
    };

    // Store in audit log via governance layer
    await this.audit.logDecision({
      agent: "feedback-learner",
      action: "user_feedback",
      result: feedback.helpful ? "success" : "failure",
      metadata: {
        type: "feedback",
        data: record,
      },
    });

    console.log(`✅ Feedback recorded: ${feedback.helpful ? "👍 Helpful" : "👎 Not helpful"}`);

    // Adjust weights if user provided corrections
    if (feedback.correctLayers || feedback.correctType) {
      await this.adjustWeights(record);
    }
  }

  /**
   * Adjust layer weights based on user corrections
   */
  private async adjustWeights(record: FeedbackRecord): Promise<void> {
    const { classification, feedback } = record;

    // If user corrected which layers should have been used
    if (feedback.correctLayers) {
      const predicted = classification.layers;
      const correct = feedback.correctLayers;

      // Increase weight for correct layers
      for (const layer of correct) {
        const current = this.weights.get(layer) || 1.0;
        this.weights.set(layer, current * 1.1); // +10%
      }

      // Decrease weight for incorrectly predicted layers
      for (const layer of predicted) {
        if (!correct.includes(layer)) {
          const current = this.weights.get(layer) || 1.0;
          this.weights.set(layer, current * 0.9); // -10%
        }
      }

      await this.saveWeights();
      console.log(`🔄 Layer weights adjusted based on feedback`);
    }
  }

  /**
   * Get learning statistics
   */
  async getStats(): Promise<LearningStats> {
    const records = await this.loadAllFeedback();

    const totalFeedback = records.length;
    const helpfulCount = records.filter((r) => r.feedback.helpful).length;
    const helpfulRate = totalFeedback > 0 ? (helpfulCount / totalFeedback) * 100 : 0;

    // Detect common mistakes
    const mistakes = this.detectMistakes(records);

    // Calculate accuracy improvement
    const accuracyImprovement = this.calculateImprovement(records);

    // Convert weights map to object for serialization
    const layerWeights: Record<string, number> = {};
    for (const [layer, weight] of this.weights.entries()) {
      layerWeights[layer] = weight;
    }

    return {
      totalFeedback,
      helpfulRate,
      accuracyImprovement,
      commonMistakes: mistakes,
      layerWeights,
    };
  }

  /**
   * Detect common mistake patterns from feedback
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
        correction: pattern.split(" as ")[1] || "",
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5); // Top 5 mistakes
  }

  /**
   * Calculate accuracy improvement over time
   * Compares first 10 feedback vs last 10 feedback
   */
  private calculateImprovement(records: FeedbackRecord[]): number {
    if (records.length < 20) {
      return 0;
    }

    // Records are in DESC order (most recent first), so reverse to get chronological order
    const chronological = [...records].reverse();

    // Compare first 10 vs last 10
    const first10 = chronological.slice(0, 10);
    const last10 = chronological.slice(-10);

    const firstAccuracy = first10.filter((r) => r.feedback.helpful).length / 10;
    const lastAccuracy = last10.filter((r) => r.feedback.helpful).length / 10;

    if (firstAccuracy === 0) {
      return 0;
    }

    return ((lastAccuracy - firstAccuracy) / firstAccuracy) * 100;
  }

  /**
   * Load all feedback records from audit log
   */
  private async loadAllFeedback(): Promise<FeedbackRecord[]> {
    const trail = await this.audit.getAuditTrail({ limit: 1000 });

    return trail.entries
      .filter((entry) => {
        const metadata = entry.metadata as any;
        return metadata?.type === "feedback";
      })
      .map((entry) => {
        const metadata = entry.metadata as any;
        return metadata.data as FeedbackRecord;
      });
  }

  /**
   * Load layer weights from disk
   */
  private async loadWeights(): Promise<Map<MemoryLayer, number>> {
    const weightsFile = path.join(this.projectPath, ".arela", "learning", "weights.json");

    if (await fs.pathExists(weightsFile)) {
      const data = await fs.readJSON(weightsFile);
      return new Map(Object.entries(data)) as Map<MemoryLayer, number>;
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
    const weightsFile = path.join(this.projectPath, ".arela", "learning", "weights.json");
    await fs.ensureDir(path.dirname(weightsFile));

    const weightsObj: Record<string, number> = {};
    for (const [layer, weight] of this.weights.entries()) {
      weightsObj[layer] = weight;
    }

    await fs.writeJSON(weightsFile, weightsObj, { spaces: 2 });
  }

  /**
   * Get current layer weights (for use in routing)
   */
  getWeights(): Map<MemoryLayer, number> {
    return new Map(this.weights);
  }

  /**
   * Export feedback data for fine-tuning
   */
  async exportForFineTuning(outputPath?: string): Promise<string> {
    const records = await this.loadAllFeedback();

    const exportData = records.map((record) => ({
      query: record.query,
      classification: record.classification.type,
      layers: record.classification.layers,
      helpful: record.feedback.helpful,
      correctLayers: record.feedback.correctLayers,
      correctType: record.feedback.correctType,
    }));

    const defaultPath = path.join(this.projectPath, ".arela", "learning", "feedback-export.json");
    const finalPath = outputPath || defaultPath;

    await fs.ensureDir(path.dirname(finalPath));
    await fs.writeJSON(finalPath, exportData, { spaces: 2 });

    return finalPath;
  }
}
