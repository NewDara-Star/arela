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
