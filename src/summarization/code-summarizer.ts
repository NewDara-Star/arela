import fs from "fs-extra";
import path from "path";
import { ASTExtractor } from "./extractor/ast-extractor.js";
import { LLMSynthesizer } from "./synthesizer/llm-synthesizer.js";
import { SemanticCache } from "./cache/semantic-cache.js";
import type { TechnicalSummary } from "./synthesizer/types.js";

export interface SummarizerOptions {
  /**
   * Skip cache and force re-summarization
   */
  noCache?: boolean;
  
  /**
   * Custom cache directory
   */
  cacheDir?: string;
  
  /**
   * Silent mode (no logging)
   */
  silent?: boolean;
}

/**
 * Main orchestrator for code summarization pipeline.
 * 
 * Pipeline:
 * 1. Extract semantic contract (AST)
 * 2. Check cache
 * 3. Synthesize summary (LLM) if cache miss
 * 4. Store in cache
 */
export class CodeSummarizer {
  private readonly extractor: ASTExtractor;
  private readonly synthesizer: LLMSynthesizer;
  private readonly cache: SemanticCache;
  private readonly projectPath: string;
  private readonly silent: boolean;

  constructor(projectPath: string, options: SummarizerOptions = {}) {
    this.projectPath = projectPath;
    this.silent = options.silent ?? false;
    
    this.extractor = new ASTExtractor();
    this.synthesizer = new LLMSynthesizer();
    this.cache = new SemanticCache(projectPath, {
      cacheDir: options.cacheDir,
      logger: this.silent ? () => {} : undefined,
    });
  }

  /**
   * Summarize a code file (with caching)
   */
  async summarize(
    filePath: string,
    options: SummarizerOptions = {}
  ): Promise<TechnicalSummary> {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.projectPath, filePath);

    if (!(await fs.pathExists(absolutePath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    const code = await fs.readFile(absolutePath, "utf-8");

    // Stage 1: Extract semantic contract (AST)
    if (!this.silent) {
      console.log(`📄 Extracting semantic contract from ${filePath}...`);
    }
    const contract = await this.extractor.extract(code, filePath);

    // Check cache first (unless noCache option)
    if (!options.noCache) {
      const cached = await this.cache.get(contract);
      if (cached) {
        if (!this.silent) {
          console.log(`✅ Cache hit! Using cached summary.`);
        }
        return cached;
      }
    }

    // Stage 2: Synthesize summary (LLM)
    if (!this.silent) {
      console.log(`🤖 Synthesizing summary with LLM...`);
    }
    const summary = await this.synthesizer.synthesize(contract);

    // Store in cache
    if (!options.noCache) {
      await this.cache.set(contract, summary);
    }

    return summary;
  }

  /**
   * Summarize multiple files in parallel
   */
  async summarizeBatch(
    filePaths: string[],
    options: SummarizerOptions = {}
  ): Promise<Map<string, TechnicalSummary>> {
    if (!this.silent) {
      console.log(`📚 Summarizing ${filePaths.length} files...`);
    }

    const results = await Promise.all(
      filePaths.map(async (filePath, index) => {
        if (!this.silent) {
          console.log(`  [${index + 1}/${filePaths.length}] ${filePath}`);
        }
        
        try {
          const summary = await this.summarize(filePath, options);
          return [filePath, summary] as [string, TechnicalSummary];
        } catch (error) {
          if (!this.silent) {
            console.error(`  ❌ Failed to summarize ${filePath}:`, error);
          }
          throw error;
        }
      })
    );

    return new Map(results);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupCache(): Promise<number> {
    return await this.cache.cleanup();
  }
}

/**
 * Convert TechnicalSummary to Markdown format
 */
export function summaryToMarkdown(summary: TechnicalSummary): string {
  const lines: string[] = [];

  lines.push(`# ${summary.filePath}`);
  lines.push("");
  lines.push(`## Main Responsibility`);
  lines.push(summary.mainResponsibility);
  lines.push("");

  if (summary.publicAPI.length > 0) {
    lines.push(`## Public API`);
    summary.publicAPI.forEach((api) => {
      lines.push(`- \`${api}\``);
    });
    lines.push("");
  }

  if (summary.ioContracts.length > 0) {
    lines.push(`## I/O Contracts`);
    summary.ioContracts.forEach((contract) => {
      lines.push(`- **${contract.name}:** \`${contract.definition}\``);
    });
    lines.push("");
  }

  lines.push(`## Dependencies`);
  lines.push(summary.dependencies);
  lines.push("");

  lines.push(`## Side Effects`);
  lines.push(summary.sideEffects);
  lines.push("");

  if (summary.keyAlgorithms) {
    lines.push(`## Key Algorithms`);
    lines.push(summary.keyAlgorithms);
    lines.push("");
  }

  lines.push(`## Metadata`);
  lines.push(`- **Token Count:** ${summary.metadata.tokenCount}`);
  lines.push(`- **Compression Ratio:** ${summary.metadata.compressionRatio.toFixed(2)}x`);
  lines.push(`- **Synthesized At:** ${new Date(summary.metadata.synthesizedAt).toLocaleString()}`);

  return lines.join("\n");
}
