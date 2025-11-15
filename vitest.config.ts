import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Exclude native modules from transformation
    exclude: ['node_modules', 'dist', '.arela'],
    // Allow tree-sitter (native module) to be imported
    deps: {
      optimizer: {
        ssr: {
          include: ['tree-sitter', 'tree-sitter-typescript'],
        },
      },
    },
  },
  resolve: {
    alias: {
      // Ensure tree-sitter uses the native module
      'tree-sitter': 'tree-sitter',
    },
  },
});
