export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  name: string;
  models: string[];
  stream(request: StreamRequest): AsyncIterableIterator<string>;
  chat(request: ChatRequest): Promise<string>;
}
