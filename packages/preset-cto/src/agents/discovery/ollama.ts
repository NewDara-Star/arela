import type { Agent } from "../types.js";

export async function discoverOllama(): Promise<Agent[]> {
  const agents: Agent[] = [];

  try {
    const response = await fetch("http://localhost:11434/api/tags", {
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) return agents;

    const data = await response.json();
    const models = data.models || [];

    for (const model of models) {
      const modelName = model.name || "unknown";
      
      agents.push({
        id: `ollama:${modelName}`,
        kind: "local",
        transport: "http",
        endpoint: "http://localhost:11434",
        model: modelName,
        capabilities: [
          { name: "plan", strengths: ["general"] },
          { name: "codegen", strengths: ["general"] },
          { name: "refactor", strengths: ["general"] },
          { name: "doc", strengths: ["general"] },
        ],
        costScore: 0.1, // Free local
        speedScore: 0.6, // Depends on hardware
        qualityScore: 0.55, // Conservative default
        tags: ["offline", "privacy", "local"],
      });
    }
  } catch (error) {
    // Ollama not running or not installed
  }

  return agents;
}
