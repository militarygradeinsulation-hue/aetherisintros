// Pure, offline planning only: no database connection or ledger mutation.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const collisionTags = ['0082_business_lobby', '0090_shared_opportunity_exchange', '0092_basic_executive_membership']
const appliedBusinessPosts = '0062_business_posts'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

export function validatePending(entries, pending) {
  if (!Array.isArray(pending) || pending.some(tag => typeof tag !== 'string')) throw Error('Pending tags must be an array of journal tags')
  let previous = -1
  for (const tag of pending) {
    const index = entries.findIndex(e => e.tag === tag)
    if (index < 0) throw Error('Recovery tags must be present in the unchanged migration journal')
    if (tag === appliedBusinessPosts) throw Error('0062 is already recorded; never replay or relabel it')
    if (collisionTags.includes(tag)) throw Error('Comment-only ledger collisions require separate forward-only reconciliation: ' + tag)
    if (index <= previous) throw Error('Pending tags must be unique and in journal order')
    previous = index
  }
}

// Input is the complete raw Drizzle ledger SELECT id, hash, created_at (no app rows).
// Completeness/target identity still require operator evidence; this cannot prove them.
export function reconciliationPlan({ repo, ledger, pending }) {
  const entries = JSON.parse(readFileSync(join(repo, 'drizzle/migrations/meta/_journal.json'), 'utf8')).entries
  validatePending(entries, pending)
  if (!Array.isArray(ledger) || ledger.length === 0) throw Error('A nonempty complete Drizzle ledger export is required')
  const ids = new Set()
  const timestamp = value => {
    if (!/^[0-9]+$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw Error('Invalid ledger timestamp')
    return Number(value)
  }
  const rows = ledger.map(row => {
    if (!row || !/^[0-9]+$/.test(String(row.id)) || ids.has(String(row.id)) || !/^[a-f0-9]{64}$/.test(row.hash)) throw Error('Invalid or duplicate ledger row')
    ids.add(String(row.id))
    return { id: String(row.id), hash: row.hash, created_at: timestamp(row.created_at) }
  })
  const latest = Math.max(...rows.map(r => r.created_at))
  const migrations = entries.map(entry => {
    const sha256 = hash(readFileSync(join(repo, 'drizzle/migrations', entry.tag + '.sql')))
    const matching = rows.filter(r => r.hash === sha256)
    const atTime = rows.filter(r => r.created_at === entry.when)
    const ambiguous = matching.length > 1 || atTime.length > 1 || (matching.length === 1 && atTime.some(r => r.hash !== sha256))
    const status = ambiguous ? 'AMBIGUOUS' : matching.length ? 'APPLIED' : atTime.length ? 'HASH_CONFLICT' : 'PENDING'
    return { tag: entry.tag, sha256, journalTimestamp: entry.when, status, ledgerIds: matching.map(r => r.id), timestampLedgerIds: atTime.map(r => r.id), outOfOrder: status === 'PENDING' && entry.when < latest }
  })
  const selected = migrations.filter(m => pending.includes(m.tag))
  const blockers = selected.filter(m => m.status !== 'PENDING').map(m => `${m.tag}: ${m.status}; excluded from recovery`)
  // Preserve every mismatch, even outside the selected recovery range.
  for (const m of migrations.filter(m => ['HASH_CONFLICT', 'AMBIGUOUS'].includes(m.status))) blockers.push(`${m.tag}: ${m.status}; compare authoritative definitions and prepare a new forward repair`)
  const knownHashes = new Set(migrations.map(m => m.sha256))
  const unmatchedLedgerRows = rows.filter(r => !knownHashes.has(r.hash))
  for (const row of unmatchedLedgerRows.filter(r => !entries.some(e => e.when === r.created_at))) blockers.push(`Ledger row ${row.id}: unknown hash and timestamp; reconcile provenance before activation`)
  return {
    productionActivationAllowed: false,
    provenance: 'Supplied ledger export; identity, completeness, freshness and backup NOT verified',
    ledgerSha256: hash(JSON.stringify(ledger)),
    migrations, selected, unmatchedLedgerRows, blockers,
    requiresForwardOnlyRecovery: selected.some(m => m.outOfOrder),
    limitations: ['No SQL or ledger writes generated', 'Out-of-order entries cannot be activated by a normal timestamp-based migrator', 'Hash matches do not certify schema, RLS, grants or workflows', 'Unknown hashes are retained; comment-only provenance requires separate historical evidence'],
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const value = flag => { const i = args.indexOf(flag); if (i < 0 || !args[i + 1] || args[i + 1].startsWith('--')) throw Error('Required: ' + flag); return args[i + 1] }
  const report = reconciliationPlan({ repo: args.includes('--repo') ? value('--repo') : '.', ledger: JSON.parse(readFileSync(value('--ledger'), 'utf8')), pending: JSON.parse(readFileSync(value('--pending'), 'utf8')) })
  console.log(JSON.stringify(report, null, 2))
  if (report.blockers.length) process.exitCode = 2
}
