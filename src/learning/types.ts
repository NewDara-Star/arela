import { MemoryLayer } from "../memory/hexi-memory.js";
import { QueryType, ClassificationResult, RoutingResult } from "../meta-rag/types.js";

/**
 * User feedback on a query result
 */
export interface UserFeedback {
  helpful: boolean;
  correctLayers?: MemoryLayer[]; // User's correction of which layers should have been used
  correctType?: QueryType; // User's correction of query type classification
  comment?: string; // Additional user comment
}

/**
 * Complete feedback record stored in governance layer
 */
export interface FeedbackRecord {
  id: string;
  timestamp: string;
  query: string;
  classification: ClassificationResult;
  routing: RoutingResult;
  feedback: UserFeedback;
  context: {
    projectPath: string;
    userId?: string;
  };
}

/**
 * Aggregated learning statistics
 */
export interface LearningStats {
  totalFeedback: number;
  helpfulRate: number; // Percentage of helpful feedback
  accuracyImprovement: number; // Percentage improvement over time
  commonMistakes: MistakePattern[];
  layerWeights: Record<string, number>; // Current layer weights
}

/**
 * Common mistake pattern detected from feedback
 */
export interface MistakePattern {
  pattern: string; // e.g., "Classified CODE as ARCHITECTURE"
  frequency: number; // How many times this mistake occurred
  correction: string; // What the correct classification should be
}

/**
 * Last query information stored in session
 */
export interface LastQueryInfo {
  query: string;
  classification: ClassificationResult;
  routing: RoutingResult;
  timestamp: number;
}
