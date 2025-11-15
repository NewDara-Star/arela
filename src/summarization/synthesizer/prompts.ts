import type { SemanticContract } from "../extractor/types.js";

/**
 * Build prompt for LLM Synthesizer.
 *
 * Uses few-shot examples and requests strict JSON output that matches
 * the TechnicalSummary schema.
 */
export function buildSynthesizerPrompt(contract: SemanticContract): string {
  const contractJson = JSON.stringify(contract, null, 2);

  return `You are a senior technical documentation expert.

Your task:
- Read the Semantic Contract for a single code file
- Infer a concise, accurate technical summary
- Describe public API, I/O contracts, dependencies, side effects, and key algorithms
- Output ONLY valid JSON matching the schema below (no markdown, no comments)

INPUT (Semantic Contract as JSON):
${contractJson}

OUTPUT JSON SCHEMA (TypeScript style, for reference only):
{
  "mainResponsibility": "1-2 sentence description of what this file does",
  "publicAPI": ["list", "of", "exported", "functions/classes"],
  "ioContracts": [
    { "name": "functionName", "definition": "functionName(params): returnType" }
  ],
  "dependencies": "Summary of key dependencies",
  "sideEffects": "Summary of side effects (DB, network, file system, etc.)",
  "keyAlgorithms": "Notable algorithms or patterns (optional)"
}

EXAMPLES:

Example 1 - Utility File
Input: { "exports": [{ "name": "add", "kind": "function", "signature": { "params": [{ "name": "a", "type": "number" }, { "name": "b", "type": "number" }], "returnType": "number" } }] }
Output: {
  "mainResponsibility": "Provides basic arithmetic utility functions for addition operations.",
  "publicAPI": ["add"],
  "ioContracts": [{ "name": "add", "definition": "add(a: number, b: number): number" }],
  "dependencies": "None",
  "sideEffects": "None - pure functions",
  "keyAlgorithms": "Simple arithmetic"
}

Example 2 - API Handler
Input: { "exports": [{ "name": "createUser", "kind": "function", "signature": { "params": [{ "name": "req", "type": "Request" }, { "name": "res", "type": "Response" }], "returnType": "Promise<void>", "isAsync": true } }] }
Output: {
  "mainResponsibility": "Handles user creation API endpoint with validation and database persistence.",
  "publicAPI": ["createUser"],
  "ioContracts": [{ "name": "createUser", "definition": "createUser(req: Request, res: Response): Promise<void>" }],
  "dependencies": "Database (users table), validation library",
  "sideEffects": "Writes to database, sends HTTP response",
  "keyAlgorithms": "Input validation, password hashing"
}

Requirements:
- Think through the contract carefully before answering
- Be specific but concise (optimize for 5-10x token compression vs input)
- If information is missing, make conservative, reasonable assumptions
- Output ONLY a single JSON object matching the schema (no extra text)
`;
}

