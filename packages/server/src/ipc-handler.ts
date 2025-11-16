import readline from 'readline';
import {
  JSON_RPC_VERSION,
  JsonRpcErrorCode,
  JsonRpcHandler,
  JsonRpcId,
  JsonRpcRequest,
  JsonRpcResponse,
} from './types';

const JSON_LINE_DELIMITER = '\n';

export class IpcHandler {
  private readonly handlers = new Map<string, JsonRpcHandler>();

  constructor(
    private readonly input: NodeJS.ReadableStream = process.stdin,
    private readonly output: NodeJS.WritableStream = process.stdout,
  ) {
    this.setupStdinListener();
  }

  register<TParams = unknown, TResult = unknown>(
    method: string,
    handler: JsonRpcHandler<TParams, TResult>,
  ) {
    this.handlers.set(method, handler as JsonRpcHandler);
  }

  notify(method: string, params?: unknown) {
    const payload = {
      jsonrpc: JSON_RPC_VERSION,
      method,
      params,
    };
    this.output.write(`${JSON.stringify(payload)}${JSON_LINE_DELIMITER}`);
  }

  private setupStdinListener() {
    const rl = readline.createInterface({
      input: this.input,
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      void this.handleLine(line);
    });

    rl.on('close', () => {
      console.error('[IPC] stdin closed, shutting down.');
      process.exit(0);
    });
  }

  private async handleLine(line: string) {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    let request: JsonRpcRequest;
    try {
      request = JSON.parse(trimmed);
    } catch (error) {
      this.send(
        this.createErrorResponse(null, JsonRpcErrorCode.ParseError, 'Parse error', this.safeError(error)),
      );
      return;
    }

    if (!this.isValidRequest(request)) {
      this.send(
        this.createErrorResponse(
          this.extractId(request),
          JsonRpcErrorCode.InvalidRequest,
          'Invalid request',
        ),
      );
      return;
    }

    const response = await this.handleRequest(request);
    this.send(response);
  }

  private async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const handler = this.handlers.get(request.method);

    if (!handler) {
      return this.createErrorResponse(
        request.id,
        JsonRpcErrorCode.MethodNotFound,
        `Method not found: ${request.method}`,
      );
    }

    try {
      const result = await handler(request.params ?? {});
      return {
        jsonrpc: JSON_RPC_VERSION,
        id: request.id,
        result,
      };
    } catch (error) {
      console.error('[IPC] Handler error:', error);
      return this.createErrorResponse(
        request.id,
        JsonRpcErrorCode.InternalError,
        'Internal error',
        this.safeError(error),
      );
    }
  }

  private send(response: JsonRpcResponse) {
    // stdout is reserved exclusively for JSON-RPC responses.
    this.output.write(`${JSON.stringify(response)}${JSON_LINE_DELIMITER}`);
  }

  private isValidRequest(payload: unknown): payload is JsonRpcRequest {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const candidate = payload as Partial<JsonRpcRequest>;
    const hasValidVersion = candidate.jsonrpc === JSON_RPC_VERSION;
    const hasValidId = typeof candidate.id === 'string' || typeof candidate.id === 'number' || candidate.id === null;
    const hasMethod = typeof candidate.method === 'string' && candidate.method.length > 0;

    return Boolean(hasValidVersion && hasValidId && hasMethod);
  }

  private extractId(payload: unknown): JsonRpcId {
    if (payload && typeof payload === 'object' && 'id' in payload) {
      const idValue = (payload as Record<string, unknown>).id;
      if (typeof idValue === 'string' || typeof idValue === 'number' || idValue === null) {
        return idValue;
      }
    }

    return null;
  }

  private createErrorResponse(
    id: JsonRpcId,
    code: JsonRpcErrorCode,
    message: string,
    data?: unknown,
  ): JsonRpcResponse {
    return {
      jsonrpc: JSON_RPC_VERSION,
      id,
      error: {
        code,
        message,
        data,
      },
    };
  }

  private safeError(error: unknown) {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
      };
    }

    return error;
  }
}
