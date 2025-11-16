import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import type { AIProvider, StreamRequest, ChatRequest, Message } from '../provider';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  models = [
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];

  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async *stream(request: StreamRequest): AsyncIterableIterator<string> {
    const { systemPrompt, conversation } = this.prepareMessages(request.messages);
    const stream = await this.client.messages.create(
      {
        model: request.model,
        max_tokens: request.maxTokens ?? 2000,
        temperature: request.temperature ?? 0.7,
        system: systemPrompt,
        messages: conversation,
        stream: true,
      },
      {
        signal: request.signal,
      },
    );

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  async chat(request: ChatRequest): Promise<string> {
    const { systemPrompt, conversation } = this.prepareMessages(request.messages);
    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens ?? 2000,
      temperature: request.temperature ?? 0.7,
      system: systemPrompt,
      messages: conversation,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock?.type === 'text' ? textBlock.text : '';
  }

  private prepareMessages(messages: Message[]) {
    const conversation: MessageParam[] = [];
    let systemPrompt: string | undefined;

    for (const message of messages) {
      if (message.role === 'system') {
        systemPrompt = systemPrompt ? `${systemPrompt}\n\n${message.content}` : message.content;
      } else {
        conversation.push({
          role: message.role,
          content: message.content,
        });
      }
    }

    return { systemPrompt, conversation };
  }
}
