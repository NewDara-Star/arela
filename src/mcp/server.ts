/**
 * Arela v5 - MCP Server
 * 
 * The AI's Memory Layer for Vibecoding
 * Provides context persistence via Model Context Protocol
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs-extra";
import path from "node:path";
import { mergeUpdates, type StructuredUpdate } from "../../slices/memory/logic.js";
import { verifyClaim, type VerificationRequest } from "../../slices/verification/gatekeeper.js";
import { analyzeImpact, refreshGraph } from "../../slices/graph/gatekeeper.js";
import { startGraphWatcher } from "../../slices/graph/ops.js";
import { startAutoIndexer, buildVectorIndex, searchVectorIndex } from "../../slices/vector/ops.js";
import { summarizeScratchpad } from "../../slices/focus/ops.js";
import { translateVibeToPlan } from "../../slices/translate/ops.js";

const VERSION = "5.0.0";

// ... existing code ...




export interface ServerOptions {
    cwd?: string;
}

export function createArelaServer(options: ServerOptions = {}): McpServer {
    const projectPath = path.resolve(options.cwd ?? process.cwd());

    const server = new McpServer({
        name: "arela",
        version: VERSION,
    });

    // ============================================
    // SESSION GUARD - Programmatic Rule Enforcement
    // ============================================
    // Tracks if arela_context was called. Other tools are BLOCKED until context is loaded.
    // This enforces AGENTS.md reading before ANY action.
    let sessionInitialized = false;

    const requireSession = (): { blocked: boolean; error?: { content: { type: "text"; text: string }[] } } => {
        if (!sessionInitialized) {
            return {
                blocked: true,
                error: {
                    content: [{
                        type: "text" as const,
                        text: "🚫 SESSION NOT INITIALIZED\n\n" +
                            "You must call `arela_context` FIRST to read project rules.\n" +
                            "This is a programmatic enforcement of AGENTS.md governance.\n\n" +
                            "Call arela_context now, then retry this tool."
                    }]
                }
            };
        }
        return { blocked: false };
    };

    // Start background services (Auto-Indexer)
    startAutoIndexer(projectPath);
    startGraphWatcher(projectPath);

    // ===========================================
    // TOOL: arela_context
    // ===========================================
    server.registerTool(
        "arela_context",
        {
            title: "Arela Project Context",
            description:
                "Get the current project context including AGENTS.md (project rules) and SCRATCHPAD.md (session memory). " +
                "Call this at the START of every session to understand the project state.",
            inputSchema: {},
        },
        async () => {
            const agentsPath = path.join(projectPath, "AGENTS.md");
            const scratchpadPath = path.join(projectPath, "SCRATCHPAD.md");

            const hasAgents = await fs.pathExists(agentsPath);
            const hasScratchpad = await fs.pathExists(scratchpadPath);

            const agents = hasAgents ? await fs.readFile(agentsPath, "utf-8") : null;
            const scratchpad = hasScratchpad ? await fs.readFile(scratchpadPath, "utf-8") : null;

            let contextText = `📁 Project: ${projectPath}\n\n`;

            if (agents) {
                contextText += `## AGENTS.md (Project Rules)\n\n${agents}\n\n`;
            } else {
                contextText += `⚠️ No AGENTS.md found. Consider creating one to define project rules.\n\n`;
            }

            if (scratchpad) {
                contextText += `## SCRATCHPAD.md (Session Memory)\n\n${scratchpad}\n`;
            } else {
                contextText += `⚠️ No SCRATCHPAD.md found. Will be created when you update it.\n`;
            }

            // Mark session as initialized - other tools now unblocked
            sessionInitialized = true;

            return { content: [{ type: "text" as const, text: contextText }] };
        }
    );

    // ===========================================
    // TOOL: arela_update
    // ===========================================
    server.registerTool(
        "arela_update",
        {
            title: "Update Arela Scratchpad",
            description:
                "Update the SCRATCHPAD.md file with current session progress. " +
                "Call this at the END of a work session to persist memory for the next session.",
            inputSchema: {
                content: z.string().min(10, "Provide meaningful content to save"),
                mode: z.enum(["replace", "append"]).optional().describe("Replace or append (default: append)"),
            },
        },
        async ({ content, mode }) => {
            // ENFORCE: Session must be initialized first
            const guard = requireSession();
            if (guard.blocked) return guard.error!;

            const scratchpadPath = path.join(projectPath, "SCRATCHPAD.md");
            const timestamp = new Date().toISOString();

            let finalContent: string;

            // Try to parse as structured update if it looks like JSON
            let structuredUpdate: StructuredUpdate | null = null;
            if (content.trim().startsWith("{")) {
                try {
                    structuredUpdate = JSON.parse(content);
                } catch (e) {
                    // Not valid JSON, treat as raw text
                }
            }

            if (mode !== "replace" && await fs.pathExists(scratchpadPath)) {
                const existing = await fs.readFile(scratchpadPath, "utf-8");

                if (structuredUpdate) {
                    finalContent = mergeUpdates(existing, structuredUpdate);
                } else {
                    finalContent = `${existing}\n\n---\n\n## Update: ${timestamp}\n\n${content}`;
                }
            } else {
                // For explicit replace or new file
                finalContent = `# SCRATCHPAD.md\n\n**Last Updated:** ${timestamp}\n\n${content}`;
            }

            await fs.writeFile(scratchpadPath, finalContent, "utf-8");

            return { content: [{ type: "text" as const, text: `✅ Scratchpad updated at ${scratchpadPath}` }] };
        }
    );

    // ===========================================
    // TOOL: arela_verify
    // ===========================================
    server.registerTool(
        "arela_verify",
        {
            title: "Arela Verify Fact",
            description: "Verify a claim about a file to prevent hallucination. ALWAYS use this before stating facts about file content if you haven't read the file recently.",
            inputSchema: {
                claim: z.string().describe("Human readable claim (e.g. 'File has useState')"),
                path: z.string().describe("Relative path to the file"),
                type: z.enum(["contains", "regex", "file_exists"]).describe("Verification method"),
                pattern: z.string().optional().describe("String or regex pattern to look for"),
            },
        },
        async (request) => {
            // Zod validation ensures types but we need to cast to our interface
            const result = await verifyClaim(projectPath, {
                claim: request.claim,
                path: request.path,
                type: request.type as any,
                pattern: request.pattern,
            });

            const emoji = result.verified ? "✅" : "❌";
            return {
                content: [{ type: "text" as const, text: `${emoji} VERIFICATION RESULT: ${result.verified}\n\nReason: ${result.reason}` }]
            };
        }
    );

    // ===========================================
    // TOOL: arela_graph_refresh
    // ===========================================
    server.registerTool(
        "arela_graph_refresh",
        {
            title: "Refresh Graph Index",
            description: "Force a re-scan of the codebase to update the dependency graph. Use this after significant code changes.",
            inputSchema: {},
        },
        async () => {
            const count = await refreshGraph(projectPath);
            return { content: [{ type: "text" as const, text: `✅ Graph refreshed. Indexed ${count} files.` }] };
        }
    );

    // ===========================================
    // TOOL: arela_graph_impact
    // ===========================================
    server.registerTool(
        "arela_graph_impact",
        {
            title: "Check Impact Analysis",
            description: "Analyze dependencies to see what files depend on a specific file (upstream) and what it imports (downstream).",
            inputSchema: {
                path: z.string().describe("Relative path to the file to analyze"),
            },
        },
        async ({ path: filePath }) => {
            const analysis = await analyzeImpact(projectPath, filePath);

            if (!analysis) {
                return { content: [{ type: "text" as const, text: `❌ File not found in graph: ${filePath}. Try running arela_graph_refresh first.` }] };
            }

            let text = `🕸️ IMPACT ANALYSIS for ${filePath}\n\n`;

            if (analysis.upstream.length > 0) {
                text += `⬆️ UPSTREAM (Files that import this):\n${analysis.upstream.map(f => `- ${f}`).join("\n")}\n\n`;
            } else {
                text += `⬆️ UPSTREAM: None (Safe to refactor?)\n\n`;
            }

            if (analysis.downstream.length > 0) {
                text += `⬇️ DOWNSTREAM (Files this imports):\n${analysis.downstream.map(f => `- ${f}`).join("\n")}\n`;
            } else {
                text += `⬇️ DOWNSTREAM: None\n`;
            }

            return { content: [{ type: "text" as const, text }] };
        }
    );

    // ===========================================
    // TOOL: arela_vector_index
    // ===========================================
    server.registerTool(
        "arela_vector_index",
        {
            title: "Index Codebase (Vector/RAG)",
            description: "Scans the codebase and creates embeddings using Ollama. Required for semantic search. WARNING: This can be slow (~1-2 mins).",
            inputSchema: {},
        },
        async () => {
            try {
                const count = await buildVectorIndex(projectPath);
                return { content: [{ type: "text" as const, text: `✅ Indexed ${count} chunks. Ready for search.` }] };
            } catch (e: any) {
                return { content: [{ type: "text" as const, text: `❌ Indexing failed: ${e.message}. Is Ollama running?` }] };
            }
        }
    );

    // ===========================================
    // TOOL: arela_vector_search
    // ===========================================
    server.registerTool(
        "arela_vector_search",
        {
            title: "Semantic Code Search",
            description: "Find code by meaning/concept (e.g., 'auth login logic') rather than exact keywords.",
            inputSchema: {
                query: z.string().describe("Concept to search for"),
                limit: z.number().optional().describe("Max results (default 5)"),
            },
        },
        async ({ query, limit }) => {
            try {
                const results = await searchVectorIndex(projectPath, query, limit);
                if (results.length === 0) {
                    return { content: [{ type: "text" as const, text: "No results found. Have you run arela_vector_index?" }] };
                }

                const text = results.map(r =>
                    `📄 **${r.file}** (Score: ${r.score.toFixed(2)})\n\`\`\`\n${r.chunk}\n\`\`\n`
                ).join("\n---\n\n");

                return { content: [{ type: "text" as const, text: `🔍 Semantic Results for "${query}":\n\n${text}` }] };
            } catch (e: any) {
                return { content: [{ type: "text" as const, text: `❌ Search failed: ${e.message}` }] };
            }
        }
    );

    // ===========================================
    // TOOL: arela_status
    // ===========================================
    server.registerTool(
        "arela_status",
        {
            title: "Arela Project Status",
            description: "Get a quick status overview of the project.",
            inputSchema: {},
        },
        async () => {
            const hasAgents = await fs.pathExists(path.join(projectPath, "AGENTS.md"));
            const hasScratchpad = await fs.pathExists(path.join(projectPath, "SCRATCHPAD.md"));
            const hasMemory = await fs.pathExists(path.join(projectPath, ".arela"));

            let statusText = `📊 Project Status: ${projectPath}\n\n`;
            statusText += `AGENTS.md: ${hasAgents ? "✅ Present" : "❌ Missing"}\n`;
            statusText += `SCRATCHPAD.md: ${hasScratchpad ? "✅ Present" : "❌ Missing"}\n`;
            statusText += `Memory System: ${hasMemory ? "✅ Initialized" : "⚪ Not initialized"}\n`;

            return { content: [{ type: "text" as const, text: statusText }] };
        }
    );


    // ===========================================
    // TOOL: arela_focus
    // ===========================================
    server.registerTool(
        "arela_focus",
        {
            title: "Focus Context (Summarize)",
            description: "Summarize the SCRATCHPAD.md using OpenAI gpt-4o-mini to save context window space. Use this when the scratchpad gets too long (>500 lines).",
            inputSchema: {
                dryRun: z.boolean().optional().describe("If true, returns summary without saving"),
            },
        },
        async ({ dryRun }) => {
            try {
                const result = await summarizeScratchpad(projectPath, dryRun);
                return { content: [{ type: "text" as const, text: result }] };
            } catch (e: any) {
                return { content: [{ type: "text" as const, text: `❌ Focus failed: ${e.message}` }] };
            }
        }
    );

    // ===========================================
    // TOOL: arela_translate
    // ===========================================
    server.registerTool(
        "arela_translate",
        {
            title: "Translate Vibe to Plan",
            description: "Convert a high-level user request (Vibe) into a concrete execution plan. Helpful for planning new features.",
            inputSchema: {
                vibe: z.string().describe("The user's high-level request"),
            },
        },
        async ({ vibe }) => {
            try {
                const plan = await translateVibeToPlan(projectPath, vibe);
                const planText = `🎯 **Vibecoding Plan**\n\n` +
                    `**Summary:** ${plan.summary}\n\n` +
                    `**Create:**\n${plan.filesToCreate.map(f => `- ${f}`).join("\n")}\n\n` +
                    `**Edit:**\n${plan.filesToEdit.map(f => `- ${f}`).join("\n")}\n\n` +
                    `**Steps:**\n${plan.steps.map(s => `1. ${s}`).join("\n")}`;

                return { content: [{ type: "text" as const, text: planText }] };
            } catch (e: any) {
                return { content: [{ type: "text" as const, text: `❌ Translation failed: ${e.message}` }] };
            }
        }
    );

    return server;
}

/**
 * Run the MCP server with stdio transport
 */
export async function runServer(options: ServerOptions = {}): Promise<void> {
    const server = createArelaServer(options);
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
