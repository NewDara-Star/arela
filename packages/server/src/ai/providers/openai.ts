import OpenAI from 'openai';
import type { AIProvider, StreamRequest, ChatRequest } from '../provider';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  models = ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'];

  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async *stream(request: StreamRequest): AsyncIterableIterator<string> {
    const stream = await this.client.chat.completions.create(
      {
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2000,
        stream: true,
      },
      {
        signal: request.signal,
      },
    );

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  async chat(request: ChatRequest): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2000,
    });

    return response.choices[0]?.message?.content || '';
  }
}
