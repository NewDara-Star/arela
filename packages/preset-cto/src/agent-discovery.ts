import { execa } from "execa";
import pc from "picocolors";
import { getCurrentContext, formatCurrentContext } from "./utils/current-context.js";

export interface DiscoveredAgent {
  name: string;
  type: "cli" | "local" | "api" | "ide";
  command: string;
  available: boolean;
  version?: string;
  models?: string[];
}

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
 * Discover OpenAI CLI
 */
async function discoverOpenAI(): Promise<DiscoveredAgent | null> {
  // Check for OpenAI CLI (codex command)
  const available = await commandExists("codex");
  
  if (!available) {
    return null;
  }
  
  const ctx = getCurrentContext();
  
  return {
    name: `OpenAI (Codex CLI) - ${ctx.year} ${ctx.quarter}`,
    type: "cli",
    command: "codex",
    available: true,
    version: await getVersion("codex"),
    models: [
      // GPT-5 family (2025 flagship)
      "gpt-5", "gpt-5-pro", "gpt-5-mini", "gpt-5-nano", "gpt-5-chat", "gpt-5-codex",
      
      // o-series (reasoning models)
      "o4-mini", "o3-mini", "o3-pro", "o1", "o1-preview", "o1-mini",
      
      // GPT-4o family (multimodal)
      "gpt-4o", "gpt-4o-2024-08-06", "gpt-4o-mini", "chatgpt-4o-latest",
      
      // GPT-4 Turbo & Legacy
      "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo",
    ],
  };
}

/**
 * Discover GitHub Copilot CLI (fallback)
 */
async function discoverGitHubCopilot(): Promise<DiscoveredAgent | null> {
  const available = await commandExists("github-copilot-cli");
  
  if (!available) {
    return null;
  }
  
  return {
    name: "GitHub Copilot CLI",
    type: "cli",
    command: "github-copilot-cli",
    available: true,
    version: await getVersion("github-copilot-cli"),
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
    type: "cli",
    command: "claude",
    available: true,
    version: await getVersion("claude"),
    models: [
      // Claude 4 family (2025)
      "claude-sonnet-4.5", "claude-sonnet-4", "claude-opus-4",
      
      // Claude 3.7 (hybrid reasoning)
      "claude-sonnet-3.7",
      
      // Claude 3.5
      "claude-sonnet-3.5", "claude-opus-3.5", "claude-haiku-3.5",
      
      // Claude 3
      "claude-3-opus", "claude-3-sonnet", "claude-3-haiku",
    ],
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
    type: "cli",
    command: "deepseek",
    available: true,
    version: await getVersion("deepseek"),
    models: [
      // DeepSeek V3 family (2025)
      "deepseek-v3.2", "deepseek-v3",
      
      // DeepSeek R1 (reasoning)
      "deepseek-r1",
      
      // DeepSeek Coder
      "deepseek-coder-v2", "deepseek-coder",
      
      // DeepSeek VL (vision-language)
      "deepseek-vl",
    ],
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
    models,
  };
}

/**
 * Discover Google Gemini
 */
async function discoverGemini(): Promise<DiscoveredAgent | null> {
  const available = await commandExists("gemini");
  
  if (!available) {
    return null;
  }
  
  return {
    name: "Google Gemini",
    type: "api",
    command: "gemini",
    available: true,
    version: await getVersion("gemini"),
    models: [
      // Gemini 2.5 (2025)
      "gemini-2.5-pro", "gemini-2.5-flash",
      
      // Gemini 2.0
      "gemini-2.0-flash", "gemini-2.0-flash-thinking",
      
      // Gemini 1.5
      "gemini-1.5-pro", "gemini-1.5-flash",
      
      // Specialized
      "gemini-robotics",
    ],
  };
}

/**
 * Discover Mistral AI
 */
