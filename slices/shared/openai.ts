/**
 * Shared OpenAI Client
 */
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "node:path";

export function getOpenAIClient(projectPath: string): OpenAI {
    dotenv.config({ path: path.join(projectPath, ".env") });

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
