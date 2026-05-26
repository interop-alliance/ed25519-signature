import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  resolve: {
    alias:
      mode !== 'test'
        ? [{ find: './sha256.js', replacement: './sha256-browser.ts' }]
        : []
  },
  test: {
    include: ['test/node/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts']
    }
  }
}))
