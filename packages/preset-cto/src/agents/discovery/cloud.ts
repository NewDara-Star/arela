import type { Agent } from "../types.js";

export function discoverCloudAgents(): Agent[] {
  const agents: Agent[] = [];

  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    agents.push({
      id: "openai:gpt-4o",
      kind: "cloud",
      transport: "http",
      model: "gpt-4o",
      capabilities: [
        { name: "plan", strengths: ["architecture", "system-design"] },
        { name: "codegen", strengths: ["typescript", "python", "react", "nextjs"] },
        { name: "refactor", strengths: ["patterns", "clean-code"] },
        { name: "tests", strengths: ["vitest", "jest", "pytest"] },
        { name: "doc", strengths: ["technical-writing"] },
      ],
      costScore: 0.7,
      speedScore: 0.85,
      qualityScore: 0.9,
      tags: ["high-quality", "fast"],
    });

    agents.push({
      id: "openai:gpt-4o-mini",
      kind: "cloud",
      transport: "http",
      model: "gpt-4o-mini",
      capabilities: [
        { name: "plan", strengths: ["general"] },
        { name: "codegen", strengths: ["typescript", "python", "react"] },
        { name: "refactor", strengths: ["general"] },
        { name: "tests", strengths: ["vitest", "jest"] },
        { name: "doc", strengths: ["general"] },
      ],
      costScore: 0.3,
      speedScore: 0.9,
      qualityScore: 0.8,
      tags: ["cost-effective", "fast"],
    });
  }

  // Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    agents.push({
      id: "anthropic:claude-3-5-sonnet",
      kind: "cloud",
      transport: "http",
      model: "claude-3-5-sonnet-20241022",
      capabilities: [
        { name: "plan", strengths: ["architecture", "reasoning"] },
        { name: "codegen", strengths: ["typescript", "python", "react", "rust"] },
        { name: "refactor", strengths: ["patterns", "optimization"] },
        { name: "tests", strengths: ["comprehensive"] },
        { name: "doc", strengths: ["technical-writing", "clarity"] },
      ],
      costScore: 0.6,
      speedScore: 0.8,
      qualityScore: 0.95,
      tags: ["high-quality", "reasoning"],
    });

    agents.push({
      id: "anthropic:claude-3-5-haiku",
      kind: "cloud",
      transport: "http",
      model: "claude-3-5-haiku-20241022",
      capabilities: [
        { name: "plan", strengths: ["general"] },
        { name: "codegen", strengths: ["typescript", "python"] },
        { name: "refactor", strengths: ["general"] },
        { name: "tests", strengths: ["general"] },
        { name: "doc", strengths: ["general"] },
      ],
      costScore: 0.2,
      speedScore: 0.95,
      qualityScore: 0.75,
      tags: ["cost-effective", "very-fast"],
    });
  }

  return agents;
}
