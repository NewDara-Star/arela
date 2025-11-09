import http from "node:http";
import { URL } from "node:url";
import pc from "picocolors";
import { search } from "./index.js";

export interface ServerConfig {
  cwd: string;
  port?: number;
  model?: string;
  host?: string;
}

export interface SearchRequest {
  query: string;
  top?: number;
}

export interface SearchResponse {
  results: Array<{
    file: string;
    chunk: string;
    score: number;
  }>;
  query: string;
  took: number;
}

/**
 * Start RAG HTTP server for AI assistants
 */
export async function startServer(config: ServerConfig): Promise<http.Server> {
  const { cwd, port = 3456, model = "nomic-embed-text" } = config;

  const server = http.createServer(async (req, res) => {
    // CORS headers for browser/IDE access
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://localhost:${port}`);

    // Health check
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", model, cwd }));
      return;
    }

    // Search endpoint
    if (url.pathname === "/search") {
      try {
        const query = url.searchParams.get("q") || url.searchParams.get("query");
        const topK = parseInt(url.searchParams.get("top") || "5");

        if (!query) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing query parameter" }));
          return;
        }

        const startTime = Date.now();
        const results = await search(query, { cwd, model }, topK);
        const took = Date.now() - startTime;

        const response: SearchResponse = {
          results,
          query,
          took,
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response, null, 2));

        // Log request
        console.log(pc.dim(`[${new Date().toISOString()}] Search: "${query}" (${results.length} results, ${took}ms)`));
      } catch (error) {
        console.error(pc.red(`Search error: ${(error as Error).message}`));
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(pc.bold(pc.green(`\n🚀 Arela RAG Server running\n`)));
      console.log(pc.cyan(`  Local:   http://localhost:${port}`));
      console.log(pc.dim(`  Model:   ${model}`));
      console.log(pc.dim(`  CWD:     ${cwd}`));
      console.log("");
      console.log(pc.dim("Endpoints:"));
      console.log(pc.dim(`  GET /health`));
      console.log(pc.dim(`  GET /search?q=<query>&top=5`));
      console.log("");
      console.log(pc.dim("Press Ctrl+C to stop"));
      console.log("");
      resolve(server);
    });

    server.on("error", (error) => {
      if ((error as any).code === "EADDRINUSE") {
        console.error(pc.red(`Port ${port} is already in use`));
        console.log(pc.dim("Try a different port: npx arela serve --port 3457"));
      } else {
        console.error(pc.red(`Server error: ${error.message}`));
      }
      reject(error);
    });
  });
}

/**
 * Stop RAG server
 */
export async function stopServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      console.log(pc.yellow("\n✓ Server stopped"));
      resolve();
    });
  });
}
