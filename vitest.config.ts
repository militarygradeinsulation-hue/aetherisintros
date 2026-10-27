import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

// Unit tests. scripts/security-harness needs a dump of the live schema, so it is run by hand
// (see its README), not with the rest of the tests.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // This file uses the Node test runner in the dedicated public SEO workflow.
  // Vitest cannot collect its node:test suites; do not skip any Vitest application tests.
  test: { exclude: [...configDefaults.exclude, 'scripts/security-harness/**', '.output/**', 'scripts/public-search-check/production-monitor.test.mjs'] },
})
