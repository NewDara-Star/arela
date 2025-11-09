import type { Agent, DiscoveryResult } from "../types.js";
import { discoverOllama } from "./ollama.js";
import { discoverCloudAgents } from "./cloud.js";
import { discoverIDEAgents } from "./ide.js";

export async function discoverAllAgents(cwd: string): Promise<DiscoveryResult> {
  const errors: string[] = [];
  const agents: Agent[] = [];

  try {
    const ollama = await discoverOllama();
    agents.push(...ollama);
  } catch (error) {
    errors.push(`Ollama discovery failed: ${(error as Error).message}`);
  }

  try {
    const cloud = discoverCloudAgents();
    agents.push(...cloud);
  } catch (error) {
    errors.push(`Cloud discovery failed: ${(error as Error).message}`);
  }

  try {
    const ide = await discoverIDEAgents(cwd);
    agents.push(...ide);
  } catch (error) {
    errors.push(`IDE discovery failed: ${(error as Error).message}`);
  }

  return { agents, errors };
}

export { discoverOllama, discoverCloudAgents, discoverIDEAgents };
