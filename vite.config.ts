import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// In the browser (Playwright dev server) the JCS suite's core/sha256.js must
// resolve to the crypto.subtle variant instead of the node:crypto one. The
// package.json `browser` field handles this for the built dist; for the
// TS source served by Vite, alias any specifier ending in core/sha256.js to
// the browser file. (Matched only outside Vitest's 'test' mode.)
const sha256Browser = fileURLToPath(
  new URL('./src/core/sha256-browser.ts', import.meta.url)
)

export default defineConfig(({ mode }) => ({
  resolve: {
    alias:
      mode !== 'test'
        ? [{ find: /^.*\/core\/sha256\.js$/, replacement: sha256Browser }]
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
