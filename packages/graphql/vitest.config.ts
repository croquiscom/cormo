import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const graphqlCjs = fileURLToPath(new URL('./node_modules/graphql/index.js', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^graphql$/, replacement: graphqlCjs }],
  },
  test: {
    globals: false,
    include: ['test/*/*.ts'],
    setupFiles: ['vitest.setup.ts'],
    testTimeout: 5000,
    hookTimeout: 5000,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['lcov'],
      include: ['src/**/*.ts'],
    },
  },
});
