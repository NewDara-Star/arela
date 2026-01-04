import { ToolDef } from "./types.js";
import { z } from "zod";
import * as test from "../../../slices/test/ops.js";
import * as enforce from "../../../slices/enforce/ops.js";
import { verifyClaim } from "../../../slices/verification/gatekeeper.js";
import { listPRDs, getPRD, getPRDStatus, createPRD, getUserStories, updatePRDStatus } from "../../../slices/prd/ops.js";
import { PRDTypeSchema, PRDStatusSchema } from "../../../slices/prd/types.js";

export const integrationTools: ToolDef[] = [
    // PRD Tools here... (Simplified for brevity of extraction, assuming full impl similar to server.ts)
    // Actually, I should probably copy the logic.
    {
        name: "arela_test_generate",
        title: "Generate Tests from PRD",
        description: "Generate Gherkin features and TypeScript step definitions from a PRD.",
        schema: { prdPath: z.string().describe("Path to the PRD file") },
        handler: async ({ prdPath }, { projectPath, requireSession }) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            try {
                const result = await test.generateTests(projectPath, prdPath);
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            } catch (e: any) {
                return { content: [{ type: "text", text: `❌ Test Generation Failed: ${e.message}` }] };
            }
        }
    },
    {
        name: "arela_test_run",
        title: "Run Generated Test",
        description: "Execute a generated Gherkin feature file using Cucumber/Playwright.",
        schema: { featurePath: z.string().describe("Path to the .feature file") },
        handler: async ({ featurePath }, { projectPath, requireSession }) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            try {
                const result = await test.runTest(projectPath, featurePath);
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            } catch (e: any) {
                return { content: [{ type: "text", text: `❌ Test Run Failed: ${e.message}` }] };
            }
        }
    },
    {
        name: "arela_enforce",
        title: "Create Regression Guard",
        description: "Generate and install a regression prevention script (Anti-Fragility).",
        schema: {
            issue: z.string().describe("Description of the failure/bug (e.g. 'We forgot README')"),
            solution: z.string().describe("Strategy to prevent it (e.g. 'Script to check all dirs')"),
        },
        handler: async ({ issue, solution }, { projectPath, requireSession }) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            try {
                const result = await enforce.generateGuard(projectPath, issue, solution);
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            } catch (e: any) {
                return { content: [{ type: "text", text: `❌ Enforce Failed: ${e.message}` }] };
            }
        }
    },
    {
        name: "arela_verify",
        title: "Arela Verify Fact",
        description: "Verify a claim about a file to prevent hallucination.",
        schema: {
            claim: z.string().describe("Human readable claim (e.g. 'File has useState')"),
            path: z.string().describe("Relative path to the file"),
            type: z.enum(["contains", "regex", "file_exists"]).describe("Verification method"),
            pattern: z.string().optional().describe("String or regex pattern to look for"),
        },
        handler: async (args, { projectPath }) => {
            const result = await verifyClaim(projectPath, {
                claim: args.claim,
                path: args.path,
                type: args.type as any,
                pattern: args.pattern,
            });
            const emoji = result.verified ? "✅" : "❌";
            return {
                content: [{ type: "text", text: `${emoji} VERIFICATION RESULT: ${result.verified}\n\nReason: ${result.reason}` }]
            };
        }
    },
    // PRD Tool
    {
        name: "arela_prd",
        title: "Product Requirements (PRD) Manager",
        description: "Manage Product Requirement Documents (PRDs).",
        schema: {
            action: z.enum(["list", "parse", "status", "create", "stories", "update-status"]).describe("Action to perform"),
            path: z.string().optional().describe("Path to PRD file (required for parse, status, stories, update-status)"),
            id: z.string().optional().describe("PRD ID for create action (e.g., REQ-001)"),
            title: z.string().optional().describe("PRD title for create action"),
            type: PRDTypeSchema.optional().describe("PRD type for create action"),
            outputPath: z.string().optional().describe("Output path for create action"),
            newStatus: PRDStatusSchema.optional().describe("New status for update-status action"),
        },
        handler: async (args, { projectPath }) => {
            try {
                switch (args.action) {
                    case "list": {
                        const prds = await listPRDs();
                        return { content: [{ type: "text", text: JSON.stringify(prds, null, 2) }] };
                    }
                    case "status": {
                        if (!args.path) throw new Error("path required for status");
                        const status = await getPRDStatus(args.path);
                        return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
                    }
                    case "parse": {
                        if (!args.path) throw new Error("path required for parse");
                        const prd = await getPRD(args.path);
                        return { content: [{ type: "text", text: JSON.stringify(prd, null, 2) }] };
                    }
                    case "create": {
                        if (!args.id || !args.title || !args.type || !args.outputPath) {
                            throw new Error("id, title, type, and outputPath required for create");
                        }
                        await createPRD({
                            id: args.id, title: args.title, type: args.type,
                            status: "draft", author: "Arela", created: new Date(), last_updated: new Date()
                        }, args.outputPath);
                        return { content: [{ type: "text", text: `✅ Created PRD at ${args.outputPath}` }] };
                    }
                    case "stories": {
                        if (!args.path) throw new Error("path required for stories");
                        const stories = await getUserStories(args.path);
                        return { content: [{ type: "text", text: JSON.stringify(stories, null, 2) }] };
                    }
                    case "update-status": {
                        if (!args.path || !args.newStatus) throw new Error("path and newStatus required");
                        await updatePRDStatus(args.path, args.newStatus);
                        return { content: [{ type: "text", text: `✅ Updated status to ${args.newStatus}` }] };
                    }
                    default:
                        return { content: [{ type: "text", text: `Unknown action: ${args.action}` }] };
                }
            } catch (e: any) {
                return { content: [{ type: "text", text: `❌ PRD Operation Failed: ${e.message}` }] };
            }
        }
    }
];
