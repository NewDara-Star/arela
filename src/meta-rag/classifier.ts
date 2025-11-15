import ollama from "ollama";
import OpenAI from "openai";
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
 * Supports two backends:
 * 1. OpenAI (gpt-4o-mini) - Fast, cheap, reliable (~200ms, $0.0001/query)
 * 2. Ollama (qwen2.5:3b) - Free, local, slower (~1.5s)
 * 
 * Query types:
 * - PROCEDURAL: "Continue working on...", "Implement..."
 * - FACTUAL: "What is...", "How does..."
 * - ARCHITECTURAL: "Show me structure...", "Dependencies..."
 * - USER: "What's my preferred...", "My expertise..."
 * - HISTORICAL: "What decisions...", "Why did we..."
 * - GENERAL: Fallback
 */
export class QueryClassifier {
  private readonly ollamaModel = "qwen2.5:3b";
  private readonly openaiModel = "gpt-4o-mini"; // Fastest, cheapest: $0.150/1M input, $0.600/1M output
  private ollamaAvailable: boolean = false;
  private openaiAvailable: boolean = false;
  private openai?: OpenAI;
  private preferOpenAI: boolean = true; // Prefer OpenAI (faster) over Ollama

  /**
   * Initialize the classifier and check availability of backends
   */
  async init(): Promise<void> {
    // Check OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        // Quick test
        await this.openai.models.list();
        this.openaiAvailable = true;
        console.log("✅ OpenAI available for query classification (gpt-4o-mini)");
      } catch (error) {
        this.openaiAvailable = false;
        console.warn("⚠️  OpenAI not available:", (error as Error).message);
      }
    }

    // Check Ollama
    try {
      await ollama.list();
      this.ollamaAvailable = true;
      console.log("✅ Ollama available for query classification (qwen2.5:3b)");
    } catch (error) {
      this.ollamaAvailable = false;
      console.warn("⚠️  Ollama not available");
    }

    // Warn if nothing available
    if (!this.openaiAvailable && !this.ollamaAvailable) {
      console.warn("⚠️  No classification backend available, using fallback");
    }
  }

  /**
   * Classify a query using best available backend
   * Priority: OpenAI (fast) > Ollama (free) > Fallback (keyword-based)
   */
  async classify(query: string): Promise<ClassificationResult> {
    // Try OpenAI first (fastest)
    if (this.preferOpenAI && this.openaiAvailable && this.openai) {
      try {
        return await this.classifyWithOpenAI(query);
      } catch (error) {
        console.warn("⚠️  OpenAI classification failed, trying Ollama:", (error as Error).message);
      }
    }

    // Try Ollama second (free but slower)
    if (this.ollamaAvailable) {
      try {
        return await this.classifyWithOllama(query);
      } catch (error) {
        console.warn("Ollama classification failed, using fallback:", error);
      }
    }

    // Fallback to keyword-based
    return this.fallbackClassification(query);
  }

  /**
   * Classify using Ollama
   */
  private async classifyWithOllama(
    query: string
  ): Promise<ClassificationResult> {
    // OPTIMIZED SHORT PROMPT (50-73% faster than long prompt!)
    // Research showed: Shorter prompts = faster inference, same accuracy
    const prompt = `Classify this query into ONE type: PROCEDURAL, FACTUAL, ARCHITECTURAL, USER, or HISTORICAL.

Types:
- PROCEDURAL: Do/create/continue task ("implement auth", "continue working")
- FACTUAL: Explain concept ("what is JWT?", "how does bcrypt work?")
- ARCHITECTURAL: Code structure ("show dependencies", "what imports X?")
- USER: Personal preferences ("my preferred framework", "my expertise")
- HISTORICAL: Past decisions ("why did we choose X?", "what decisions were made?")

Query: "${query}"

Return JSON: {"type": "TYPE", "confidence": 0.0-1.0}`;

    const response = await ollama.generate({
      model: this.ollamaModel,
      prompt,
      format: "json",
      keep_alive: -1, // CRITICAL: Keep model warm (eliminates 3.8s cold-start!)
      options: {
        temperature: 0.1, // Low temperature for consistent classification
        num_predict: 50, // Short output: just type + confidence
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
   * Classify using OpenAI (gpt-4o-mini)
   * Fast (~200ms) and cheap ($0.0001/query)
   */
  private async classifyWithOpenAI(
    query: string
  ): Promise<ClassificationResult> {
    if (!this.openai) {
      throw new Error("OpenAI not initialized");
    }

    const prompt = `Classify this query into ONE type: PROCEDURAL, FACTUAL, ARCHITECTURAL, USER, or HISTORICAL.

Types:
- PROCEDURAL: Do/create/continue task ("implement auth", "continue working")
- FACTUAL: Explain concept ("what is JWT?", "how does bcrypt work?")
- ARCHITECTURAL: Code structure ("show dependencies", "what imports X?")
- USER: Personal preferences ("my preferred framework", "my expertise")
- HISTORICAL: Past decisions ("why did we choose X?", "what decisions were made?")

Query: "${query}"

Return JSON: {"type": "TYPE", "confidence": 0.0-1.0}`;

    const response = await this.openai.chat.completions.create({
      model: this.openaiModel,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 50,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.warn("Failed to parse OpenAI response:", content);
      return this.fallbackClassification(query);
    }

    const type = this.normalizeQueryType(parsed.type);
    const confidence = Math.min(Math.max(parsed.confidence || 0.5, 0), 1);
    const reasoning = parsed.reasoning || "Classified by OpenAI";

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
