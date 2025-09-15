import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['tests/setup-env.ts'],
    globals: false,
    clearMocks: true,
    reporters: 'default'
  }
});
