# EXTENSION-010: AI Provider Integration

**Agent:** @claude  
**Priority:** High  
**Estimated Time:** 4-5 hours  
**Dependencies:** EXTENSION-009 (Streaming Responses)

---

## Context

Integrate multiple AI providers (OpenAI, Anthropic, Ollama) with a unified interface. Allow users to select their preferred provider and model via settings. This replaces the mock streaming with real AI responses.

---

## Requirements

### 1. Provider Interface

**Create:** `packages/server/src/ai/provider.ts`

**Define unified interface:**

```typescript
export interface AIProvider {
  name: string;
  models: string[];
  stream(request: StreamRequest): AsyncIterableIterator<string>;
  chat(request: ChatRequest): Promise<string>;
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

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

### 2. OpenAI Provider

**Create:** `packages/server/src/ai/providers/openai.ts`

**Install:** `openai` package

```bash
npm install --save openai
```

**Implementation:**

```typescript
import OpenAI from 'openai';
import type { AIProvider, StreamRequest, ChatRequest } from '../provider';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  models = [
    'gpt-4-turbo-preview',
    'gpt-4',
    'gpt-3.5-turbo',
  ];
  
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async *stream(request: StreamRequest): AsyncIterableIterator<string> {
    const stream = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2000,
      stream: true,
    }, {
      signal: request.signal,
    });
    
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
```

### 3. Anthropic Provider

**Create:** `packages/server/src/ai/providers/anthropic.ts`

**Install:** `@anthropic-ai/sdk` package

```bash
npm install --save @anthropic-ai/sdk
```

**Implementation:**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, StreamRequest, ChatRequest } from '../provider';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  models = [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];
  
  private client: Anthropic;
  
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }
  
  async *stream(request: StreamRequest): AsyncIterableIterator<string> {
    const stream = await this.client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens ?? 2000,
      temperature: request.temperature ?? 0.7,
      messages: request.messages,
      stream: true,
    }, {
      signal: request.signal,
    });
    
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && 
          event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }
  
  async chat(request: ChatRequest): Promise<string> {
    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens ?? 2000,
      temperature: request.temperature ?? 0.7,
      messages: request.messages,
    });
    
    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock?.type === 'text' ? textBlock.text : '';
  }
}
```

### 4. Ollama Provider

**Create:** `packages/server/src/ai/providers/ollama.ts`

**Install:** `ollama` package

```bash
npm install --save ollama
```

**Implementation:**

```typescript
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
    // Fetch available models from Ollama
    const response = await this.client.list();
    this.models = response.models.map(m => m.name);
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
```

### 5. Provider Manager

**Create:** `packages/server/src/ai/manager.ts`

**Manage provider selection and initialization:**

```typescript
import type { AIProvider } from './provider';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { OllamaProvider } from './providers/ollama';

export class AIManager {
  private providers: Map<string, AIProvider> = new Map();
  private currentProvider: string = 'openai';
  private currentModel: string = 'gpt-4-turbo-preview';
  
  async initialize(config: AIConfig) {
    // Initialize providers based on config
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
    
    // Set default provider
    if (config.defaultProvider && this.providers.has(config.defaultProvider)) {
      this.currentProvider = config.defaultProvider;
    }
    
    if (config.defaultModel) {
      this.currentModel = config.defaultModel;
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

export interface AIConfig {
  defaultProvider?: string;
  defaultModel?: string;
  openai?: {
    apiKey: string;
  };
  anthropic?: {
    apiKey: string;
  };
  ollama?: {
    enabled: boolean;
    baseUrl?: string;
  };
}
```

### 6. Server IPC Methods

**Update:** `packages/server/src/index.ts`

**Add AI methods to IPC:**

```typescript
import { AIManager } from './ai/manager';

export class ArelaServer {
  private aiManager: AIManager;
  
  constructor() {
    this.aiManager = new AIManager();
  }
  
  async initialize(config: any) {
    await this.aiManager.initialize(config.ai || {});
  }
  
  async chat(params: { messages: Message[]; provider?: string; model?: string }) {
    const provider = this.aiManager.getProvider(params.provider);
    if (!provider) {
      throw new Error(`Provider not available: ${params.provider || 'default'}`);
    }
    
    const model = params.model || this.aiManager.getCurrentConfig().model;
    
    return await provider.chat({
      model,
      messages: params.messages,
    });
  }
  
  async *streamChat(params: { messages: Message[]; provider?: string; model?: string; signal?: AbortSignal }) {
    const provider = this.aiManager.getProvider(params.provider);
    if (!provider) {
      throw new Error(`Provider not available: ${params.provider || 'default'}`);
    }
    
    const model = params.model || this.aiManager.getCurrentConfig().model;
    
    for await (const chunk of provider.stream({
      model,
      messages: params.messages,
      signal: params.signal,
    })) {
      yield chunk;
    }
  }
  
  listProviders() {
    return this.aiManager.listProviders();
  }
  
  listModels(provider?: string) {
    return this.aiManager.listModels(provider);
  }
  
  setProvider(provider: string, model?: string) {
    this.aiManager.setProvider(provider, model);
  }
}
```

### 7. Extension Integration

