import type { Agent, Ticket, AgentAdapter } from "../types.js";
import { OllamaAdapter } from "./ollama.js";
import { OpenAIAdapter } from "./openai.js";

const adapters: AgentAdapter[] = [new OllamaAdapter(), new OpenAIAdapter()];

export function getAdapter(agent: Agent, ticket: Ticket): AgentAdapter | null {
  for (const adapter of adapters) {
    if (adapter.canRun(agent, ticket)) {
      return adapter;
    }
  }
  return null;
}

export { OllamaAdapter, OpenAIAdapter };
export type { AgentAdapter };
