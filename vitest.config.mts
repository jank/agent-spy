import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/renderer/lib/**', 'src/renderer/stores/**', 'src/main/services/**'],
    },
  },
  resolve: {
    alias: {
      // Stub out electron imports for unit tests
      electron: new URL('./src/__tests__/__mocks__/electron.ts', import.meta.url).pathname,
    },
  },
});
