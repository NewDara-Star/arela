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
