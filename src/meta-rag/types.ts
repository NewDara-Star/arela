import { MemoryLayer } from "../memory/hexi-memory.js";

export enum QueryType {
  PROCEDURAL = "procedural",
  FACTUAL = "factual",
  ARCHITECTURAL = "architectural",
  USER = "user",
  HISTORICAL = "historical",
  GENERAL = "general",
}

export interface ClassificationResult {
  query: string;
  type: QueryType;
  confidence: number;
  layers: MemoryLayer[];
  weights: Record<MemoryLayer, number>;
  reasoning: string;
}

export interface LayerRoutingRule {
  layers: MemoryLayer[];
  weights: Record<MemoryLayer, number>;
}
