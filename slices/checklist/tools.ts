import { ToolDef } from "../../src/mcp/tools/types.js";
import { z } from "zod";
import { runChecklist } from "./ops.js";

export const checklistTools: ToolDef[] = [
    {
        name: "arela_checklist",
        title: "Run Enforcement Checklist",
        description: "Run the comprehensive 'Update Protocol' checklist (Guards, Docs, Tests, Hygiene). Call this before finishing a task.",
        schema: z.object({
            rigorous: z.boolean().optional().default(true).describe("Run rigorous checks (like executing all guards). Default: true")
        }) as any, // Cast to any because ToolDef expects Record<string, ZodTypeAny> but z.object returns ZodObject
        handler: async (args, { projectPath }) => {
            const report = await runChecklist(projectPath, { rigorous: args.rigorous });

            // Format as Markdown Table
            let md = `## Enforcement Checklist Report (${report.overallStatus.toUpperCase()})\n\n`;
            md += `**Summary:** ${report.summary}\n\n`;
            md += `| check | Status | Message |\n`;
            md += `| --- | --- | --- |\n`;

            for (const item of report.items) {
                const icon = item.status === "pass" ? "✅" : item.status === "fail" ? "❌" : "⚠️";
                md += `| **${item.description}** | ${icon} | ${item.message} ${item.details ? `(${item.details})` : ""} |\n`;
            }

            if (report.overallStatus === "fail") {
                md += `\n\n> [!CAUTION]\n> **Blocking Issues Found.** You cannot complete the task until these are fixed.`;
            }

            return {
                content: [{ type: "text", text: md }]
            };
        }
    }
];
