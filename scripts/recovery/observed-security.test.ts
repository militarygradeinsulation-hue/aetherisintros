import { expect, it } from 'vitest'
import { createRequire } from 'node:module'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { checkObservedSecurity } from './observed-security.mjs'
import { postJournalMigrations } from './replay'

const require = createRequire(process.env.PGLITE_MODULE_ROOT ? resolve(process.env.PGLITE_MODULE_ROOT, 'package.json') : import.meta.url)
const { PGlite } = require('@electric-sql/pglite')
const { pg_trgm } = require(join(require.resolve('@electric-sql/pglite'), '../contrib/pg_trgm.cjs'))
const repo = resolve(import.meta.dirname, '../..')

it('runs the expanded security adapter on unchanged source history including automatic signup profiles', async () => {
  // This is SYNTHETIC source history, not the unavailable production catalog.
  const db = new PGlite({ extensions: { pg_trgm } })
  try {
    await db.exec(readFileSync(join(repo, 'scripts/recovery/fixtures/platform.sql'), 'utf8'))
    for (const file of readdirSync(join(repo, 'supabase/migrations')).filter(f => f.endsWith('.sql') && !postJournalMigrations.includes(f)).sort()) {
      await db.exec(readFileSync(join(repo, 'supabase/migrations', file), 'utf8'))
    }
    const entries = JSON.parse(readFileSync(join(repo, 'drizzle/migrations/meta/_journal.json'), 'utf8')).entries
    for (const entry of entries) {
      if (entry.tag === '0100_repair_warm_referrals_and_syndication_rooms') {
        // Only the disposable catalog needs these observed live prerequisites;
        // the frozen historical 0072/0075 table names do not match live 0100.
        await db.exec(readFileSync(join(repo, 'scripts/recovery/fixtures/0100_legacy_live_prerequisites.sql'), 'utf8'))
      }
      await db.exec(readFileSync(join(repo, 'drizzle/migrations', entry.tag + '.sql'), 'utf8'))
    }
    for (const file of postJournalMigrations) await db.exec(readFileSync(join(repo, 'supabase/migrations', file), 'utf8'))
    const report = await checkObservedSecurity(db, repo)
    expect(report.setupError).toBeNull()
    expect(report.fail, JSON.stringify(report.checks.filter((c: any) => c.status === 'FAIL'))).toBe(0)
    expect(report.membershipHelperOverridden).toBe(false)
    expect(report.pass).toBeGreaterThan(386)
    expect(report.checks.some((c: any) => c.name === 'candidate applies twice (idempotent)' && c.status === 'PASS')).toBe(true)
    // Candidate ACL changes are rolled back, proving suite isolation.
    expect((await db.query("SELECT has_function_privilege('anon','public.is_approved_member(uuid)','EXECUTE') AS allowed")).rows[0].allowed).toBe(true)
  } finally { await db.close() }
}, 120000)
