import OpenAI from "openai";
import ollama from "ollama";
import type {
  SubQuery,
  DecompositionResult,
  DecomposerOptions,
  ExecutionStrategy,
} from "./types.js";

/**
 * QueryDecomposer - Breaks complex queries into simpler sub-queries
 *
 * Uses LLM (OpenAI or Ollama) to intelligently decompose queries that:
 * - Mention "flow" or "process"
 * - Have multiple parts (and/then/from/to)
 * - Are longer than 10 words
 * - Require tracing through multiple components
 */
export class QueryDecomposer {
  private readonly openaiModel = "gpt-4o-mini";
  private readonly ollamaModel = "qwen2.5:3b";
  private openai?: OpenAI;
  private openaiAvailable = false;
  private ollamaAvailable = false;
  private options: Required<DecomposerOptions>;

  constructor(options: DecomposerOptions = {}) {
    this.options = {
      maxSubQueries: options.maxSubQueries ?? 4,
      minComplexityIndicators: options.minComplexityIndicators ?? 2,
      useOpenAI: options.useOpenAI ?? true,
    };
  }

  /**
   * Initialize LLM backends
   */
  async init(): Promise<void> {
    // Check OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        await this.openai.models.list();
        this.openaiAvailable = true;
      } catch (error) {
        this.openaiAvailable = false;
      }
    }

    // Check Ollama
    try {
      await ollama.list();
      this.ollamaAvailable = true;
    } catch (error) {
      this.ollamaAvailable = false;
    }
  }

  /**
   * Decompose a query into sub-queries
   */
  async decompose(query: string): Promise<DecompositionResult> {
    // Check if query is complex enough to decompose
    if (!this.isComplexQuery(query)) {
      return {
        isComplex: false,
        originalQuery: query,
        subQueries: [],
        strategy: "parallel",
      };
    }

    // Use LLM to break down the query
    const subQueries = await this.breakDown(query);

    // Determine execution strategy
    const strategy = this.determineStrategy(subQueries);

    return {
      isComplex: true,
      originalQuery: query,
      subQueries,
      strategy,
      reasoning: `Query is complex and requires ${subQueries.length} hops to answer fully`,
    };
  }

  /**
   * Detect if a query is complex enough to warrant decomposition
   */
  private isComplexQuery(query: string): boolean {
    const indicators = [
      // Flow/process queries
      /\b(flow|process|workflow|pipeline)\b/i.test(query),

      // Sequential connectors
      /\b(then|next|after|followed by)\b/i.test(query),

      // Range queries (from X to Y)
      /\bfrom\b.*\bto\b/i.test(query),

      // Multiple parts with "and"
      /\band\b/.test(query) && query.split(/\band\b/).length > 2,

      // Question asking "how does X work"
      /how does .* work/i.test(query),

      // Long query (>10 words)
      query.split(/\s+/).length > 10,

      // Multiple questions
      (query.match(/\?/g) || []).length > 1,
    ];

    const matchCount = indicators.filter(Boolean).length;
    return matchCount >= this.options.minComplexityIndicators;
  }

  /**
   * Use LLM to break down query into sub-queries
   */
  private async breakDown(query: string): Promise<SubQuery[]> {
    const prompt = this.buildDecompositionPrompt(query);

    // Try OpenAI first if preferred and available
    if (this.options.useOpenAI && this.openaiAvailable && this.openai) {
      try {
        return await this.decomposeWithOpenAI(prompt);
      } catch (error) {
        console.warn("OpenAI decomposition failed, trying Ollama:", (error as Error).message);
      }
    }

    // Try Ollama
    if (this.ollamaAvailable) {
      try {
        return await this.decomposeWithOllama(prompt);
      } catch (error) {
        console.warn("Ollama decomposition failed, using fallback:", (error as Error).message);
      }
    }

    // Fallback to simple decomposition
    return this.fallbackDecomposition(query);
  }

  /**
   * Build the decomposition prompt
   */
  private buildDecompositionPrompt(query: string): string {
    return `Break down this complex query into 2-${this.options.maxSubQueries} simpler sub-queries.

Original Query: "${query}"

Rules:
1. Each sub-query should be standalone and answerable
2. Sub-queries should follow a logical order
3. If a sub-query depends on another, list it in dependencies
4. Assign priorities (higher = execute first)

Return ONLY a JSON array in this exact format (no markdown, no extra text):
[
  {
    "id": "1",
    "query": "First sub-query that doesn't depend on others",
    "dependencies": [],
    "priority": 3
  },
  {
    "id": "2",
    "query": "Second sub-query that may depend on first",
    "dependencies": ["1"],
    "priority": 2
  }
]`;
  }

  /**
   * Decompose using OpenAI
   */
  private async decomposeWithOpenAI(prompt: string): Promise<SubQuery[]> {
    if (!this.openai) throw new Error("OpenAI not initialized");

    const response = await this.openai.chat.completions.create({
      model: this.openaiModel,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || "[]";
    return this.parseSubQueries(content);
  }

  /**
   * Decompose using Ollama
   */
  private async decomposeWithOllama(prompt: string): Promise<SubQuery[]> {
    const response = await ollama.chat({
      model: this.ollamaModel,
      messages: [{ role: "user", content: prompt }],
      options: {
        temperature: 0.3,
      },
    });

    const content = response.message.content || "[]";
    return this.parseSubQueries(content);
  }

  /**
   * Parse LLM response into SubQuery array
   */
  private parseSubQueries(content: string): SubQuery[] {
    try {
      // Remove markdown code blocks if present
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        throw new Error("Response is not an array");
      }

      return parsed.map((item, index) => ({
        id: item.id || String(index + 1),
        query: item.query || "",
        dependencies: Array.isArray(item.dependencies) ? item.dependencies : [],
        priority: typeof item.priority === "number" ? item.priority : index + 1,
      }));
    } catch (error) {
      console.error("Failed to parse sub-queries:", error);
      return [];
    }
  }

  /**
   * Fallback decomposition using simple heuristics
   */
  private fallbackDecomposition(query: string): SubQuery[] {
    const subQueries: SubQuery[] = [];

    // Try to split by "and"
    if (/\band\b/.test(query)) {
      const parts = query.split(/\band\b/i);
      parts.forEach((part, index) => {
        if (part.trim()) {
          subQueries.push({
            id: String(index + 1),
            query: part.trim(),
            dependencies: index > 0 ? [String(index)] : [],
            priority: parts.length - index,
          });
        }
      });
    }

    // Try to split by "then"
    else if (/\bthen\b/.test(query)) {
      const parts = query.split(/\bthen\b/i);
      parts.forEach((part, index) => {
        if (part.trim()) {
          subQueries.push({
            id: String(index + 1),
            query: part.trim(),
            dependencies: index > 0 ? [String(index)] : [],
            priority: parts.length - index,
          });
        }
      });
    }

    // Default: treat as single query
    else {
      subQueries.push({
        id: "1",
        query: query,
        dependencies: [],
        priority: 1,
      });
    }

    return subQueries.slice(0, this.options.maxSubQueries);
  }

  /**
   * Determine execution strategy based on dependencies
   */
  private determineStrategy(subQueries: SubQuery[]): ExecutionStrategy {
    // Check if any sub-queries have dependencies
    const hasDependencies = subQueries.some((sq) => sq.dependencies.length > 0);

    if (!hasDependencies) {
      // No dependencies = parallel execution
      return "parallel";
    }

    // Check if it's purely sequential (each depends on previous)
    const isSequential = subQueries.every((sq, index) => {
      if (index === 0) return sq.dependencies.length === 0;
      return sq.dependencies.length === 1 && sq.dependencies[0] === String(index);
    });

    if (isSequential) {
      return "sequential";
    }

    // Mix of dependencies = hybrid
    return "hybrid";
  }
}