async function discoverMistral(): Promise<DiscoveredAgent | null> {
  const available = await commandExists("mistral");
  
  if (!available) {
    return null;
  }
  
  return {
    name: "Mistral AI",
    type: "api",
    command: "mistral",
    available: true,
    version: await getVersion("mistral"),
    models: [
      // Mistral Large (2025)
      "mistral-large-3", "mistral-large-2.1",
      
      // Codestral (coding)
      "codestral-2508", "codestral-2501", "codestral-embed",
      
      // Pixtral (multimodal)
      "pixtral-large", "pixtral-12b",
      
      // Mistral Small
      "mistral-small",
    ],
  };
}

/**
 * Discover Cohere
 */
async function discoverCohere(): Promise<DiscoveredAgent | null> {
  const available = await commandExists("cohere");
  
  if (!available) {
    return null;
  }
  
  return {
    name: "Cohere",
    type: "api",
    command: "cohere",
    available: true,
    version: await getVersion("cohere"),
    models: [
      // Command family
      "command-r+", "command-r", "command-a",
      
      // Specialized
      "embed-v3", "rerank-3.5",
    ],
  };
}

/**
 * Discover xAI Grok
 */
async function discoverGrok(): Promise<DiscoveredAgent | null> {
  const available = await commandExists("grok");
  
  if (!available) {
    return null;
  }
  
  return {
    name: "xAI Grok",
    type: "api",
    command: "grok",
    available: true,
    version: await getVersion("grok"),
    models: [
      // Grok 3 (2025)
      "grok-3",
      
      // Grok 2.5 (open source)
      "grok-2.5",
      
      // Grok 2
      "grok-2",
    ],
  };
}

/**
 * Discover Meta Llama
 */
async function discoverLlama(): Promise<DiscoveredAgent | null> {
  const available = await commandExists("llama");
  
  if (!available) {
    return null;
  }
  
  return {
    name: "Meta Llama",
    type: "api",
    command: "llama",
    available: true,
    version: await getVersion("llama"),
    models: [
      // Llama 4 (2025)
      "llama-4-scout", "llama-4-maverick",
      
      // Llama 3.3
      "llama-3.3-70b",
      
      // Llama 3.1
      "llama-3.1-405b", "llama-3.1-70b", "llama-3.1-8b",
    ],
  };
}

/**
 * Discover Cursor
 */
async function discoverCursor(): Promise<DiscoveredAgent | null> {
  const available = await commandExists("cursor");
  
  if (!available) {
    return null;
  }
  
  return {
    name: "Cursor",
    type: "ide",
    command: "cursor",
    available: true,
  };
}

/**
 * Discover Windsurf (Cascade)
 */
async function discoverWindsurf(): Promise<DiscoveredAgent | null> {
  // Windsurf doesn't have a CLI, but we can check if it's the current IDE
  // For now, just mark as available if user is using it
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
    discoverOpenAI(),
    discoverGitHubCopilot(),
    discoverClaude(),
    discoverGemini(),
    discoverDeepSeek(),
    discoverMistral(),
    discoverCohere(),
    discoverGrok(),
    discoverLlama(),
    
    // Local models
    discoverOllama(),
    
    // IDEs
    discoverCursor(),
    discoverWindsurf(),
  ]);
  
  return agents.filter((agent): agent is DiscoveredAgent => agent !== null);
}

/**
 * Show discovered agents
 */
export async function showDiscoveredAgents(): Promise<void> {
  const ctx = getCurrentContext();
  
  console.log(pc.bold(pc.cyan("\n🔍 Discovering Available AI Agents...\n")));
  console.log(pc.gray(`${formatCurrentContext()}\n`));
  
  const agents = await discoverAgents();
  
  if (agents.length === 0) {
    console.log(pc.yellow("No AI agents found!"));
    console.log(pc.gray("\nInstall agents to use multi-agent orchestration:"));
    console.log(pc.gray("  • Ollama: https://ollama.com"));
    console.log(pc.gray("  • GitHub Copilot CLI: npm install -g @githubnext/github-copilot-cli"));
    console.log(pc.gray("  • Claude CLI: https://claude.ai"));
    return;
  }
  
  console.log(pc.bold("Available Agents:\n"));
  
  for (const agent of agents) {
    console.log(pc.bold(pc.green(`✓ ${agent.name}`)));
    console.log(pc.gray(`  Type: ${agent.type}`));
    console.log(pc.gray(`  Command: ${agent.command}`));
    
    if (agent.version) {
      console.log(pc.gray(`  Version: ${agent.version}`));
    }
    
    if (agent.models && agent.models.length > 0) {
      console.log(pc.gray(`  Models: ${agent.models.length} available`));
      for (const model of agent.models.slice(0, 5)) {
        console.log(pc.gray(`    • ${model}`));
      }
      if (agent.models.length > 5) {
        console.log(pc.gray(`    ... and ${agent.models.length - 5} more`));
      }
    }
    
    console.log("");
  }
  
  console.log(pc.bold(pc.cyan(`\nTotal: ${agents.length} agent(s) available\n`)));
}

