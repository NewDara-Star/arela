import { execa } from "execa";
import type { DiscoveredAgent } from "../types.js";

/**
 * Check if a command exists
 */
async function commandExists(command: string): Promise<boolean> {
  try {
    await execa("which", [command]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get version of a command
 */
async function getVersion(command: string, versionFlag = "--version"): Promise<string | undefined> {
  try {
    const { stdout } = await execa(command, [versionFlag]);
    return stdout.split("\n")[0].trim();
  } catch {
    return undefined;
  }
}

/**
 * Discover Ollama models
 */
async function discoverOllamaModels(): Promise<string[]> {
  try {
    const { stdout } = await execa("ollama", ["list"]);
    const lines = stdout.split("\n").slice(1); // Skip header
    return lines
      .filter((line) => line.trim())
      .map((line) => line.split(/\s+/)[0])
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Discover OpenAI CLI (Codex)
 */
async function discoverCodex(): Promise<DiscoveredAgent | null> {
  const available = await commandExists("codex");

  if (!available) {
    return null;
  }

  return {
    name: "OpenAI (Codex)",
    type: "cloud",
    command: "codex",
    available: true,
    version: await getVersion("codex"),
  };
}

/**
 * Discover Claude CLI (Anthropic)
 */
async function discoverClaude(): Promise<DiscoveredAgent | null> {
  const available = await commandExists("claude");

  if (!available) {
    return null;
  }

  return {
    name: "Claude (Anthropic)",
    type: "cloud",
    command: "claude",
    available: true,
    version: await getVersion("claude"),
  };
}

/**
 * Discover DeepSeek
 */
async function discoverDeepSeek(): Promise<DiscoveredAgent | null> {
  const available = await commandExists("deepseek");

  if (!available) {
    return null;
  }

  return {
    name: "DeepSeek",
    type: "cloud",
    command: "deepseek",
    available: true,
    version: await getVersion("deepseek"),
  };
}

/**
 * Discover Ollama (local models)
 */
async function discoverOllama(): Promise<DiscoveredAgent | null> {
  const available = await commandExists("ollama");

  if (!available) {
    return null;
  }

  const models = await discoverOllamaModels();

  return {
    name: "Ollama (Local Models)",
    type: "local",
    command: "ollama",
    available: true,
    version: await getVersion("ollama"),
  };
}

/**
 * Discover Windsurf (Cascade)
 */
async function discoverWindsurf(): Promise<DiscoveredAgent | null> {
  // Windsurf doesn't have a CLI, but we can check if it's the current IDE
  return {
    name: "Windsurf (Cascade)",
    type: "ide",
    command: "windsurf",
    available: true, // Assume available if Arela is being used
  };
}

/**
 * Discover all available agents
 */
export async function discoverAgents(): Promise<DiscoveredAgent[]> {
  const agents: (DiscoveredAgent | null)[] = await Promise.all([
    // Cloud APIs
    discoverCodex(),
    discoverClaude(),
    discoverDeepSeek(),

    // Local models
    discoverOllama(),

    // IDEs
    discoverWindsurf(),
  ]);

  return agents.filter((agent): agent is DiscoveredAgent => agent !== null);
}
