import { describe, expect, it } from 'vitest'

import {
  DEAL_STAGES, TRANSITIONS, canPropose, canTransition, cleanDraft, cleanLink, describeEvent, formatBudget, groupByStage, milestoneReviewBlock,
  milestoneSubmitBlock, nextActions, parseAmount, proposalBlock, sideOf, stageBlock, stepperState, validateDetails, type StageContext,
} from '../deals-core'
import { createDealEngine, emptyDealState } from '../deals-engine'
import { createShowcaseDeals, SHOWCASE_THEM, SHOWCASE_YOU } from '../deals'
import { matchPage, parseVoiceCommand } from '../voice-commands'
import { QUICK_ACTIONS, DEFAULT_QUICK_ITEMS } from '../quick-menu'
import { destinationFor } from '../notifications-bell'

const U = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ctx = (over: Partial<StageContext> = {}): StageContext => ({ stage: 'interested', role: 'owner', ownerSide: 'buyer', sidesPresent: ['buyer', 'provider'], ...over })

describe('stage transitions', () => {
  it('follows the happy path and nothing skips ahead', () => {
    expect(canTransition('interested', 'proposal')).toBe(true)
    expect(canTransition('proposal', 'agreed')).toBe(true)
    expect(canTransition('agreed', 'in_progress')).toBe(true)
    expect(canTransition('in_progress', 'delivered')).toBe(true)
    expect(canTransition('delivered', 'closed')).toBe(true)
    expect(canTransition('interested', 'closed')).toBe(false)
    expect(canTransition('agreed', 'delivered')).toBe(false)
    expect(canTransition('proposal', 'in_progress')).toBe(false)
  })
  it('cancels from any open stage and never reopens a finished one', () => {
    for (const s of ['interested', 'proposal', 'agreed', 'in_progress', 'delivered', 'disputed'] as const) expect(canTransition(s, 'cancelled')).toBe(true)
    for (const s of DEAL_STAGES) { expect(canTransition('closed', s)).toBe(false); expect(canTransition('cancelled', s)).toBe(false) }
  })
  it('disputes only once work has started, and resolves back to work', () => {
    expect(DEAL_STAGES.filter(s => canTransition(s, 'disputed'))).toEqual(['in_progress', 'delivered'])
    expect(TRANSITIONS.disputed).toEqual(['in_progress', 'closed', 'cancelled'])
  })
  it('agrees terms only through a proposal', () => {
    expect(stageBlock(ctx({ stage: 'proposal' }), 'agreed')).toMatch(/accepting a proposal/)
    expect(nextActions(ctx({ stage: 'proposal' })).map(a => a.to)).toEqual(['cancelled'])
  })
  it('lets the provider mark delivery and the buyer close it', () => {
    expect(stageBlock(ctx({ stage: 'in_progress' }), 'delivered')).toMatch(/provider/)
    expect(stageBlock(ctx({ stage: 'in_progress', role: 'provider' }), 'delivered')).toBeNull()
    expect(stageBlock(ctx({ stage: 'delivered', role: 'provider' }), 'closed')).toMatch(/buyer/)
    expect(nextActions(ctx({ stage: 'delivered' })).filter(a => a.to === 'closed').map(a => a.outcome)).toEqual(['won', 'lost'])
    // Nobody on the other side yet: the owner may do it.
    expect(stageBlock(ctx({ stage: 'in_progress', sidesPresent: ['buyer'] }), 'delivered')).toBeNull()
  })
  it('keeps guests and outsiders from moving a deal', () => {
    expect(stageBlock(ctx({ role: 'guest' }), 'cancelled')).toMatch(/Only the people/)
    expect(nextActions(ctx({ role: null }))).toEqual([])
  })
  it('shows the stepper position, including after a side stage', () => {
    expect(stepperState('agreed').map(s => s.state)).toEqual(['done', 'done', 'current', 'ahead', 'ahead', 'ahead'])
    expect(stepperState('disputed', ['proposal', 'agreed', 'in_progress']).filter(s => s.state === 'done').length).toBe(4)
  })
})

