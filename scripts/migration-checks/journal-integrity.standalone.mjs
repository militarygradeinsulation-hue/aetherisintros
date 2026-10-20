// Static, dependency-free guard for drizzle/migrations (no database involved).
// Fails when the migration directory and the drizzle journal drift apart:
//   - an `NNNN_*.sql` file that is not journaled (stray/superseded duplicate)
//   - a journal entry without its SQL file
//   - two migrations sharing the same 4-digit number
//   - journal `idx` / `when` not strictly increasing
//   - the journal tag number disagreeing with its file name
// Usage: node scripts/migration-checks/journal-integrity.standalone.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'drizzle', 'migrations')
const { entries } = JSON.parse(readFileSync(join(dir, 'meta', '_journal.json'), 'utf8'))
const files = readdirSync(dir).filter(f => /^\d{4}_.*\.sql$/.test(f))
const tags = new Set(entries.map(e => `${e.tag}.sql`))
const problems = []

for (const f of files) if (!tags.has(f)) problems.push(`unjournaled migration file: ${f}`)
for (const t of tags) if (!files.includes(t)) problems.push(`journal entry without file: ${t}`)

const byNumber = new Map()
for (const f of files) byNumber.set(f.slice(0, 4), [...(byNumber.get(f.slice(0, 4)) ?? []), f])
for (const [n, fs] of byNumber) if (fs.length > 1) problems.push(`duplicate migration number ${n}: ${fs.join(', ')}`)

for (let i = 1; i < entries.length; i++) {
  const [a, b] = [entries[i - 1], entries[i]]
  if (!(b.idx > a.idx)) problems.push(`journal idx not increasing at ${b.tag}`)
  if (!(b.when > a.when)) problems.push(`journal "when" not increasing at ${b.tag}`)
}
for (const e of entries) {
  if (!/^\d{4}_/.test(e.tag)) problems.push(`journal tag without number: ${e.tag}`)
}

if (problems.length) {
  console.error(problems.map(p => `  ✗ ${p}`).join('\n'))
  console.error(`\n${problems.length} journal integrity problem(s)`)
  process.exit(1)
}
console.log(`  ✓ ${files.length} migration files, ${entries.length} journal entries, no strays, no duplicate numbers, monotonic idx/when`)
