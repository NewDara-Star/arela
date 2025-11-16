import type { AIProvider } from './provider';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { OllamaProvider } from './providers/ollama';

export interface AIConfig {
  defaultProvider?: string;
  defaultModel?: string;
  openai?: {
    apiKey?: string;
  };
  anthropic?: {
    apiKey?: string;
  };
  ollama?: {
    enabled?: boolean;
    baseUrl?: string;
  };
}

export class AIManager {
  private providers: Map<string, AIProvider> = new Map();
  private currentProvider = 'openai';
  private currentModel = 'gpt-4-turbo-preview';

  async initialize(config: AIConfig = {}) {
    this.providers.clear();

    if (config.openai?.apiKey) {
      this.providers.set('openai', new OpenAIProvider(config.openai.apiKey));
    }

    if (config.anthropic?.apiKey) {
      this.providers.set('anthropic', new AnthropicProvider(config.anthropic.apiKey));
    }

    if (config.ollama?.enabled) {
      const ollama = new OllamaProvider(config.ollama.baseUrl);
      await ollama.initialize();
      this.providers.set('ollama', ollama);
    }

    if (config.defaultProvider && this.providers.has(config.defaultProvider)) {
      this.currentProvider = config.defaultProvider;
    }

    if (config.defaultModel) {
      this.currentModel = config.defaultModel;
    }

    if (!this.providers.has(this.currentProvider) && this.providers.size > 0) {
      const [firstProvider] = this.providers.keys();
      if (firstProvider) {
        this.currentProvider = firstProvider;
      }
    }
  }

  getProvider(name?: string): AIProvider | null {
    const providerName = name || this.currentProvider;
    return this.providers.get(providerName) || null;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  listModels(providerName?: string): string[] {
    const provider = this.getProvider(providerName);
    return provider?.models || [];
  }

  setProvider(name: string, model?: string) {
    if (this.providers.has(name)) {
      this.currentProvider = name;
      if (model) {
        this.currentModel = model;
      }
    }
  }

  getCurrentConfig() {
    return {
      provider: this.currentProvider,
      model: this.currentModel,
    };
  }
}
