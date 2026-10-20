// DRY RUN ONLY, disposable PGlite. Applies 0058-0061 on top of a structure-only copy of the
// live public schema (see scripts/security-harness/README.md for producing /tmp/public_schema.sql)
// and reports which statements fail. Never connects to the live database.
// cp scripts/security-harness/load.ts scripts/recovery/dry-run-0058-0061.ts /tmp/rlsh && cd /tmp/rlsh && bun dry-run-0058-0061.ts /dev-server
import { readFileSync, existsSync } from 'fs'
import { makeDb } from './load.ts'
const repo = process.argv[2] ?? '/dev-server'
if (!existsSync('/tmp/public_schema.sql')) { console.log('BLOCKED: no structure-only schema copy at /tmp/public_schema.sql'); process.exit(2) }
const { db, fails } = await makeDb()
console.log('baseline load failures:', fails.length)
for (const f of ['0058_deal_rooms', '0059_deal_room_idempotency', '0060_app_error_rate_limit_index', '0061_member_directory_stats']) {
  try { await db.exec('BEGIN;' + readFileSync(`${repo}/drizzle/migrations/${f}.sql`, 'utf8') + ';COMMIT;'); console.log('APPLIES:', f) }
  catch (e: any) { await db.exec('ROLLBACK').catch(() => {}); console.log('FAILS:', f, '-', e.message) }
}
