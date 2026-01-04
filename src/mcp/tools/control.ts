import { ToolDef } from "./types.js";
import { z } from "zod";
import fs from "fs-extra";
import path from "node:path";
import { mergeUpdates, StructuredUpdate } from "../../../slices/memory/logic.js";
import { summarizeScratchpad } from "../../../slices/focus/ops.js";

export const controlTools: ToolDef[] = [
    {
        name: "arela_context",
        title: "Arela Project Context",
        description:
            "Get the current project context including AGENTS.md (project rules) and SCRATCHPAD.md (session memory). " +
            "Call this at the START of every session to understand the project state.",
        schema: {},
        handler: async (args, { projectPath }) => {
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

            // Note: We can't update sessionInitialized here easily without callback or ref scope. 
            // For now, let server handle init logic or just check existence.

            return { content: [{ type: "text", text: contextText }] };
        }
    },
    {
        name: "arela_update",
        title: "Update Arela Scratchpad",
        description:
            "Update the SCRATCHPAD.md file with current session progress. " +
            "Call this at the END of a work session to persist memory for the next session.",
        schema: {
            content: z.string().min(10, "Provide meaningful content to save"),
            mode: z.enum(["replace", "append"]).optional().describe("Replace or append (default: append)"),
        },
        handler: async ({ content, mode }, { projectPath, requireSession }) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;

            const scratchpadPath = path.join(projectPath, "SCRATCHPAD.md");
            const timestamp = new Date().toISOString();

            let finalContent: string;
            let structuredUpdate: StructuredUpdate | null = null;
            try {
                structuredUpdate = JSON.parse(content);
            } catch (e) { }

            if (mode !== "replace" && await fs.pathExists(scratchpadPath)) {
                const existing = await fs.readFile(scratchpadPath, "utf-8");
                if (structuredUpdate) {
                    finalContent = mergeUpdates(existing, structuredUpdate);
                } else {
                    finalContent = `${existing}\n\n---\n\n## Update: ${timestamp}\n\n${content}`;
                }
            } else {
                finalContent = `# SCRATCHPAD.md\n\n**Last Updated:** ${timestamp}\n\n${content}`;
            }

            await fs.writeFile(scratchpadPath, finalContent, "utf-8");
            return { content: [{ type: "text", text: `✅ Scratchpad updated at ${scratchpadPath}` }] };
        }
    },
    {
        name: "arela_status",
        title: "Arela Project Status",
        description: "Get a quick status overview of the project.",
        schema: {},
        handler: async (args, { projectPath }) => {
            const hasAgents = await fs.pathExists(path.join(projectPath, "AGENTS.md"));
            const hasScratchpad = await fs.pathExists(path.join(projectPath, "SCRATCHPAD.md"));
            const hasMemory = await fs.pathExists(path.join(projectPath, ".arela"));

            let statusText = `📊 Project Status: ${projectPath}\n\n`;
            statusText += `AGENTS.md: ${hasAgents ? "✅ Present" : "❌ Missing"}\n`;
            statusText += `SCRATCHPAD.md: ${hasScratchpad ? "✅ Present" : "❌ Missing"}\n`;
            statusText += `Memory System: ${hasMemory ? "✅ Initialized" : "⚪ Not initialized"}\n`;

            return { content: [{ type: "text", text: statusText }] };
        }
    },
    {
        name: "arela_focus",
        title: "Focus Context (Summarize)",
        description: "Summarize the SCRATCHPAD.md using OpenAI gpt-4o-mini to save context window space.",
        schema: {
            dryRun: z.boolean().optional().describe("If true, returns summary without saving"),
        },
        handler: async ({ dryRun }, { projectPath }) => {
            try {
                const result = await summarizeScratchpad(projectPath, dryRun);
                return { content: [{ type: "text", text: result }] };
            } catch (e: any) {
                return { content: [{ type: "text", text: `❌ Focus failed: ${e.message}` }] };
            }
        }
    }
];
