import { Ollama } from 'ollama';
import type { AIProvider, StreamRequest, ChatRequest } from '../provider';

export class OllamaProvider implements AIProvider {
  name = 'ollama';
  models: string[] = [];

  private client: Ollama;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.client = new Ollama({ host: baseUrl });
  }

  async initialize() {
    try {
      const response = await this.client.list();
      this.models = response.models.map((model) => model.name);
    } catch (error) {
      console.error('[Ollama] Failed to fetch models:', error);
      this.models = [];
    }
  }

  async *stream(request: StreamRequest): AsyncIterableIterator<string> {
    const stream = await this.client.chat({
      model: request.model,
      messages: request.messages,
      stream: true,
      options: {
        temperature: request.temperature ?? 0.7,
        num_predict: request.maxTokens ?? 2000,
      },
    });

    for await (const chunk of stream) {
      if (chunk.message?.content) {
        yield chunk.message.content;
      }
    }
  }

  async chat(request: ChatRequest): Promise<string> {
    const response = await this.client.chat({
      model: request.model,
      messages: request.messages,
      stream: false,
      options: {
        temperature: request.temperature ?? 0.7,
        num_predict: request.maxTokens ?? 2000,
      },
    });

    return response.message?.content || '';
  }
}
