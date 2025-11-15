import ollama from "ollama";
import { MemoryLayer } from "../memory/hexi-memory.js";
import type {
  QueryType,
  ClassificationResult,
  LayerRoutingRule,
} from "./types.js";
import { QueryType as QT } from "./types.js";

/**
 * QueryClassifier - Classifies user queries and determines which memory layers to query
 * 
 * Uses Ollama (local, free) to classify queries into types:
 * - PROCEDURAL: "Continue working on...", "Implement..."
 * - FACTUAL: "What is...", "How does..."
 * - ARCHITECTURAL: "Show me structure...", "Dependencies..."
 * - USER: "What's my preferred...", "My expertise..."
 * - HISTORICAL: "What decisions...", "Why did we..."
 * - GENERAL: Fallback
 */
export class QueryClassifier {
  private readonly model = "llama3.2:3b"; // Meta's Llama 3.2 3B - recommended by Meta-RAG research for <200ms classification
  private ollamaAvailable: boolean = false;
  private useOllama: boolean = true; // Can disable for faster fallback

  /**
   * Initialize the classifier and check Ollama availability
   */
  async init(): Promise<void> {
    try {
      // Test if Ollama is available
      await ollama.list();
      this.ollamaAvailable = true;
      console.log("✅ Ollama available for query classification");
    } catch (error) {
      this.ollamaAvailable = false;
      console.warn(
        "⚠️  Ollama not available, using fallback classification"
      );
    }
  }

  /**
   * Classify a query and determine which layers to query
   */
  async classify(query: string): Promise<ClassificationResult> {
    if (!this.ollamaAvailable) {
      return this.fallbackClassification(query);
    }

    try {
      const result = await this.classifyWithOllama(query);
      return result;
    } catch (error) {
      console.warn("Ollama classification failed, using fallback:", error);
      return this.fallbackClassification(query);
    }
  }

