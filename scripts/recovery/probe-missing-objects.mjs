// READ-ONLY inventory: for each drizzle migration in a range, list the tables/functions it
// creates and whether they exist in the connected database. Issues SELECTs on pg_catalog only.
// Usage: node scripts/recovery/probe-missing-objects.mjs 58 77 > /tmp/probe.tsv   (needs PG* env, psql)
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const [from = 58, to = 77] = process.argv.slice(2).map(Number)
const dir = new URL('../../drizzle/migrations/', import.meta.url)
const q = sql => execFileSync('psql', ['-Atc', sql], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
const tables = new Set(q("select relname from pg_class where relnamespace='public'::regnamespace"))
const funcs = new Set(q("select proname from pg_proc where pronamespace='public'::regnamespace"))
let ledger = 'unreadable'
try { ledger = q('select count(*) from drizzle.__drizzle_migrations')[0] } catch (e) { ledger = 'denied: ' + String(e.stderr || e).split('\n')[0] }
console.log(`# drizzle ledger: ${ledger}`)
console.log('migration\tkind\tobject\tlive')
// Journal order only: stray, unjournaled NNNN_*.sql files are never shipped by drizzle-kit.
const journaled = JSON.parse(readFileSync(new URL('meta/_journal.json', dir), 'utf8')).entries.map(e => `${e.tag}.sql`)
for (const f of journaled) {
  const n = Number(f.slice(0, 4)); if (n < from || n > to) continue
  const sql = readFileSync(new URL(f, dir), 'utf8')
  for (const [, t] of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)"?/gi)) console.log(`${f}\ttable\t${t}\t${tables.has(t) ? 'present' : 'MISSING'}`)
  for (const [, p] of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?(\w+)"?/gi)) console.log(`${f}\tfunction\t${p}\t${funcs.has(p) ? 'present' : 'MISSING'}`)
}
