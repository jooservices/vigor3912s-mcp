import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        // Curated catalog + stdio entry: e2e/build surface, not unit-branch dense.
        'src/commands/registry/**',
        'src/index.ts',
        // Test doubles — not product code.
        'src/test/**',
        // Registration glue: covered by build tests + e2e.
        'src/commands/build.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