describe('sides, proposals and milestones', () => {
  it('derives sides from roles', () => {
    expect(sideOf('owner', 'provider')).toBe('provider')
    expect(sideOf('buyer', 'provider')).toBe('buyer')
    expect(sideOf('guest', 'buyer')).toBeNull()
    expect(sideOf('introducer', 'buyer')).toBeNull()
  })
  it('never lets the author accept their own proposal', () => {
    const p = { id: 'p', author: U, status: 'submitted' as const, version: 1 }
    expect(proposalBlock(p, U, 'proposal', 'provider', 'provider', true)).toMatch(/own proposal/)
    expect(proposalBlock(p, 'other', 'proposal', 'provider', 'provider', true)).toMatch(/other side/)
    expect(proposalBlock(p, 'other', 'proposal', 'buyer', 'provider', true)).toBeNull()
    expect(proposalBlock({ ...p, status: 'superseded' }, 'other', 'proposal', 'buyer', 'provider', true)).toMatch(/already/)
    expect(canPropose('agreed', 'buyer')).toBe(false)
    expect(canPropose('interested', null)).toBe(false)
  })
  it('has the provider submit and the buyer accept milestones', () => {
    const m = { status: 'open' as const, submittedBy: null }
    expect(milestoneSubmitBlock(m, 'in_progress', 'buyer', 'owner', ['buyer', 'provider'])).toMatch(/provider submits/)
    expect(milestoneSubmitBlock(m, 'in_progress', 'provider', 'provider', ['buyer', 'provider'])).toBeNull()
    expect(milestoneSubmitBlock(m, 'interested', 'provider', 'provider', ['buyer', 'provider'])).toMatch(/agreed/)
    const s = { status: 'submitted' as const, submittedBy: 'prov' }
    expect(milestoneReviewBlock(s, 'prov', 'in_progress', 'provider', 'provider', ['buyer', 'provider'])).toMatch(/Someone else/)
    expect(milestoneReviewBlock(s, U, 'in_progress', 'buyer', 'owner', ['buyer', 'provider'])).toBeNull()
  })
})

describe('helpers', () => {
  it('validates the editable terms like the database', () => {
    const base = { title: 'CFO search', scope: '', deliverables: '', budgetLow: '40,000', budgetHigh: '60000', currency: 'usd', targetDate: '' }
    expect(validateDetails(base).patch).toMatchObject({ budget_low: 40000, budget_high: 60000, currency: 'USD', target_date: null })
    expect(validateDetails({ ...base, budgetLow: '70000' }).error).toMatch(/at least/)
    expect(validateDetails({ ...base, currency: 'dollars' }).error).toMatch(/three-letter/)
    expect(validateDetails({ ...base, title: 'x' }).error).toMatch(/title/)
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('-5')).toBe('invalid')
  })
  it('formats budgets honestly', () => {
    expect(formatBudget(null, null)).toBe('No budget set')
    expect(formatBudget(40000, 60000)).toBe('$40,000 – $60,000')
    expect(formatBudget(null, 5000)).toBe('Up to $5,000')
  })
  it('accepts only web links', () => {
    expect(cleanLink(' https://example.com/a ')).toBe('https://example.com/a')
    expect(cleanLink('javascript:alert(1)')).toBeNull()
  })
  it('keeps only real sources and real members in a draft', () => {
    expect(cleanDraft({ sourceKind: 'intro', sourceId: 'demo-1', title: ' T ', need: '', counterpartId: 'marcus-lee' }))
      .toMatchObject({ sourceKind: 'manual', sourceId: null, title: 'T', counterpartId: null })
    expect(cleanDraft({ sourceKind: 'thread', sourceId: U, title: 'T', need: '', counterpartId: U })).toMatchObject({ sourceKind: 'thread', sourceId: U, counterpartId: U })
  })
  it('groups rooms by stage in pipeline order', () => {
    const g = groupByStage([{ stage: 'closed' as const }, { stage: 'interested' as const }, { stage: 'interested' as const }])
    expect(g.map(x => [x.stage, x.rooms.length])).toEqual([['interested', 2], ['closed', 1]])
  })
  it('describes timeline events in plain words', () => {
    expect(describeEvent({ kind: 'stage_changed', detail: { from: 'delivered', to: 'closed', outcome: 'won' } }, 'You')).toBe('You moved the deal to Closed (Won).')
    expect(describeEvent({ kind: 'proposal_submitted', detail: { version: 2, amount: 48000 } }, 'Ana')).toBe('Ana sent proposal v2 for $48,000.')
  })
})

