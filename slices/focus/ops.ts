/**
 * Focus Slice - Summarization Logic
 */
import fs from "fs-extra";
import path from "node:path";
import { getOpenAIClient, SMART_MODEL } from "../shared/openai.js";

const MAX_LINES_RAW = 500;
const RETAIN_LINES = 200;

export async function summarizeScratchpad(projectPath: string, dryRun = false): Promise<string> {
    const scratchpadPath = path.join(projectPath, "SCRATCHPAD.md");
    if (!await fs.pathExists(scratchpadPath)) {
        return "No SCRATCHPAD.md found.";
    }

    const content = await fs.readFile(scratchpadPath, "utf-8");
    const lines = content.split("\n");

    // If short enough, do nothing
    if (lines.length < MAX_LINES_RAW) {
        return `✅ Scratchpad is short (${lines.length} lines). No summarization needed.`;
    }

    // Split into "History to Summarize" and "Recent Context to Keep"
    const splitPoint = lines.length - RETAIN_LINES;
    const historyLines = lines.slice(0, splitPoint);
    const recentLines = lines.slice(splitPoint);

    const historyText = historyLines.join("\n");
    const recentText = recentLines.join("\n");

    const client = getOpenAIClient(projectPath);

    console.error("🧠 Summarizing history with OpenAI gpt-4o-mini...");

    const response = await client.chat.completions.create({
        model: SMART_MODEL,
        messages: [
            {
                role: "system",
                content: "You are the memory manager for an AI project. Summarize the history into a concise, high-level summary. Focus on KEY DECISIONS, ARCHITECTURAL CHANGES, and COMPLETED FEATURES."
            },
            {
                role: "user",
                content: `HISTORY TO SUMMARIZE:\n${historyText}`
            }
        ]
    });

    const summary = response.choices[0].message.content || "";

    const newContent = `# SCRATCHPAD.md (Context Rolled)

## 🧠 Previous History (Summarized)
${summary}

---

## 📝 Recent Logs
${recentText}
`;

    if (dryRun) {
        return `🔍 **Dry Run Summary:**\n\n${summary}\n\n(File not updated)`;
    }

    await fs.writeFile(scratchpadPath, newContent, "utf-8");
    return `✅ Context Rolled! compressed ${lines.length} lines -> ${newContent.split("\n").length} lines.`;
}
