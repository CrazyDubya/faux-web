import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'src/__tests__/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
        'dist/**',
        '.wrangler/**',
      ],
      include: ['src/**/*.ts'],
      all: true,
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
  },
});
