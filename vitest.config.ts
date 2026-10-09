import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

// Unit tests. scripts/security-harness needs a dump of the live schema, so it is run by hand
// (see its README), not with the rest of the tests.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { exclude: [...configDefaults.exclude, 'scripts/security-harness/**', '.output/**'] },
})
