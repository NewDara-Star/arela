# Arela VS Code Extension

This package contains the VS Code extension that provides the Arela chat UI surface. The extension is responsible for activating commands, hosting the WebView UI, and coordinating IPC with the local Arela server process.

## Scripts

- `npm run build` – Compile the extension source into the `out/` directory.
- `npm run watch` – Incremental compilation for local development.
- `npm run lint` – Run ESLint checks using the shared repository configuration.
- `npm run clean` – Remove the generated `out/` artifacts.

## Development

1. Run `npm install` from the repository root to make sure workspace dependencies are installed.
2. Run `npm run build --workspace arela-extension` to compile the extension, or use `npm run watch --workspace arela-extension` while iterating.
3. Use VS Code's `Run Extension` task to load the compiled extension into a development host.
