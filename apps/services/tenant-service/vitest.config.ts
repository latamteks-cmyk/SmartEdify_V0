import { defineConfig, configDefaults } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

const skipIntegration = process.env.SKIP_DB_TESTS === '1';
if (skipIntegration) {
  // eslint-disable-next-line no-console
  console.log('[vitest.config] SKIP_DB_TESTS=1 -> excluyendo tests de integración');
}

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    setupFiles: ['tests/setup-env.ts'],
    globals: false,
    clearMocks: true,
    reporters: 'default',
    // Si se solicita omitir pruebas con DB, excluimos la carpeta de integración por completo
    exclude: skipIntegration
      ? [...configDefaults.exclude, 'tests/integration/**']
      : configDefaults.exclude
  }
});
