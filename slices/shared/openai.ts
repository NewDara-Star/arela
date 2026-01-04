/**
 * Shared OpenAI Client
 */
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "node:path";

export function getOpenAIClient(projectPath: string): OpenAI {
    // Aggressively silence stdout for dotenv
    const originalWrite = process.stdout.write;
    process.stdout.write = () => true; // No-op
    try {
        const result = dotenv.config({ path: path.join(projectPath, ".env"), debug: false });
        if (result.error && typeof (process.stdin) === 'undefined') {
            // silently fail if no env, or log to stderr
        }
    } finally {
        process.stdout.write = originalWrite;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY in .env file.");
    }

    return new OpenAI({ apiKey });
}

export const SMART_MODEL = "gpt-4o-mini";

export async function askOpenAI(system: string, user: string, projectPath: string = process.cwd()): Promise<string> {
    const openai = getOpenAIClient(projectPath);
    const completion = await openai.chat.completions.create({
        model: SMART_MODEL,
        messages: [
            { role: "system", content: system },
            { role: "user", content: user }
        ]
    });
    return completion.choices[0].message.content || "";
}
