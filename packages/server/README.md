# Arela Companion Server

The companion server hosts native dependencies (SQLite, Tree-sitter) and exposes them over a lightweight IPC protocol. The VS Code extension downloads or launches this binary to keep the extension sandbox lightweight.

## Scripts

- `npm run build` – Compile the TypeScript sources to the `out/` folder.
- `npm run watch` – Rebuild on change.
- `npm run lint` – Run ESLint using the shared config.
- `npm run clean` – Remove build artifacts.

## Development

1. Run `npm install` from the repository root (the workspace hoists shared dependencies).
2. Compile via `npm run build --workspace arela-server`.
3. Execute the generated `out/index.js` directly with Node.js for manual validation.

## IPC Protocol

`arela-server` communicates exclusively over stdin/stdout using JSON-RPC 2.0. Each request/response occupies a single line on the stream.

**Request**
```json
{"jsonrpc":"2.0","id":"req-1","method":"ping","params":{}}
```

**Response**
```json
{"jsonrpc":"2.0","id":"req-1","result":"pong"}
```

**Error**
```json
{"jsonrpc":"2.0","id":"req-1","error":{"code":-32601,"message":"Method not found: foo"}}
```

Current methods:
- `ping` → returns `"pong"` (health check)
- `queryMemory` → stubbed response until HexiMemory integration
- `parseAST` → stubbed response until Tree-sitter integration

All diagnostic logging uses `stderr` so stdout remains clean for protocol messages.

### Manual Test

```bash
npm run build --workspace arela-server
node packages/server/out/index.js
echo '{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}' | node packages/server/out/index.js
```
