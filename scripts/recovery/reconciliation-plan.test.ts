import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { reconciliationPlan, validatePending, collisionTags } from './reconciliation-plan.mjs'

const repo = resolve(import.meta.dirname, '../..')
const entries = JSON.parse(readFileSync(join(repo, 'drizzle/migrations/meta/_journal.json'), 'utf8')).entries
const pending = JSON.parse(readFileSync(join(repo, 'docs/release-safety/pending-0058-0078.json'), 'utf8'))
const row = (tag: string, id = 1, when?: number) => {
  const entry = entries.find((e: any) => e.tag === tag)
  return { id, hash: createHash('sha256').update(readFileSync(join(repo, 'drizzle/migrations', tag + '.sql'))).digest('hex'), created_at: when ?? entry.when }
}
const posts = '0062_business_posts'

describe('offline forward-only reconciliation planning', () => {
  it('keeps the dated 20-item recovery order and skips recorded 0062 at another timestamp', () => {
    const plan = reconciliationPlan({ repo, ledger: [row(posts, 58, 1), row('0094_icp_guard_review_history', 102)], pending })
    expect(plan.selected).toHaveLength(20)
    expect(plan.selected.every((m: any) => m.status === 'PENDING' && m.outOfOrder)).toBe(true)
    expect(plan.migrations.find((m: any) => m.tag === posts)?.status).toBe('APPLIED')
    expect(plan.requiresForwardOnlyRecovery).toBe(true)
    expect(plan.productionActivationAllowed).toBe(false)
    expect(plan.blockers).toEqual([])
  })

  it('rejects 0062, collisions, duplicate, reversed and unjournaled inputs', () => {
    for (const tags of [[posts], ...collisionTags.map((t: string) => [t]), [pending[0], pending[0]], [pending[1], pending[0]], ['../outside']]) {
      expect(() => validatePending(entries, tags)).toThrow()
    }
  })

  it('excludes exact-hash matches anywhere in the ledger from pending recovery', () => {
    const plan = reconciliationPlan({ repo, ledger: [row(pending[0], 1, 1)], pending })
    expect(plan.selected[0].status).toBe('APPLIED')
    expect(plan.blockers[0]).toContain('excluded from recovery')
  })

  it('retains comment-only hash collisions separately without treating them as executed SQL', () => {
    const ledger = collisionTags.map((tag: string, i: number) => ({ ...row(tag, i + 1), hash: String(i + 1).repeat(64) }))
    const plan = reconciliationPlan({ repo, ledger, pending })
    expect(plan.migrations.filter((m: any) => m.status === 'HASH_CONFLICT').map((m: any) => m.tag)).toEqual(collisionTags)
    expect(plan.unmatchedLedgerRows).toHaveLength(3)
    expect(plan.blockers).toHaveLength(3)
  })

  it('fails closed on duplicate hashes, timestamp collisions and conflicting evidence', () => {
    const a = row(posts)
    for (const ledger of [[a, { ...a, id: 2, created_at: 1 }], [a, { ...a, id: 2, hash: 'a'.repeat(64) }], [{ ...a, created_at: 1 }, { ...a, id: 2, hash: 'b'.repeat(64) }]]) {
      const plan = reconciliationPlan({ repo, ledger, pending })
      expect(plan.migrations.find((m: any) => m.tag === posts)?.status).toBe('AMBIGUOUS')
      expect(plan.blockers.length).toBeGreaterThan(0)
    }
  })

  it('rejects malformed, empty and duplicate-ID ledger exports', () => {
    const a = row(posts)
    for (const ledger of [[], [a, a], [{ ...a, hash: 'not-a-hash' }], [{ ...a, created_at: null }], [{ ...a, created_at: '9007199254740993' }]]) {
      expect(() => reconciliationPlan({ repo, ledger, pending })).toThrow()
    }
  })

  it('retains unknown ledger history as a blocker rather than silently discarding it', () => {
    const plan = reconciliationPlan({ repo, ledger: [{ id: 1, hash: 'c'.repeat(64), created_at: 1 }], pending })
    expect(plan.unmatchedLedgerRows).toHaveLength(1)
    expect(plan.blockers[0]).toContain('unknown hash and timestamp')
  })
})
