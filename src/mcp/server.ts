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
import * as test from "../../slices/test/ops.js";
import * as enforce from "../../slices/enforce/ops.js";
import { listPRDs, getPRD, getPRDStatus, createPRD, getUserStories, updatePRDStatus } from "../../slices/prd/ops.js";
import { PRDTypeSchema, PRDStatusSchema } from "../../slices/prd/types.js";
import {
    logSymptomOp,
    registerHypothesisOp,
    confirmHypothesisOp,
    rejectHypothesisOp,
    escalateOp,
    guardStatusOp,
    checkWriteAccessOp,
    trackFileReadOp,
} from "../../slices/guard/ops.js";
import { HypothesisSchema, SymptomSchema } from "../../slices/guard/types.js";
import {
    editFileOp,
    writeFileOp,
    readFileOp,
    deleteFileOp,
    createDirectoryOp,
    moveFileOp,
    listDirectoryOp,
} from "../../slices/fs/ops.js";

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
            try {
                structuredUpdate = JSON.parse(content);
            } catch (e) {
                // Not valid JSON, treat as raw text
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
    // TOOL: arela_test_generate
    // ===========================================
    server.registerTool(
        "arela_test_generate",
        {
            title: "Generate Tests from PRD",
            description: "Generate Gherkin features and TypeScript step definitions from a PRD.",
            inputSchema: {
                prdPath: z.string().describe("Path to the PRD file"),
            },
        },
        async ({ prdPath }) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            try {
                const result = await test.generateTests(projectPath, prdPath);
                return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
            } catch (e: any) {
                return { content: [{ type: "text" as const, text: `❌ Test Generation Failed: ${e.message}` }] };
            }
        }
    );

    // ===========================================
    // TOOL: arela_test_run
    // ===========================================
    server.registerTool(
        "arela_test_run",
        {
            title: "Run Generated Test",
            description: "Execute a generated Gherkin feature file using Cucumber/Playwright.",
            inputSchema: {
                featurePath: z.string().describe("Path to the .feature file"),
            },
        },
        async ({ featurePath }) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            try {
                const result = await test.runTest(projectPath, featurePath);
                return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
            } catch (e: any) {
                return { content: [{ type: "text" as const, text: `❌ Test Run Failed: ${e.message}` }] };
            }
        }
    );

    // ===========================================
    // TOOL: arela_enforce (Anti-Fragility)
    // ===========================================
    server.registerTool(
        "arela_enforce",
        {
            title: "Create Regression Guard",
            description: "Generate and install a regression prevention script (Anti-Fragility).",
            inputSchema: {
                issue: z.string().describe("Description of the failure/bug (e.g. 'We forgot README')"),
                solution: z.string().describe("Strategy to prevent it (e.g. 'Script to check all dirs')"),
            },
        },
        async ({ issue, solution }) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            try {
                const result = await enforce.generateGuard(projectPath, issue, solution);
                return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
            } catch (e: any) {
                return { content: [{ type: "text" as const, text: `❌ Enforce Failed: ${e.message}` }] };
            }
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

    // ===========================================
    // TOOL: arela_prd
    // ===========================================
    server.registerTool(
        "arela_prd",
        {
            title: "Arela PRD Manager",
            description:
                "Manage Product Requirement Documents (PRDs). PRDs are the 'source code' of your application - " +
                "structured Markdown files with YAML frontmatter that define features, user stories, and specs. " +
                "Use this to list, parse, create, and track PRD status.",
            inputSchema: {
                action: z.enum(["list", "parse", "status", "create", "stories", "update-status"])
                    .describe("Action to perform"),
                path: z.string().optional()
                    .describe("Path to PRD file (required for parse, status, stories, update-status)"),
                id: z.string().optional()
                    .describe("PRD ID for create action (e.g., REQ-001)"),
                title: z.string().optional()
                    .describe("PRD title for create action"),
                type: PRDTypeSchema.optional()
                    .describe("PRD type for create action"),
                outputPath: z.string().optional()
                    .describe("Output path for create action"),
                newStatus: PRDStatusSchema.optional()
                    .describe("New status for update-status action"),
            },
        },
        async ({ action, path: prdPath, id, title, type, outputPath, newStatus }) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;

            try {
                switch (action) {
                    case "list": {
                        const prds = await listPRDs();
                        if (prds.length === 0) {
                            return { content: [{ type: "text" as const, text: "📋 No PRDs found.\n\nCreate one with `arela_prd create`" }] };
                        }
                        const list = prds.map(p =>
                            `- **${p.id}**: ${p.title} [${p.status}] (${p.type}) - ${p.path}`
                        ).join("\n");
                        return { content: [{ type: "text" as const, text: `📋 **PRDs Found:**\n\n${list}` }] };
                    }

                    case "parse": {
                        if (!prdPath) {
                            return { content: [{ type: "text" as const, text: "❌ Path required for parse action" }] };
                        }
                        const prd = await getPRD(prdPath);
                        const sections = prd.sections.map(s => `- ${s.header} (L${s.lineStart}-${s.lineEnd})`).join("\n");
                        const text =
                            `📄 **PRD: ${prd.title}**\n\n` +
                            `**ID:** ${prd.frontmatter.id}\n` +
                            `**Type:** ${prd.frontmatter.type}\n` +
                            `**Status:** ${prd.frontmatter.status}\n` +
                            `**Priority:** ${prd.frontmatter.priority}\n` +
                            `**Context:** ${prd.frontmatter.context.join(", ") || "None"}\n` +
                            `**Tools:** ${prd.frontmatter.tools.join(", ") || "None"}\n\n` +
                            `**Sections:**\n${sections}`;
                        return { content: [{ type: "text" as const, text }] };
                    }

                    case "status": {
                        if (!prdPath) {
                            return { content: [{ type: "text" as const, text: "❌ Path required for status action" }] };
                        }
                        const status = await getPRDStatus(prdPath);
                        const text =
                            `📊 **PRD Status: ${status.id}**\n\n` +
                            `**Status:** ${status.status}\n` +
                            `**Type:** ${status.type}\n` +
                            `**Priority:** ${status.priority}\n` +
                            `**User Stories:** ${status.userStoryCount}\n` +
                            `**Sections:** ${status.sections.join(", ")}`;
                        return { content: [{ type: "text" as const, text }] };
                    }

                    case "create": {
                        if (!id || !title) {
                            return { content: [{ type: "text" as const, text: "❌ ID and title required for create action" }] };
                        }
                        const result = await createPRD({
                            id,
                            title,
                            type: type || "feature",
                            outputPath
                        });
                        return { content: [{ type: "text" as const, text: `✅ ${result}` }] };
                    }

                    case "stories": {
                        if (!prdPath) {
                            return { content: [{ type: "text" as const, text: "❌ Path required for stories action" }] };
                        }
                        const stories = await getUserStories(prdPath);
                        if (stories.length === 0) {
                            return { content: [{ type: "text" as const, text: "📖 No user stories found in PRD" }] };
                        }
                        const storyList = stories.map(s =>
                            `### ${s.id}: ${s.title}\n` +
                            `**As a** ${s.asA}\n` +
                            `**I want** ${s.iWant}\n` +
                            `**So that** ${s.soThat}\n` +
                            `**Criteria:** ${s.acceptanceCriteria.length} items`
                        ).join("\n\n");
                        return { content: [{ type: "text" as const, text: `📖 **User Stories:**\n\n${storyList}` }] };
                    }

                    case "update-status": {
                        if (!prdPath || !newStatus) {
                            return { content: [{ type: "text" as const, text: "❌ Path and newStatus required for update-status action" }] };
                        }
                        const result = await updatePRDStatus(prdPath, newStatus);
                        return { content: [{ type: "text" as const, text: `✅ ${result}` }] };
                    }

                    default:
                        return { content: [{ type: "text" as const, text: `❌ Unknown action: ${action}` }] };
                }
            } catch (e: any) {
                return { content: [{ type: "text" as const, text: `❌ PRD operation failed: ${e.message}` }] };
            }
        }
    );

    // ===========================================
    // TOOL: arela_log_symptom (Session Guard)
    // ===========================================
    server.registerTool(
        "arela_log_symptom",
        {
            title: "Log Investigation Symptom",
            description:
                "Log an error or issue you're investigating. This starts the investigation process " +
                "and transitions from DISCOVERY to ANALYSIS state. Required before you can fix code.",
            inputSchema: {
                error_message: z.string().min(5, "Provide the error message"),
                context: z.string().optional().describe("Additional context about when/where the error occurred"),
                reproduction_steps: z.array(z.string()).optional().describe("Steps to reproduce"),
            },
        },
        async (input) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;

            const result = await logSymptomOp(input);
            return { content: [{ type: "text" as const, text: result }] };
        }
    );

    // ===========================================
    // TOOL: arela_register_hypothesis (Session Guard)
    // ===========================================
    server.registerTool(
        "arela_register_hypothesis",
        {
            title: "Register Investigation Hypothesis",
            description:
                "Submit a hypothesis about the root cause of the issue. " +
                "Requires evidence (files you've read) and reasoning. " +
                "Transitions from ANALYSIS to VERIFICATION state.",
            inputSchema: {
                symptom_summary: z.string().min(10, "Summarize the symptom"),
                suspected_root_cause: z.string().min(30, "Explain the root cause (10+ words)"),
                evidence_files: z.array(z.string()).min(1, "List files that support your hypothesis"),
                reasoning_chain: z.string().min(100, "Provide step-by-step reasoning (20+ words)"),
                confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
                verification_plan: z.string().min(20, "How will you test this before fixing?"),
            },
        },
        async (input) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;

            const result = await registerHypothesisOp(input);
            return { content: [{ type: "text" as const, text: result }] };
        }
    );

    // ===========================================
    // TOOL: arela_confirm_hypothesis (Session Guard)
    // ===========================================
    server.registerTool(
        "arela_confirm_hypothesis",
        {
            title: "Confirm Hypothesis",
            description:
                "Confirm your hypothesis after verification. " +
                "This grants WRITE ACCESS so you can fix the code. " +
                "Transitions from VERIFICATION to IMPLEMENTATION state.",
            inputSchema: {
                verification_result: z.string().min(10, "Describe what test confirmed your hypothesis"),
            },
        },
        async (input) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;

            const result = await confirmHypothesisOp(input);
            return { content: [{ type: "text" as const, text: result }] };
        }
    );

    // ===========================================
    // TOOL: arela_reject_hypothesis (Session Guard)
    // ===========================================
    server.registerTool(
        "arela_reject_hypothesis",
        {
            title: "Reject Hypothesis",
            description:
                "Reject your hypothesis if verification disproved it. " +
                "This returns you to ANALYSIS state to form a new hypothesis. " +
                "After 3 failed hypotheses, you'll need to escalate to human.",
            inputSchema: {
                rejection_reason: z.string().min(10, "Explain why the hypothesis was disproven"),
            },
        },
        async (input) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;

            const result = await rejectHypothesisOp(input);
            return { content: [{ type: "text" as const, text: result }] };
        }
    );

    // ===========================================
    // TOOL: arela_escalate (Session Guard)
    // ===========================================
    server.registerTool(
        "arela_escalate",
        {
            title: "Escalate to Human",
            description:
                "Request human assistance when you're stuck. " +
                "This documents your investigation attempts and resets the session. " +
                "Required after 3 failed hypotheses.",
            inputSchema: {
                summary: z.string().min(20, "Summarize what you need help with"),
                attempts_made: z.array(z.string()).min(1, "List what you tried"),
            },
        },
        async (input) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;

            const result = await escalateOp(input);
            return { content: [{ type: "text" as const, text: result }] };
        }
    );

    // ===========================================
    // TOOL: arela_guard_status (Session Guard)
    // ===========================================
    server.registerTool(
        "arela_guard_status",
        {
            title: "Check Investigation Status",
            description:
                "Check the current investigation state and whether write access is granted. " +
                "Use this to understand where you are in the investigation process.",
            inputSchema: {},
        },
        async () => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;

            const result = await guardStatusOp();
            return { content: [{ type: "text" as const, text: result }] };
        }
    );

    // ===========================================
    // GUARDED FILESYSTEM TOOLS (NEW)
    // ===========================================

    // TOOL: edit_file (Guarded)
    server.registerTool(
        "edit_file",
        {
            title: "Edit File (Guarded)",
            description: "Apply edits to a file. BLOCKED unless investigation hypothesis is confirmed.",
            inputSchema: {
                path: z.string(),
                edits: z.array(z.object({
                    oldText: z.string(),
                    newText: z.string(),
                })),
                dryRun: z.boolean().optional(),
            },
        },
        async (input) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;

            try {
                const result = await editFileOp(input);
                return { content: [{ type: "text" as const, text: result }] };
            } catch (e: any) {
                return { content: [{ type: "text" as const, text: `❌ ${e.message}` }], isError: true };
            }
        }
    );

    // TOOL: write_file (Guarded)
    server.registerTool(
        "write_file",
        {
            title: "Write File (Guarded)",
            description: "Create or overwrite a file. BLOCKED unless investigation hypothesis is confirmed.",
            inputSchema: {
                path: z.string(),
                content: z.string(),
            },
        },
        async (input) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            try {
                const result = await writeFileOp(input.path, input.content);
                return { content: [{ type: "text" as const, text: result }] };
            } catch (e: any) {
                return { content: [{ type: "text" as const, text: `❌ ${e.message}` }], isError: true };
            }
        }
    );

    // TOOL: read_file (Unguarded but Tracked)
    server.registerTool(
        "read_file",
        {
            title: "Read File (Tracked)",
            description: "Read file content. Tracks usage for 'Evidence' in investigation.",
            inputSchema: {
                path: z.string(),
            },
        },
        async (input) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            try {
                const result = await readFileOp(input.path);
                return { content: [{ type: "text" as const, text: result }] };
            } catch (e: any) {
                return { content: [{ type: "text" as const, text: `❌ ${e.message}` }], isError: true };
            }
        }
    );

    // TOOL: list_directory
    server.registerTool(
        "list_directory",
        {
            title: "List Directory",
            description: "List files and directories.",
            inputSchema: {
                path: z.string(),
            },
        },
        async (input) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            try {
                const result = await listDirectoryOp(input.path);
                return { content: [{ type: "text" as const, text: result.join('\n') }] };
            } catch (e: any) {
                return { content: [{ type: "text" as const, text: `❌ ${e.message}` }], isError: true };
            }
        }
    );

    // TOOL: create_directory (Guarded)
    server.registerTool(
        "create_directory",
        {
            title: "Create Directory (Guarded)",
            description: "Create a new directory tree. BLOCKED unless hypothesis confirmed.",
            inputSchema: {
                path: z.string(),
            },
        },
        async (input) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            try {
                const result = await createDirectoryOp(input.path);
                return { content: [{ type: "text" as const, text: result }] };
            } catch (e: any) {
                return { content: [{ type: "text" as const, text: `❌ ${e.message}` }], isError: true };
            }
        }
    );

    // TOOL: delete_file (Guarded)
    server.registerTool(
        "delete_file",
        {
            title: "Delete File (Guarded)",
            description: "Delete a file. BLOCKED unless hypothesis confirmed.",
            inputSchema: {
                path: z.string(),
            },
        },
        async (input) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            try {
                const result = await deleteFileOp(input.path);
                return { content: [{ type: "text" as const, text: result }] };
            } catch (e: any) {
                return { content: [{ type: "text" as const, text: `❌ ${e.message}` }], isError: true };
            }
        }
    );

    // TOOL: move_file (Guarded)
    server.registerTool(
        "move_file",
        {
            title: "Move File (Guarded)",
            description: "Move or rename a file. BLOCKED unless hypothesis confirmed.",
            inputSchema: {
                source: z.string(),
                destination: z.string(),
            },
        },
        async (input) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            try {
                const result = await moveFileOp(input.source, input.destination);
                return { content: [{ type: "text" as const, text: result }] };
            } catch (e: any) {
                return { content: [{ type: "text" as const, text: `❌ ${e.message}` }], isError: true };
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
