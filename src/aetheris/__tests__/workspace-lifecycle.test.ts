import { describe, expect, it } from 'vitest'
import {
  WORKSPACE_STATUSES, canTransition, formatBudget, isFinished, milestoneFor, parseBudget, stageActions, validateWorkspaceInput,
  type WorkspaceInput, type WorkspaceStatus,
} from '../workspaces/lifecycle'

const base: WorkspaceInput = { title: 'Logistics audit', scope: '', nextAction: '', budget: '', currency: 'usd', dueOn: '' }

describe('workspace lifecycle', () => {
  it('lists the eight stages in order', () => {
    expect([...WORKSPACE_STATUSES]).toEqual(['qualified', 'proposal', 'agreed', 'in_progress', 'delivered', 'accepted', 'closed', 'cancelled'])
  })
  it('only allows the documented moves', () => {
    expect(canTransition('qualified', 'proposal')).toBe(true)
    expect(canTransition('qualified', 'delivered')).toBe(false)
    expect(canTransition('proposal', 'qualified')).toBe(true)
    expect(canTransition('delivered', 'in_progress')).toBe(true)
    expect(canTransition('accepted', 'cancelled')).toBe(false)
    expect(canTransition('accepted', 'closed')).toBe(true)
  })
  it('treats closed and cancelled as terminal', () => {
    for (const to of WORKSPACE_STATUSES) { expect(canTransition('closed', to)).toBe(false); expect(canTransition('cancelled', to)).toBe(false) }
    expect(isFinished('closed')).toBe(true)
    expect(isFinished('in_progress')).toBe(false)
  })
  it('never lets a stage move to itself', () => {
    for (const s of WORKSPACE_STATUSES) expect(canTransition(s, s)).toBe(false)
  })
  it('flags the milestones that need every participant', () => {
    expect(milestoneFor('agreed')).toBe('agreed')
    expect(milestoneFor('accepted')).toBe('accepted')
    expect(milestoneFor('delivered')).toBeNull()
  })
  it('offers owners moves but not agreed/accepted, and everyone a confirmation', () => {
    expect(stageActions('qualified', 'owner')).toEqual([{ kind: 'move', to: 'proposal' }, { kind: 'move', to: 'cancelled' }])
    expect(stageActions('proposal', 'owner')).toContainEqual({ kind: 'confirm', milestone: 'agreed' })
    expect(stageActions('proposal', 'owner')).not.toContainEqual({ kind: 'move', to: 'agreed' })
    expect(stageActions('proposal', 'collaborator')).toEqual([{ kind: 'confirm', milestone: 'agreed' }])
    expect(stageActions('delivered', 'collaborator')).toEqual([{ kind: 'confirm', milestone: 'accepted' }])
    expect(stageActions('in_progress', 'collaborator')).toEqual([])
    expect(stageActions('proposal', null)).toEqual([])
  })
  it('stops offering a confirmation already given', () => {
    expect(stageActions('proposal', 'collaborator', ['agreed'])).toEqual([])
  })
  it('offers nothing once finished', () => {
    for (const s of ['closed', 'cancelled'] as WorkspaceStatus[]) expect(stageActions(s, 'owner')).toEqual([])
  })
})

describe('workspace input', () => {
  it('parses budgets into cents', () => {
    expect(parseBudget('')).toBeNull()
    expect(parseBudget('12,500.50')).toBe(1250050)
    expect(parseBudget('0')).toBe(0)
    expect(parseBudget('-5')).toBeUndefined()
    expect(parseBudget('1e9')).toBeUndefined()
    expect(parseBudget('12.345')).toBeUndefined()
    expect(parseBudget('9999999999999')).toBeUndefined()
  })
  it('accepts a minimal workspace', () => {
    const r = validateWorkspaceInput(base)
    expect(r).toEqual({ ok: true, value: { title: 'Logistics audit', scope: '', nextAction: '', budgetCents: null, currency: null, dueOn: null } })
  })
  it('requires a real title', () => {
    const r = validateWorkspaceInput({ ...base, title: ' ab ' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.title).toBeTruthy()
  })
  it('requires a currency with a budget, and drops it without one', () => {
    const bad = validateWorkspaceInput({ ...base, budget: '5000', currency: '' })
    expect(bad.ok).toBe(false)
    const ok = validateWorkspaceInput({ ...base, budget: '5000', currency: 'EUR' })
    expect(ok.ok && ok.value).toMatchObject({ budgetCents: 500000, currency: 'eur' })
    const none = validateWorkspaceInput({ ...base, currency: 'eur' })
    expect(none.ok && none.value.currency).toBeNull()
  })
  it('rejects impossible dates', () => {
    expect(validateWorkspaceInput({ ...base, dueOn: '2026-02-30' }).ok).toBe(false)
    expect(validateWorkspaceInput({ ...base, dueOn: 'tomorrow' }).ok).toBe(false)
    const r = validateWorkspaceInput({ ...base, dueOn: '2026-12-01' })
    expect(r.ok && r.value.dueOn).toBe('2026-12-01')
  })
  it('limits long text', () => {
    expect(validateWorkspaceInput({ ...base, scope: 'x'.repeat(4001) }).ok).toBe(false)
    expect(validateWorkspaceInput({ ...base, nextAction: 'x'.repeat(501) }).ok).toBe(false)
  })
  it('formats budgets', () => {
    expect(formatBudget(null, null)).toBe('No budget set')
    expect(formatBudget(1250050, 'usd')).toContain('12,500.50')
  })
})
