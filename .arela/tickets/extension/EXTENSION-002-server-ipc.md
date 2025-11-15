# EXTENSION-002: Build arela-server with IPC

**Category:** Foundation  
**Priority:** P0 (Blocking)  
**Estimated Time:** 8 hours  
**Assignee:** TBD  
**Status:** 🔴 Not Started

---

## Context

Build the `arela-server` Node.js binary that will run as a child process. This server will "jail" the native modules (better-sqlite3, tree-sitter) and expose their functionality via a simple JSON-RPC IPC interface over stdin/stdout.

## Requirements

### Must Have
- [ ] Install better-sqlite3 and tree-sitter in server package
- [ ] Create JSON-RPC IPC handler (stdin/stdout)
- [ ] Implement `ping` method (health check)
- [ ] Implement `queryMemory` method (HexiMemory wrapper)
- [ ] Implement `parseAST` method (tree-sitter wrapper)
- [ ] Handle errors gracefully
- [ ] Log to stderr (not stdout, to avoid IPC pollution)

### Should Have
- [ ] Request/response correlation IDs
- [ ] Timeout handling (30s default)
- [ ] Graceful shutdown on SIGTERM
- [ ] Memory usage monitoring

### Nice to Have
- [ ] Request batching
- [ ] Compression for large responses
- [ ] Performance metrics logging

## Acceptance Criteria

- [ ] Server starts and listens on stdin
- [ ] Responds to `ping` with `pong`
- [ ] Can query HexiMemory via IPC
- [ ] Can parse code with tree-sitter via IPC
- [ ] Handles malformed JSON gracefully
- [ ] Exits cleanly on SIGTERM
- [ ] No crashes on invalid requests

## Technical Details

### JSON-RPC Protocol

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "method": "ping",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "result": "pong"
}
```

**Error:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": "Stack trace..."
  }
}
```

### IPC Handler Implementation

```typescript
// src/ipc-handler.ts
import readline from 'readline';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class IpcHandler {
  private handlers: Map<string, (params: any) => Promise<any>>;

  constructor() {
    this.handlers = new Map();
    this.setupStdinListener();
  }

  register(method: string, handler: (params: any) => Promise<any>) {
    this.handlers.set(method, handler);
  }

  private setupStdinListener() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', async (line) => {
      try {
        const request: JsonRpcRequest = JSON.parse(line);
        const response = await this.handleRequest(request);
        this.send(response);
      } catch (error) {
        console.error('[Server Error]', error);
      }
    });
  }

  private async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const handler = this.handlers.get(request.method);
    
    if (!handler) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`,
        },
      };
    }

    try {
      const result = await handler(request.params);
      return {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error.message,
          data: error.stack,
        },
      };
    }
  }

  private send(response: JsonRpcResponse) {
    console.log(JSON.stringify(response));
  }
}
```

### Main Entry Point

```typescript
// src/index.ts
import { IpcHandler } from './ipc-handler';
import { MemoryWrapper } from './memory-wrapper';
import { ASTParser } from './ast-parser';

const ipc = new IpcHandler();
const memory = new MemoryWrapper();
const parser = new ASTParser();

// Register methods
ipc.register('ping', async () => 'pong');
ipc.register('queryMemory', (params) => memory.query(params));
ipc.register('parseAST', (params) => parser.parse(params));

// Graceful shutdown
process.on('SIGTERM', () => {
  console.error('[Server] Shutting down...');
  memory.close();
  process.exit(0);
});

console.error('[Server] Ready');
```

## Files to Create

- `packages/server/src/ipc-handler.ts`
- `packages/server/src/index.ts`
- `packages/server/src/memory-wrapper.ts` (stub for now)
- `packages/server/src/ast-parser.ts` (stub for now)
- `packages/server/src/types.ts`

## Dependencies

- **Blocks:** EXTENSION-001 (monorepo setup)
- **Blocked by:** None

## Testing

### Manual Test
```bash
# Start server
node packages/server/out/index.js

# Send request (in another terminal)
echo '{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}' | node packages/server/out/index.js

# Expected output:
# {"jsonrpc":"2.0","id":1,"result":"pong"}
```

### Unit Tests
- [ ] Test ping method
- [ ] Test error handling (malformed JSON)
- [ ] Test unknown method
- [ ] Test timeout handling
- [ ] Test graceful shutdown

## Documentation

- Document JSON-RPC protocol in `packages/server/README.md`
- Add method signatures and examples
- Document error codes

## Notes

- Use stderr for all logging (stdout is reserved for IPC)
- Keep protocol simple - no WebSockets, just stdin/stdout
- Correlation IDs are critical for debugging
- Server should never crash - catch all errors

## Related

- Architecture Decision: Section 5.1
- Validation: "Downloader Shim" pattern