  /**
   * Classify using Ollama
   */
  private async classifyWithOllama(
    query: string
  ): Promise<ClassificationResult> {
    const prompt = `You are an expert query classifier for the Arela Meta-RAG system. Your task is to classify a user's query into one of five distinct types.

You MUST return a single, valid JSON object with the schema:
{"type": "TYPE", "confidence": 0.0-1.0, "reasoning": "Your step-by-step analysis."}

Think step-by-step to determine the correct type:
1. Analyze the user's query.
2. Compare its intent and keywords against the definitions below.
3. Pay close attention to the contrastive examples to resolve ambiguity.
4. Provide your step-by-step analysis in the "reasoning" field.
5. Select the single best "type" and provide a "confidence" score.

---

1. **PROCEDURAL**:
   * Intent: The user wants to DO, CREATE, or CONTINUE an action or task.
   * Keywords: "implement", "continue", "add", "create", "build", "make", "refactor".
   * Example Query: "Continue working on the authentication"
   * Example JSON: {"type": "PROCEDURAL", "confidence": 0.9, "reasoning": "The query uses the keyword 'Continue', indicating a task-oriented action. This is a PROCEDURAL request."}

2. **FACTUAL**:
   * Intent: The user is seeking general KNOWLEDGE or an EXPLANATION of a concept.
   * Keywords: "what is", "how does", "explain", "describe", "what's the".
   * Contrast: This is for *concepts* ("What is JWT?"), not *code structure* ("What imports auth.ts?").
   * Example Query: "How does bcrypt work?"
   * Example JSON: {"type": "FACTUAL", "confidence": 1.0, "reasoning": "The query uses 'How does...work', seeking an explanation of a concept. This is a standard FACTUAL request."}

3. **ARCHITECTURAL**:
   * Intent: The user is asking about the CODE STRUCTURE, dependencies, or file relationships.
   * Keywords: "show dependencies", "imports", "structure", "calls", "uses", "diagram", "file structure".
   * Contrast: This is for *code structure* ("What imports auth.ts?"), not *concepts* ("What is auth?").
   * Example Query: "What imports the auth module?"
   * Example JSON: {"type": "ARCHITECTURAL", "confidence": 0.9, "reasoning": "The query uses the keyword 'imports' and asks about a specific code module ('auth module'), indicating a request about code structure. This is ARCHITECTURAL."}

4. **USER**:
   * Intent: The user is asking about their *own* preferences, expertise, or habits.
   * Keywords: "my preferred", "my expertise", "what do I like", "my setup".
   * Contrast: This is *personal* to the user ("What's my preferred framework?"), not *general* ("What is a framework?").
   * Example Query: "What is my preferred testing framework?"
   * Example JSON: {"type": "USER", "confidence": 1.0, "reasoning": "The query uses the phrase 'my preferred', indicating a request for personal user data. This is a USER request."}

5. **HISTORICAL**:
   * Intent: The user is asking about *past* decisions, rationale, or project history.
   * Keywords: "what decisions were made", "why did we", "history", "rationale", "when did we".
   * Contrast: This is about *past rationale* ("Why did we choose Postgres?"), not *current state* ("What database are we using?").
   * Example Query: "Why did we choose PostgreSQL?"
   * Example JSON: {"type": "HISTORICAL", "confidence": 0.9, "reasoning": "The query uses 'Why did we choose', asking for the rationale behind a past decision. This is a HISTORICAL request."}

---

Query: "${query}"

Think step-by-step and return ONLY the JSON:`;

    const response = await ollama.generate({
      model: this.model,
      prompt,
      format: "json",
      keep_alive: -1, // CRITICAL: Keep model warm (eliminates 3.8s cold-start!)
      options: {
        temperature: 0.1, // Low temperature for consistent classification
        num_predict: 150, // Increased for reasoning field
      },
    });

    let parsed: any;
    try {
      // Clean response (remove markdown if present)
      let cleaned = response.response.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      }
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/```\n?/g, "");
      }
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.warn("Failed to parse Ollama response:", response.response);
      return this.fallbackClassification(query);
    }

    const type = this.normalizeQueryType(parsed.type);
    const confidence = Math.min(Math.max(parsed.confidence || 0.5, 0), 1);
    const reasoning = parsed.reasoning || "Classified by Ollama";

    // If confidence is too low, use GENERAL
    const finalType = confidence < 0.5 ? QT.GENERAL : type;

    const routing = this.getRoutingRule(finalType);

    return {
      query,
      type: finalType,
      confidence,
      layers: routing.layers,
      weights: routing.weights,
      reasoning,
    };
  }

  /**
   * Fallback classification using simple keyword matching
   */
  private fallbackClassification(query: string): ClassificationResult {
    const lower = query.toLowerCase();

    let type: QueryType = QT.GENERAL;
    let reasoning = "Fallback classification";

    // Simple keyword-based classification
    if (
      lower.includes("continue") ||
      lower.includes("implement") ||
      lower.includes("add") ||
      lower.includes("create") ||
      lower.includes("build")
    ) {
      type = QT.PROCEDURAL;
      reasoning = "Contains procedural keywords";
    } else if (
      lower.includes("what is") ||
      lower.includes("how does") ||
      lower.includes("explain") ||
      lower.includes("tell me about")
    ) {
      type = QT.FACTUAL;
      reasoning = "Contains factual question keywords";
    } else if (
      lower.includes("structure") ||
      lower.includes("dependencies") ||
      lower.includes("imports") ||
      lower.includes("architecture")
    ) {
      type = QT.ARCHITECTURAL;
      reasoning = "Contains architectural keywords";
    } else if (
      lower.includes("my preferred") ||
      lower.includes("my expertise") ||
      lower.includes("i like") ||
      lower.includes("i use")
    ) {
      type = QT.USER;
      reasoning = "Contains user preference keywords";
    } else if (
      lower.includes("decision") ||
      lower.includes("why did we") ||
      lower.includes("history") ||
      lower.includes("change")
    ) {
      type = QT.HISTORICAL;
      reasoning = "Contains historical keywords";
    }

    const routing = this.getRoutingRule(type);

    return {
      query,
      type,
      confidence: 0.6, // Lower confidence for fallback
      layers: routing.layers,
      weights: routing.weights,
      reasoning,
    };
  }

  /**
   * Normalize query type string to enum
   */
  private normalizeQueryType(typeStr: string): QueryType {
    const normalized = typeStr.toUpperCase();
    switch (normalized) {
      case "PROCEDURAL":
        return QT.PROCEDURAL;
      case "FACTUAL":
        return QT.FACTUAL;
      case "ARCHITECTURAL":
        return QT.ARCHITECTURAL;
      case "USER":
        return QT.USER;
      case "HISTORICAL":
        return QT.HISTORICAL;
      default:
        return QT.GENERAL;
    }
  }

  /**
   * Get routing rule for a query type
   */
  private getRoutingRule(type: QueryType): LayerRoutingRule {
    const rules: Record<QueryType, LayerRoutingRule> = {
      [QT.PROCEDURAL]: {
        layers: [MemoryLayer.SESSION, MemoryLayer.PROJECT, MemoryLayer.VECTOR],
        weights: {
          [MemoryLayer.SESSION]: 0.4,
          [MemoryLayer.PROJECT]: 0.3,
          [MemoryLayer.VECTOR]: 0.3,
          [MemoryLayer.USER]: 0.0,
          [MemoryLayer.GRAPH]: 0.0,
          [MemoryLayer.GOVERNANCE]: 0.0,
        },
      },

      [QT.FACTUAL]: {
        layers: [MemoryLayer.VECTOR, MemoryLayer.GRAPH],
        weights: {
          [MemoryLayer.VECTOR]: 0.6,
          [MemoryLayer.GRAPH]: 0.4,
          [MemoryLayer.SESSION]: 0.0,
          [MemoryLayer.PROJECT]: 0.0,
          [MemoryLayer.USER]: 0.0,
          [MemoryLayer.GOVERNANCE]: 0.0,
        },
      },

      [QT.ARCHITECTURAL]: {
        layers: [
          MemoryLayer.GRAPH,
          MemoryLayer.PROJECT,
          MemoryLayer.GOVERNANCE,
        ],
        weights: {
          [MemoryLayer.GRAPH]: 0.5,
          [MemoryLayer.PROJECT]: 0.3,
          [MemoryLayer.GOVERNANCE]: 0.2,
          [MemoryLayer.SESSION]: 0.0,
          [MemoryLayer.USER]: 0.0,
          [MemoryLayer.VECTOR]: 0.0,
        },
      },

      [QT.USER]: {
        layers: [MemoryLayer.USER],
        weights: {
          [MemoryLayer.USER]: 1.0,
          [MemoryLayer.SESSION]: 0.0,
          [MemoryLayer.PROJECT]: 0.0,
          [MemoryLayer.VECTOR]: 0.0,
          [MemoryLayer.GRAPH]: 0.0,
          [MemoryLayer.GOVERNANCE]: 0.0,
        },
      },

      [QT.HISTORICAL]: {
        layers: [MemoryLayer.GOVERNANCE, MemoryLayer.PROJECT],
        weights: {
          [MemoryLayer.GOVERNANCE]: 0.5,
          [MemoryLayer.PROJECT]: 0.5,
          [MemoryLayer.SESSION]: 0.0,
          [MemoryLayer.USER]: 0.0,
          [MemoryLayer.VECTOR]: 0.0,
          [MemoryLayer.GRAPH]: 0.0,
        },
      },

      [QT.GENERAL]: {
        layers: [
          MemoryLayer.SESSION,
          MemoryLayer.PROJECT,
          MemoryLayer.USER,
          MemoryLayer.VECTOR,
          MemoryLayer.GRAPH,
          MemoryLayer.GOVERNANCE,
        ],
        weights: {
          [MemoryLayer.SESSION]: 0.2,
          [MemoryLayer.PROJECT]: 0.2,
          [MemoryLayer.USER]: 0.1,
          [MemoryLayer.VECTOR]: 0.2,
          [MemoryLayer.GRAPH]: 0.2,
          [MemoryLayer.GOVERNANCE]: 0.1,
        },
      },
    };

    return rules[type];
  }

  /**
   * Get suggested layers for a query type (public API)
   */
  getSuggestedLayers(type: QueryType): MemoryLayer[] {
    return this.getRoutingRule(type).layers;
  }

  /**
   * Get layer weights for a query type (public API)
   */
  getLayerWeights(type: QueryType): Record<MemoryLayer, number> {
    return this.getRoutingRule(type).weights;
  }
}