/**
 * Generate agent config based on discovered agents
 */
export async function generateAgentConfig(): Promise<Record<string, any>> {
  const agents = await discoverAgents();
  const config: Record<string, any> = {};
  
  for (const agent of agents) {
    let key: string;
    let costPer1k = 0;
    
    if (agent.name.includes("OpenAI")) {
      key = "openai";
      costPer1k = 0.002; // Average, varies by model
    } else if (agent.name.includes("GitHub Copilot")) {
      key = "github-copilot";
      costPer1k = 0.002;
    } else if (agent.name.includes("Claude")) {
      key = "claude";
      costPer1k = 0.015;
    } else if (agent.name.includes("DeepSeek")) {
      key = "deepseek";
      costPer1k = 0.001;
    } else if (agent.name.includes("Ollama")) {
      key = "ollama";
      costPer1k = 0;
    } else if (agent.name.includes("Cursor")) {
      key = "cursor";
      costPer1k = 0;
    } else if (agent.name.includes("Windsurf")) {
      key = "cascade";
      costPer1k = 0;
    } else {
      continue;
    }
    
    config[key] = {
      name: agent.name,
      type: agent.type,
      command: agent.command,
      cost_per_1k_tokens: costPer1k,
      enabled: true,
      description: `${agent.name}${agent.version ? ` (${agent.version})` : ""}`,
    };
    
    if (agent.models) {
      config[key].models = agent.models;
    }
  }
  
  return config;
}

/**
 * Show recommended agents to install
 */
export async function showRecommendedAgents(): Promise<void> {
  const agents = await discoverAgents();
  const hasOpenAI = agents.some((a) => a.name.includes("OpenAI"));
  const hasGitHubCopilot = agents.some((a) => a.name.includes("GitHub Copilot"));
  const hasClaude = agents.some((a) => a.name.includes("Claude"));
  const hasOllama = agents.some((a) => a.name.includes("Ollama"));
  
  console.log(pc.bold(pc.cyan("\n💡 Recommended Agents\n")));
  
  if (!hasOllama) {
    console.log(pc.bold("🔥 Ollama (FREE local models)"));
    console.log(pc.gray("  Install: brew install ollama"));
    console.log(pc.gray("  Then: ollama pull qwen2.5-coder:7b"));
    console.log(pc.gray("  Cost: $0 - Run models locally!"));
    console.log("");
  }
  
  if (!hasOpenAI && !hasGitHubCopilot) {
    console.log(pc.bold("⚡ OpenAI CLI (o1, GPT-4o, GPT-4)"));
    console.log(pc.gray("  Install: npm install -g codex-cli"));
    console.log(pc.gray("  Or: GitHub Copilot CLI"));
    console.log(pc.gray("  Cost: $0.002-0.06/1K tokens (varies by model)"));
    console.log("");
  }
  
  if (!hasClaude) {
    console.log(pc.bold("🧠 Claude CLI (Deep reasoning)"));
    console.log(pc.gray("  Install: https://claude.ai"));
    console.log(pc.gray("  Cost: $0.015/1K tokens"));
    console.log("");
  }
  
  if (hasOllama || hasOpenAI || hasGitHubCopilot || hasClaude) {
    console.log(pc.green("✓ You have enough agents to start!"));
    console.log(pc.gray("\nRun: npx arela orchestrate --parallel"));
  }
  
  console.log("");
}
