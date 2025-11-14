import process from "node:process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { search, type RagConfig, ensureOllamaInstalled, ensureModelAvailable, isOllamaRunning, startOllamaServer } from "../rag/index.js";
import { createRequire } from "module";
import { searchEnforcer } from "./search-enforcer.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json");
const PACKAGE_VERSION: string = (pkg as { version?: string }).version ?? "0.0.0";
const DEFAULT_TOP_K = 5;

export interface ArelaMcpServerOptions {
  cwd?: string;
  model?: string;
  ollamaHost?: string;
  defaultTopK?: number;
}

interface SearchPayload extends Record<string, unknown> {
  query: string;
  tookMs: number;
  results: Array<{
    file: string;
    chunk: string;
    score: number;
  }>;
}

function formatResultText(payload: SearchPayload): string {
  const header = [`Query: ${payload.query}`, `Matches: ${payload.results.length}`, `Latency: ${payload.tookMs}ms`].join(
    " | ",
  );

  if (!payload.results.length) {
    return `${header}\n(No matching chunks found in the local index)`;
  }

  const body = payload.results
    .map((item, index) => {
      const snippet = item.chunk.trim().replace(/\s+/g, " ");
      const truncated = snippet.length <= 320 ? snippet : `${snippet.slice(0, 320)}…`;
      return `${index + 1}. ${item.file} [score=${item.score.toFixed(4)}]\n   ${truncated}`;
    })
    .join("\n\n");

  return `${header}\n\n${body}`;
}

export function createArelaMcpServer(options: ArelaMcpServerOptions = {}): McpServer {
  const server = new McpServer({
    name: "arela-rag",
    version: PACKAGE_VERSION,
  });

  const ragConfig: RagConfig = {
    cwd: options.cwd ?? process.cwd(),
    model: options.model,
    ollamaHost: options.ollamaHost,
  };

  const defaultTopK = options.defaultTopK ?? DEFAULT_TOP_K;

  server.registerTool(
    "arela_search",
    {
      title: "Arela Semantic Search",
      description: "Search the local Arela RAG index for relevant files and chunks.",
      inputSchema: {
        query: z.string().min(3, "Provide a more descriptive query."),
        topK: z.number().int().min(1).max(20).optional().describe("Maximum number of chunks to return"),
      },
      outputSchema: {
        query: z.string(),
        tookMs: z.number(),
        results: z.array(
          z.object({
            file: z.string(),
            score: z.number(),
            chunk: z.string(),
          }),
        ),
      },
    },
    async ({ query, topK }) => {
      const start = Date.now();
      
      // Record arela_search usage
      searchEnforcer.recordToolCall('arela_search', { query, topK });
      
      try {
        const results = await search(query, ragConfig, topK ?? defaultTopK);
        const payload: SearchPayload = {
          query,
          tookMs: Date.now() - start,
          results: results.map((item) => ({
            file: item.file,
            chunk: item.chunk,
            score: Number(item.score.toFixed(6)),
          })),
        };

        return {
          content: [{ type: "text", text: formatResultText(payload) }],
          structuredContent: payload,
        };
      } catch (error) {
        const payload: SearchPayload = {
          query,
          tookMs: Date.now() - start,
          results: [],
        };

        const message = (error as Error).message ?? "Unknown error";
        return {
          content: [{ type: "text", text: `Search failed: ${message}` }],
          structuredContent: payload,
          isError: true,
        };
      }
    },
  );

  // Register grep_search wrapper that enforces arela_search first
  server.registerTool(
    "grep_search",
    {
      title: "Grep Search (Enforced)",
      description: "Search files using grep. NOTE: You MUST try arela_search first!",
      inputSchema: {
        query: z.string().min(1, "Provide a search query"),
        path: z.string().optional().describe("Path to search in"),
      },
      outputSchema: {
        allowed: z.boolean(),
        message: z.string(),
      },
    },
    async ({ query, path }) => {
      // Record grep attempt
      searchEnforcer.recordToolCall('grep_search', { query, path });
      
      // Validate if grep is allowed
      const validation = searchEnforcer.validateGrepAttempt(query);
      
      if (!validation.allowed) {
        // BLOCKED! Return error message
        return {
          content: [{ type: "text", text: validation.message! }],
          structuredContent: {
            allowed: false,
            message: validation.message!
          },
          isError: true,
        };
      }
      
      // Allowed - they tried arela_search first
      return {
        content: [{ type: "text", text: "✅ grep_search allowed (you tried arela_search first). Proceed with your grep command." }],
        structuredContent: {
          allowed: true,
          message: "Allowed - arela_search was tried first"
        },
      };
    },
  );

  return server;
}

export async function runArelaMcpServer(options: ArelaMcpServerOptions = {}): Promise<void> {
  const { cwd = process.cwd(), model = "nomic-embed-text", ollamaHost = "http://localhost:11434" } = options;
  
  // Ensure Ollama is installed and running with the required model
  await ensureOllamaInstalled();
  
  if (!(await isOllamaRunning(ollamaHost))) {
    await startOllamaServer();
  }
  
  await ensureModelAvailable(model, ollamaHost);
  
  const server = createArelaMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