describe('local engine (showcase rules match the database)', () => {
  it('runs create → proposal → accept → milestone → deliver → close', () => {
    const state = emptyDealState()
    state.people = { buyer: 'Buyer', prov: 'Provider' }
    const e = createDealEngine(state)
    const room = e.create('buyer', { sourceKind: 'manual', sourceId: null, title: 'Pilot', need: 'Need', side: 'buyer', counterpart: 'prov' })
    expect(() => e.propose('prov', room, 'Too early', 10)).toThrow(/buyer or provider/)
    e.respond('prov', room, true)
    const p = e.propose('prov', room, 'Twelve weeks', 48000)
    expect(() => e.decide('prov', p, true)).toThrow(/own proposal/)
    expect(() => e.advance('buyer', room, 'agreed')).toThrow(/accepting a proposal/)
    e.decide('buyer', p, true)
    expect(state.rooms[0]!.stage).toBe('agreed')
    expect(() => e.advance('buyer', room, 'closed', '', 'won')).toThrow(/cannot move/)
    e.advance('buyer', room, 'in_progress')
    const m = e.addMilestone('buyer', room, 'Model', null)
    expect(() => e.submitMilestone('buyer', m)).toThrow(/provider submits/)
    e.submitMilestone('prov', m)
    e.reviewMilestone('buyer', m, true)
    expect(() => e.advance('buyer', room, 'delivered')).toThrow(/provider marks/)
    e.advance('prov', room, 'delivered')
    expect(() => e.advance('buyer', room, 'closed')).toThrow(/won or lost/)
    e.advance('buyer', room, 'closed', 'Done', 'won')
    expect(state.rooms[0]).toMatchObject({ stage: 'closed', outcome: 'won' })
    expect(state.events.map(x => x.kind)).toContain('milestone_accepted')
  })
  it('keeps invitees and outsiders out of the detail', async () => {
    const api = createShowcaseDeals()
    const list = await api.listMine()
    const id = list.data!.rooms[0]!.id
    expect((await api.loadRoom(id)).data?.proposals.length).toBe(1)
    api.as('stranger')
    expect((await api.loadRoom(id)).data).toBeNull()
    api.as(SHOWCASE_THEM)
    expect((await api.decide((await api.loadRoom(id)).data!.proposals[0]!.id, true)).error).toMatch(/own proposal/)
    api.as(SHOWCASE_YOU)
  })
})

describe('registration', () => {
  it('voice reaches Deals, and the CRM keeps its own words', () => {
    expect(matchPage('deals')).toBe('deals')
    expect(matchPage('my deals')).toBe('deals')
    expect(matchPage('engagements')).toBe('deals')
    expect(matchPage('pipeline')).toBe('crm')
    expect(parseVoiceCommand('go to deal rooms')).toEqual({ kind: 'navigate', page: 'deals', value: null })
    expect(parseVoiceCommand('start a deal with Ana', ['Ana Diaz'])).toEqual({ kind: 'start-deal', page: null, value: 'Ana Diaz' })
  })
  it('is in the quick-menu catalog but not the defaults', () => {
    expect(QUICK_ACTIONS.find(a => a.id === 'deals')?.target).toEqual({ kind: 'workspace', page: 'deals' })
    expect(DEFAULT_QUICK_ITEMS).not.toContain('deals')
  })
  it('sends deal notifications to Deals', () => {
    expect(destinationFor({ kind: 'deal_invite' })).toBe('deals')
    expect(destinationFor({ kind: 'deal_update' })).toBe('deals')
  })
})
