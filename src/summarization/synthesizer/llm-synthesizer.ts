import OpenAI from "openai";
import ollama from "ollama";
import type { SemanticContract } from "../extractor/types.js";
import {
  type TechnicalSummary,
  TechnicalSummarySchema,
} from "./types.js";
import { buildSynthesizerPrompt } from "./prompts.js";
import {
  checkAPIKeys,
  showAPIKeyGuide,
} from "../../utils/api-key-helper.js";

export type LLMCaller = (prompt: string) => Promise<string>;

export interface SynthesizerOptions {
  /**
   * Custom LLM caller for testing or advanced usage.
   * Receives a full prompt and must return a raw JSON string.
   */
  llmCaller?: LLMCaller;

  /**
   * Force local summarization without any remote LLM calls.
   * Useful for tests or fully offline environments.
   */
  forceLocal?: boolean;
}

type Backend = "openai" | "ollama" | "local";

export class LLMSynthesizer {
  private readonly options: SynthesizerOptions;
  private readonly openaiModel = "gpt-4o-mini";
  private readonly ollamaModel = "qwen2.5:3b";
  private openai?: OpenAI;
  private backend: Backend = "local";
  private initialized = false;

  constructor(options: SynthesizerOptions = {}) {
    this.options = options;
  }

  /**
   * Synthesize semantic contract into technical summary.
   *
   * The method:
   * - Builds a structured prompt from SemanticContract
   * - Uses best-available backend (OpenAI, Ollama, or local)
   * - Enforces TechnicalSummary schema with zod
   * - Computes basic metadata (token count, compression ratio, timestamp)
   */
  async synthesize(contract: SemanticContract): Promise<TechnicalSummary> {
    if (!this.initialized) {
      await this.initBackend();
    }

    const prompt = buildSynthesizerPrompt(contract);

    let rawSummary: unknown;

    if (this.options.llmCaller) {
      // Test/advanced mode: external caller fully controls LLM interaction.
      const text = await this.options.llmCaller(prompt);
      rawSummary = this.safeParseJson(text);
    } else if (this.backend === "openai" && this.openai) {
      rawSummary = await this.callOpenAI(prompt);
    } else if (this.backend === "ollama") {
      rawSummary = await this.callOllama(prompt);
    } else {
      rawSummary = this.buildLocalSummary(contract);
    }

    const parsed = TechnicalSummarySchema.parse(rawSummary);

    const base: TechnicalSummary = {
      filePath: contract.filePath,
      mainResponsibility: parsed.mainResponsibility,
      publicAPI: parsed.publicAPI,
      ioContracts: parsed.ioContracts,
      dependencies: parsed.dependencies,
      sideEffects: parsed.sideEffects,
      keyAlgorithms: parsed.keyAlgorithms,
      metadata: {
        tokenCount: 0,
        compressionRatio: 0,
        synthesizedAt:
          parsed.metadata?.synthesizedAt ?? new Date().toISOString(),
      },
    };

    const tokenCount = this.countTokens(base);
    const compressionRatio = this.calculateCompression(contract, tokenCount);

    return {
      ...base,
      metadata: {
        ...base.metadata,
        tokenCount,
        compressionRatio,
      },
    };
  }

  private async initBackend(): Promise<void> {
    this.initialized = true;

    if (this.options.forceLocal) {
      this.backend = "local";
      return;
    }

    const status = checkAPIKeys();

    // Prefer OpenAI (cheap + already used elsewhere in Arela)
    if (status.hasOpenAIKey) {
      try {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        await this.openai.models.list();
        this.backend = "openai";
        return;
      } catch {
        this.backend = "local";
      }
    }

    // Try Ollama as a free local fallback
    try {
      await ollama.list();
      this.backend = "ollama";
      return;
    } catch {
      this.backend = "local";
    }

    if (!status.hasAnyKey) {
      // No remote keys and no local model; show user-friendly guide.
      showAPIKeyGuide("error");
    }
  }

  private async callOpenAI(prompt: string): Promise<unknown> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized");
    }

    const response = await this.openai.chat.completions.create({
      model: this.openaiModel,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 512,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI synthesizer");
    }

    return this.safeParseJson(content);
  }

  private async callOllama(prompt: string): Promise<unknown> {
    const response = await ollama.generate({
      model: this.ollamaModel,
      prompt,
      format: "json",
      keep_alive: -1,
      options: {
        temperature: 0.2,
        num_predict: 512,
      },
    });

    return this.safeParseJson(response.response);
  }

  /**
   * Local, deterministic summarizer used when no LLM backend
   * is available or when forceLocal is enabled. This keeps
   * tests fast and avoids mandatory network calls.
   */
  private buildLocalSummary(contract: SemanticContract): unknown {
    const exportedNames = contract.exports.map((e) => e.name);

    const mainResponsibility =
      contract.description ??
      `Technical summary for ${contract.filePath} with ${
        exportedNames.length
      } exported symbol${exportedNames.length === 1 ? "" : "s"}.`;

    const ioContracts = contract.exports
      .flatMap((exp) => {
        if (exp.signature) {
          const params = exp.signature.params
            .map((p) => `${p.name}: ${p.type ?? "unknown"}`)
            .join(", ");
          const returnType = exp.signature.returnType ?? "void";
          return [
            {
              name: exp.name,
              definition: `${exp.name}(${params}): ${returnType}`,
            },
          ];
        }
        if (exp.methods) {
          return exp.methods.map((m) => {
            const params = m.signature.params
              .map((p) => `${p.name}: ${p.type ?? "unknown"}`)
              .join(", ");
            const returnType = m.signature.returnType ?? "void";
            return {
              name: `${exp.name}.${m.name}`,
              definition: `${m.name}(${params}): ${returnType}`,
            };
          });
        }
        return [];
      })
      .filter(Boolean);

    const dependencies =
      contract.imports.length === 0
        ? "None"
        : `Imports ${contract.imports.length} module(s): ${contract.imports
            .map((i) => i.module)
            .join(", ")}`;

    const sideEffects = "Unknown - local summarizer cannot infer side effects";

    return {
      mainResponsibility,
      publicAPI: exportedNames,
      ioContracts,
      dependencies,
      sideEffects,
      keyAlgorithms: contract.description
        ? "Inferred from file-level description"
        : undefined,
    };
  }

  private safeParseJson(text: string): unknown {
    const cleaned = text
      .trim()
      .replace(/^[`\s]*```json\s*/i, "")
      .replace(/^[`\s]*```/, "")
      .replace(/```[\s`]*$/, "");

    return JSON.parse(cleaned || "{}");
  }

  private countTokens(summary: TechnicalSummary): number {
    const text = JSON.stringify(summary);
    return Math.max(1, Math.ceil(text.length / 4));
  }

  private calculateCompression(
    contract: SemanticContract,
    summaryTokens: number,
  ): number {
    const originalText = JSON.stringify(contract);
    const originalTokens = Math.max(
      1,
      Math.ceil(originalText.length / 4),
    );
    return originalTokens / summaryTokens;
  }
}

