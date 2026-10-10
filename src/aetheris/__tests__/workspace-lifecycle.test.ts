import { describe, expect, it } from 'vitest'
import {
  WORKSPACE_STATUSES, canDecideProposal, canEditDraft, canSubmitProposal, canTransition, formatBudget, isFinished, parseBudget, roleMay, stageActions, validateWorkspaceInput,
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
  it('keeps proposal, agreed and accepted out of plain moves', () => {
    for (const st of WORKSPACE_STATUSES) for (const role of ['owner', 'counterparty'] as const)
      for (const a of stageActions(st, role)) if (a.kind === 'move') expect(['proposal', 'agreed', 'accepted']).not.toContain(a.to)
  })
  it('lets the owner move work forward but never accept delivery', () => {
    expect(stageActions('qualified', 'owner')).toEqual([{ kind: 'move', to: 'cancelled' }])
    expect(stageActions('agreed', 'owner')).toContainEqual({ kind: 'move', to: 'in_progress' })
    expect(stageActions('in_progress', 'owner')).toContainEqual({ kind: 'move', to: 'delivered' })
    expect(stageActions('delivered', 'owner')).not.toContainEqual({ kind: 'accept_delivery' })
    expect(stageActions('accepted', 'owner')).toEqual([{ kind: 'move', to: 'closed' }])
  })
  it('lets only the counterparty accept delivery, and nothing else at other stages', () => {
    expect(stageActions('delivered', 'counterparty')).toEqual([{ kind: 'accept_delivery' }])
    expect(stageActions('in_progress', 'counterparty')).toEqual([])
    expect(stageActions('proposal', null)).toEqual([])
  })
  it('encodes the role matrix', () => {
    expect(roleMay('owner', 'approve_proposal')).toBe(false)
    expect(roleMay('owner', 'accept_delivery')).toBe(false)
    expect(roleMay('counterparty', 'approve_proposal')).toBe(true)
    expect(roleMay('counterparty', 'submit_proposal')).toBe(false)
    expect(roleMay('counterparty', 'manage_roster')).toBe(false)
    expect(roleMay('counterparty', 'step') && roleMay('owner', 'step')).toBe(true)
    expect(roleMay(null, 'step')).toBe(false)
  })
  it('gates proposals and draft edits', () => {
    expect(canSubmitProposal('qualified', 'owner')).toBe(true)
    expect(canSubmitProposal('in_progress', 'owner')).toBe(true)
    expect(canSubmitProposal('accepted', 'owner')).toBe(false)
    expect(canSubmitProposal('qualified', 'counterparty')).toBe(false)
    expect(canEditDraft('qualified', 'owner')).toBe(true)
    expect(canEditDraft('agreed', 'owner')).toBe(false)
    expect(canDecideProposal('counterparty', true)).toBe(true)
    expect(canDecideProposal('counterparty', false)).toBe(false)
    expect(canDecideProposal('owner', true)).toBe(false)
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
