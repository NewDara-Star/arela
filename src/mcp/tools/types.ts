import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export type ToolContext = {
    server: McpServer;
    projectPath: string;
    requireSession: () => { blocked: boolean; error?: { content: { type: "text", text: string }[] } };
};

export interface ToolDef {
    name: string;
    title: string;
    description: string;
    schema: Record<string, z.ZodTypeAny>;
    handler: (args: any, context: ToolContext) => Promise<any>;
}

export function registerTools(context: ToolContext, tools: ToolDef[]) {
    tools.forEach(t => {
        context.server.registerTool(
            t.name,
            { title: t.title, description: t.description, inputSchema: t.schema },
            (args) => t.handler(args, context)
        );
    });
}
