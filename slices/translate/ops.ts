/**
 * Translation Slice - Vibecoding Logic
 * Transforms "User Vibe" -> "Execution Plan"
 */
import { getOpenAIClient, SMART_MODEL } from "../shared/openai.js";

export interface TranslationPlan {
    summary: string;
    filesToCreate: string[];
    filesToEdit: string[];
    relevantContext: string[];
    steps: string[];
}

export async function translateVibeToPlan(projectPath: string, vibe: string): Promise<TranslationPlan> {
    const client = getOpenAIClient(projectPath);

    console.error("🌊 Translating vibe with OpenAI gpt-4o-mini...");

    const response = await client.chat.completions.create({
        model: SMART_MODEL,
        messages: [
            {
                role: "system",
                content: `You are a Senior Software Architect. Your job is to translate a "Vibe" (high-level user intent) into a concrete "Execution Plan".
                
                RETURN JSON ONLY. Format:
                {
                    "summary": "Brief explanation of what will be built",
                    "filesToCreate": ["path/to/new/file.ts"],
                    "filesToEdit": ["path/to/existing/file.ts"],
                    "relevantContext": ["Concepts or files to check first"],
                    "steps": ["Step 1", "Step 2"]
                }`
            },
            {
                role: "user",
                content: `Here is the vibe/request: "${vibe}"`
            }
        ],
        response_format: { type: "json_object" }
    });

    try {
        const text = response.choices[0].message.content || "{}";
        return JSON.parse(text) as TranslationPlan;
    } catch (e) {
        throw new Error("Failed to parse AI plan. Raw response: " + (response.choices[0].message.content));
    }
}
