import { defineConfig } from 'vitest/config';

export default defineConfig({
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
