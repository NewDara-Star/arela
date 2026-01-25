import { ToolDef } from "./types.js";
import { z } from "zod";
import { startAutoIndexer, buildVectorIndex, searchVectorIndex } from "../../../slices/vector/ops.js";
import { analyzeImpact, refreshGraph } from "../../../slices/graph/gatekeeper.js";
import {
    logSymptomOp, registerHypothesisOp, confirmHypothesisOp, rejectHypothesisOp,
    escalateOp, guardStatusOp, checkWriteAccessOp, trackFileReadOp
} from "../../../slices/guard/ops.js";
import { HypothesisSchema, SymptomSchema } from "../../../slices/guard/types.js";
import {
    editFileOp, writeFileOp, readFileOp, deleteFileOp, createDirectoryOp,
    moveFileOp, listDirectoryOp
} from "../../../slices/fs/ops.js";


export const miscTools: ToolDef[] = [
    // --- VECTOR TOOLS ---
    {
        name: "arela_vector_search",
        title: "Semantic Code Search",
        description: "Find code by meaning/concept.",
        schema: { query: z.string(), limit: z.number().optional() },
        handler: async ({ query, limit }, { projectPath }) => {
            const results = await searchVectorIndex(projectPath, query, limit);
            if (results.length === 0) return { content: [{ type: "text", text: "No results." }] };
            const text = results.map(r => `📄 **${r.file}** (${r.score.toFixed(2)})\n${r.chunk}`).join("\n---\n");
            return { content: [{ type: "text", text: `🔍 Semantic Results:\n\n${text}` }] };
        }
    },
    {
        name: "arela_vector_index",
        title: "Index Codebase",
        description: "Rebuild vector index.",
        schema: {},
        handler: async (_, { projectPath }) => {
            const count = await buildVectorIndex(projectPath);
            return { content: [{ type: "text", text: `✅ Indexed ${count} chunks.` }] };
        }
    },

    // --- GRAPH TOOLS ---
    {
        name: "arela_graph_refresh",
        title: "Refresh Graph",
        description: "Rebuild dependency graph.",
        schema: {},
        handler: async (_, { projectPath }) => {
            const count = await refreshGraph(projectPath);
            return { content: [{ type: "text", text: `✅ Graph refreshed. ${count} files.` }] };
        }
    },
    {
        name: "arela_graph_impact",
        title: "Impact Analysis",
        description: "Check dependencies.",
        schema: { path: z.string() },
        handler: async ({ path: p }, { projectPath }) => {
            const a = await analyzeImpact(projectPath, p);
            return { content: [{ type: "text", text: JSON.stringify(a, null, 2) }] };
        }
    },

    // --- GUARD TOOLS ---
    {
        name: "log_symptom", title: "Log Symptom", description: "Log a symptom.", schema: SymptomSchema.shape,
        handler: async (args) => logSymptomOp(args)
    },
    {
        name: "register_hypothesis", title: "Register Hypothesis", description: "Register hypothesis.", schema: HypothesisSchema.shape,
        handler: async (args) => registerHypothesisOp(args)
    },
    {
        name: "confirm_hypothesis", title: "Confirm Hypothesis", description: "Confirm working hypothesis.", schema: { id: z.string() },
        handler: async (args) => confirmHypothesisOp(args)
    },
    {
        name: "reject_hypothesis", title: "Reject Hypothesis", description: "Reject incorrect hypothesis.", schema: { id: z.string(), reason: z.string() },
        handler: async (args) => rejectHypothesisOp(args)
    },
    {
        name: "guard_status", title: "Guard Status", description: "Check current investigation state.", schema: {},
        handler: async () => guardStatusOp()
    },
    {
        name: "escalate",
        title: "Escalate Issue",
        description: "Escalate to user or high-level reasoning.",
        schema: {
            summary: z.string().min(10, "Provide a brief summary"),
            attempts_made: z.array(z.string()).min(1, "List attempts made")
        },
        handler: async (args) => escalateOp(args)
    },

    // --- FS TOOLS ---
    {
        name: "read_file", title: "Read File", description: "Read file from filesystem.", schema: { path: z.string() },
        handler: async (args, { requireSession }) => {
            // Note: Reading is generally allowed without session? 
            // Original server allowed it? No, "block ALL tools".
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            return { content: [{ type: "text", text: await readFileOp(args.path) }] };
        }
    },
    {
        name: "write_file", title: "Write File", description: "Write file to filesystem.",
        schema: { path: z.string(), content: z.string() },
        handler: async (args, { requireSession }) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            return { content: [{ type: "text", text: await writeFileOp(args.path, args.content) }] };
        }
    },
    {
        name: "edit_file", title: "Edit File", description: "Edit file content.",
        schema: { path: z.string(), edits: z.array(z.any()), dryRun: z.boolean().optional() },
        handler: async (args, { requireSession }) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            return { content: [{ type: "text", text: await editFileOp(args) }] };
        }
    },
    {
        name: "list_dir", title: "List Directory", description: "List directory contents.",
        schema: { path: z.string() },
        handler: async (args, { requireSession }) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            const files = await listDirectoryOp(args.path);
            return { content: [{ type: "text", text: files.join("\n") }] };
        }
    },
    {
        name: "delete_file", title: "Delete File", description: "Delete a file.",
        schema: { path: z.string() },
        handler: async (args, { requireSession }) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            return { content: [{ type: "text", text: await deleteFileOp(args.path) }] };
        }
    },
    {
        name: "create_dir", title: "Create Directory", description: "Create a directory.",
        schema: { path: z.string() },
        handler: async (args, { requireSession }) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            return { content: [{ type: "text", text: await createDirectoryOp(args.path) }] };
        }
    },
    {
        name: "move_file", title: "Move File", description: "Move/Rename a file.",
        schema: { from: z.string(), to: z.string() },
        handler: async (args, { requireSession }) => {
            const guard = requireSession();
            if (guard.blocked) return guard.error!;
            return { content: [{ type: "text", text: await moveFileOp(args.from, args.to) }] };
        }
    }
];
