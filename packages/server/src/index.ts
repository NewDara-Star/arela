import { AstParser, ParseAstParams } from './ast-parser';
import { IpcHandler } from './ipc-handler';
import { MemoryQueryParams, MemoryWrapper } from './memory-wrapper';
import { AIManager, type AIConfig } from './ai/manager';
import type { AIProvider, Message } from './ai/provider';

interface InitializeParams {
  ai?: AIConfig;
}

interface ChatParams {
  messages?: Message[];
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface StreamChatParams extends ChatParams {
  messageId: string;
}

interface StopStreamParams {
  messageId: string;
}

class ArelaServer {
  private readonly memory = new MemoryWrapper();
  private readonly parser = new AstParser();
  private readonly aiManager = new AIManager();
  private readonly streamControllers = new Map<string, AbortController>();

  constructor(private readonly ipc: IpcHandler) {
    this.registerHandlers();
  }

  private registerHandlers() {
    this.ipc.register('ping', async () => 'pong');
    this.ipc.register<MemoryQueryParams>('queryMemory', async (params = {}) => this.memory.query(params));
    this.ipc.register<ParseAstParams>('parseAST', async (params = {}) => this.parser.parse(params));
    this.ipc.register<InitializeParams>('initialize', async (params = {}) => {
      await this.aiManager.initialize(params.ai || {});
      return { ok: true };
    });

    this.ipc.register<ChatParams>('chat', async (params) => {
      const provider = this.requireProvider(params.provider);
      const model = params.model || this.aiManager.getCurrentConfig().model;
      return provider.chat({
        model,
        messages: params.messages || [],
        temperature: params.temperature,
        maxTokens: params.maxTokens,
      });
    });

    this.ipc.register<StreamChatParams>('streamChat', async (params) => {
      if (!params.messageId) {
        throw new Error('messageId is required');
      }
      const provider = this.requireProvider(params.provider);
      const model = params.model || this.aiManager.getCurrentConfig().model;
      const controller = new AbortController();
      this.streamControllers.set(params.messageId, controller);

      void this.streamWithProvider(provider, params.messageId, {
        model,
        messages: params.messages || [],
        temperature: params.temperature,
        maxTokens: params.maxTokens,
        signal: controller.signal,
      });

      return { ok: true };
    });

    this.ipc.register<StopStreamParams>('stopStream', async (params) => {
      if (!params.messageId) {
        return { ok: false };
      }
      const controller = this.streamControllers.get(params.messageId);
      if (controller) {
        controller.abort();
      }
      return { ok: true };
    });

    this.ipc.register('listProviders', async () => this.aiManager.listProviders());
    this.ipc.register<{ provider?: string }>('listModels', async (params = {}) =>
      this.aiManager.listModels(params.provider),
    );
    this.ipc.register<{ provider: string; model?: string }>('setProvider', async (params) => {
      if (!params.provider) {
        throw new Error('provider is required');
      }
      this.aiManager.setProvider(params.provider, params.model);
      return this.aiManager.getCurrentConfig();
    });
  }

  private requireProvider(name?: string) {
    const provider = this.aiManager.getProvider(name);
    if (!provider) {
      throw new Error(`Provider not available: ${name || 'default'}`);
    }
    return provider;
  }

  private async streamWithProvider(
    provider: AIProvider,
    messageId: string,
    request: {
      model: string;
      messages: Message[];
      temperature?: number;
      maxTokens?: number;
      signal: AbortSignal;
    },
  ) {
    try {
      for await (const chunk of provider.stream(request)) {
        this.ipc.notify('streamChunk', {
          messageId,
          chunk,
        });
      }
      this.ipc.notify('streamEnd', { messageId });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.ipc.notify('streamEnd', { messageId });
      } else {
        this.ipc.notify('streamError', {
          messageId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      this.streamControllers.delete(messageId);
    }
  }

  shutdown() {
    console.error('[Server] Shutting down...');
    this.memory.close();
    this.streamControllers.forEach((controller) => controller.abort());
    this.streamControllers.clear();
  }
}

const ipc = new IpcHandler();
const server = new ArelaServer(ipc);

const shutdown = () => {
  server.shutdown();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.error('[Server] Ready');