**Update:** `packages/extension/src/chat-provider.ts`

**Replace mock with real AI streaming:**

```typescript
private async handleSendMessage(content: string, context: MessageContext) {
  const messageId = crypto.randomUUID();
  
  this.panel!.webview.postMessage({
    type: 'streamStart',
    messageId,
  });
  
  try {
    // Build messages array
    const messages = this.buildMessages(content, context);
    
    // Stream from server
    await this.streamFromServer(messageId, messages);
  } catch (error) {
    this.panel!.webview.postMessage({
      type: 'streamError',
      messageId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

private buildMessages(content: string, context: MessageContext): Message[] {
  const messages: Message[] = [];
  
  // Add system message with context
  if (context.files || context.selection || context.mentions) {
    let systemContent = 'You are Arela, an AI coding assistant.\n\n';
    
    if (context.files) {
      systemContent += 'Attached files:\n';
      for (const file of context.files) {
        systemContent += `\n${file.path}:\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n`;
      }
    }
    
    if (context.selection) {
      systemContent += `\nSelected code from ${context.selection.file}:\n\`\`\`\n${context.selection.code}\n\`\`\`\n`;
    }
    
    messages.push({
      role: 'system',
      content: systemContent,
    });
  }
  
  // Add user message
  messages.push({
    role: 'user',
    content,
  });
  
  return messages;
}

private async streamFromServer(messageId: string, messages: Message[]) {
  // Call server via IPC
  const response = await this.serverManager.call('streamChat', { messages });
  
  // Server returns async iterator
  for await (const chunk of response) {
    this.panel!.webview.postMessage({
      type: 'streamChunk',
      messageId,
      chunk,
    });
  }
  
  this.panel!.webview.postMessage({
    type: 'streamEnd',
    messageId,
  });
}
```

### 8. Settings UI

**Add VS Code settings:**

**Update:** `packages/extension/package.json`

```json
{
  "contributes": {
    "configuration": {
      "title": "Arela",
      "properties": {
        "arela.provider": {
          "type": "string",
          "enum": ["openai", "anthropic", "ollama"],
          "default": "openai",
          "description": "AI provider to use"
        },
        "arela.model": {
          "type": "string",
          "default": "gpt-4-turbo-preview",
          "description": "AI model to use"
        },
        "arela.openai.apiKey": {
          "type": "string",
          "default": "",
          "description": "OpenAI API key"
        },
        "arela.anthropic.apiKey": {
          "type": "string",
          "default": "",
          "description": "Anthropic API key"
        },
        "arela.ollama.enabled": {
          "type": "boolean",
          "default": false,
          "description": "Enable Ollama (local models)"
        },
        "arela.ollama.baseUrl": {
          "type": "string",
          "default": "http://localhost:11434",
          "description": "Ollama server URL"
        }
      }
    }
  }
}
```

---

## Acceptance Criteria

- [ ] OpenAI provider streams responses correctly
- [ ] Anthropic provider streams responses correctly
- [ ] Ollama provider streams responses correctly
- [ ] Provider can be selected via settings
- [ ] Model can be selected via settings
- [ ] API keys stored securely (VS Code secrets)
- [ ] Error handling for missing API keys
- [ ] Error handling for network failures
- [ ] Streaming can be cancelled mid-response
- [ ] Multiple providers can be configured simultaneously
- [ ] Provider/model selection persists across sessions
- [ ] Settings UI shows available models per provider

---

## Testing

### Manual Test

1. **Test OpenAI:**
   - Set API key in settings
   - Select "openai" provider
   - Send message
   - Response streams correctly

2. **Test Anthropic:**
   - Set API key
   - Select "anthropic" provider
   - Send message
   - Response streams correctly

3. **Test Ollama:**
   - Start Ollama locally
   - Enable in settings
   - Select model
   - Send message
   - Response streams correctly

4. **Test provider switching:**
   - Switch from OpenAI to Anthropic
   - Send message
   - Uses new provider

5. **Test error handling:**
   - Remove API key
   - Send message
   - Shows clear error message

---

## Files to Create

- `packages/server/src/ai/provider.ts`
- `packages/server/src/ai/providers/openai.ts`
- `packages/server/src/ai/providers/anthropic.ts`
- `packages/server/src/ai/providers/ollama.ts`
- `packages/server/src/ai/manager.ts`

## Files to Modify

- `packages/server/src/index.ts`
- `packages/extension/src/chat-provider.ts`
- `packages/extension/package.json`
- `packages/server/package.json` (add AI SDK dependencies)

---

## Security

- **API keys:** Store in VS Code secrets API, not plain text settings
- **Sanitize input:** Validate all user input before sending to AI
- **Rate limiting:** Implement client-side rate limiting to prevent abuse
- **Error messages:** Don't expose API keys in error messages

---

## Next Tickets

- **EXTENSION-011:** Context management (file, workspace, selection)
- **EXTENSION-012:** Advanced features (code actions, inline suggestions)
- **EXTENSION-013:** Settings UI panel
- **EXTENSION-014:** Telemetry and analytics

---

**This is a @claude ticket because it requires deep integration knowledge and error handling for multiple AI providers.**
