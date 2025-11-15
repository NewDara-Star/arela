/**
 * Learning Module - Feedback-based improvement system
 *
 * Implements a feedback learning system that tracks which context was
 * actually useful to users and adapts routing weights over time.
 */

export { FeedbackLearner } from "./feedback-learner.js";
export type {
  UserFeedback,
  FeedbackRecord,
  LearningStats,
  MistakePattern,
  LastQueryInfo,
} from "./types.js";
