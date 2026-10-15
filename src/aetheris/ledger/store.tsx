/**
 * Expanded workspace store.
 *
 * The workspace is built from the account's own basic-CRM records plus a
 * deterministic starter set derived from the member's identity. Edits made inside
 * the workspace (stage moves, activity completion, new rows) are kept as a patch
 * layer saved per account in this browser, so they survive a reload without
 * touching the shared CRM records. The patch is also saved to the member's account
 * (see ../sync/workspace-sync) so it follows them to other devices.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useOps } from '../crm/store'
import { currentAccountId } from '../crm/repo'
import { useNetwork } from '../store'
import { buildLedger, type LedgerSource } from './build'
import type { DealStage, Ledger, LedgerActivity, LedgerDeal, LedgerLead } from './types'
import { STAGE_PROBABILITY } from './types'
import { notifyWorkspaceChange, registerSyncedStore } from '../sync/workspace-sync'

interface Patch {
  deals: Record<string, Partial<LedgerDeal>>
  activities: Record<string, Partial<LedgerActivity>>
  leads: Record<string, Partial<LedgerLead>>
  newLeads: LedgerLead[]
  newActivities: LedgerActivity[]
}

const emptyPatch: Patch = { deals: {}, activities: {}, leads: {}, newLeads: [], newActivities: [] }

const keyFor = (accountId: string) => `aetheris.ledger.patch.${accountId || 'local'}`

function readPatch(accountId: string): Patch {
  if (typeof window === 'undefined') return emptyPatch
  try {
    const raw = window.localStorage.getItem(keyFor(accountId))
    if (!raw) return emptyPatch
    return { ...emptyPatch, ...(JSON.parse(raw) as Partial<Patch>) }
  } catch {
    return emptyPatch
  }
}

function writePatch(accountId: string, patch: Patch) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(keyFor(accountId), JSON.stringify(patch))
  } catch {
    /* storage full or blocked — the workspace still works for this session */
  }
}

export interface LedgerApi {
  ready: boolean
  ledger: Ledger
  /** Number of rows carried through from the basic CRM. */
  realCount: number
  moveDeal: (id: string, stage: DealStage) => void
  setDealValue: (id: string, value: number) => void
  toggleActivity: (id: string) => void
  addActivity: (activity: Omit<LedgerActivity, 'id'>) => void
  setLeadStatus: (id: string, status: LedgerLead['status']) => void
  addLead: (lead: Omit<LedgerLead, 'id' | 'ownerId'>) => void
  resetWorkspace: () => void
  companyName: (id: string) => string
  contactName: (id: string) => string
  ownerName: (id: string) => string
  productName: (id: string) => string
}

const LedgerCtx = createContext<LedgerApi | null>(null)

export function useLedger() {
  const ctx = useContext(LedgerCtx)
  if (!ctx) throw new Error('useLedger must be used inside LedgerProvider')
  return ctx
}

export function LedgerProvider({ children }: { children: ReactNode }) {
  const ops = useOps()
  const net = useNetwork()
  const [accountId, setAccountId] = useState('')
  const [patch, setPatch] = useState<Patch>(emptyPatch)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let live = true
    void (async () => {
      const owner = (await currentAccountId()) ?? ''
      if (!live) return
      setAccountId(owner)
      setPatch(readPatch(owner))
      setLoaded(true)
      if (owner) {
        registerSyncedStore({
          key: 'aetheris.ledger.patch', localKey: keyFor(owner),
          apply: data => {
            const next = data && typeof data === 'object' ? { ...emptyPatch, ...(data as Partial<Patch>) } : emptyPatch
            writePatch(owner, next)
            if (live) setPatch(next)
          },
        })
      }
    })()
    return () => { live = false }
  }, [])

  const savePatch = useCallback((next: Patch) => {
    setPatch(next)
    writePatch(accountId, next)
    if (accountId) notifyWorkspaceChange('aetheris.ledger.patch')
  }, [accountId])

  const base = useMemo<Ledger>(() => {
    const profile = net.profile
    const source: LedgerSource = {
      companies: ops.companies.filter(c => !c.archived).map(c => ({
        id: c.id, name: c.name, industry: c.industry, location: c.location, website: c.website,
        employees: c.employees, revenueBand: c.revenueBand, createdAt: c.createdAt,
      })),
      people: ops.people.filter(p => !p.archived).map(p => ({
        id: p.id, fullName: p.fullName, email: p.email, phone: p.phone, title: p.title,
        companyId: p.companyId, companyName: p.companyName, lifecycle: p.lifecycle,
        lastActivityAt: p.lastActivityAt, createdAt: p.createdAt, source: p.source,
      })),
      opportunities: ops.opportunities.filter(o => !o.archived).map(o => ({
        id: o.id, name: o.name, companyId: o.companyId, personId: o.personId, amount: o.amount,
        probability: o.probability, status: o.status, stageName: o.stageName,
        expectedCloseAt: o.expectedClose, createdAt: o.createdAt,
      })),
      tasks: ops.tasks.map(t => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority,
        dueAt: t.dueAt, companyId: t.companyId, opportunityId: t.opportunityId,
      })),
    }
    return buildLedger({
      accountId: accountId || profile.name || 'local',
      name: profile.name || 'You',
      email: '',
      company: profile.company || '',
      industry: profile.industries?.[0] || profile.focus || '',
      location: profile.location || '',
      title: profile.title || '',
    }, source)
  }, [accountId, net.profile, ops.companies, ops.people, ops.opportunities, ops.tasks])

  const ledger = useMemo<Ledger>(() => {
    const deals = base.deals.map(d => (patch.deals[d.id] ? { ...d, ...patch.deals[d.id] } : d))
    const activities = [...patch.newActivities, ...base.activities]
      .map(a => (patch.activities[a.id] ? { ...a, ...patch.activities[a.id] } : a))
    const leads = [...patch.newLeads, ...base.leads]
      .map(l => (patch.leads[l.id] ? { ...l, ...patch.leads[l.id] } : l))
    return { ...base, deals, activities, leads }
  }, [base, patch])

  const api = useMemo<LedgerApi>(() => {
    const lookup = <T extends { id: string }>(rows: T[], id: string) => rows.find(r => r.id === id)
    return {
      ready: loaded && ops.ready,
      ledger,
      realCount: base.companies.filter(c => c.crmId).length
        + base.contacts.filter(c => c.crmId).length
        + base.deals.filter(d => d.crmId).length,
      moveDeal: (id, stage) => savePatch({
        ...patch,
        deals: { ...patch.deals, [id]: { ...patch.deals[id], stage, probability: STAGE_PROBABILITY[stage] } },
      }),
      setDealValue: (id, value) => savePatch({
        ...patch, deals: { ...patch.deals, [id]: { ...patch.deals[id], value } },
      }),
      toggleActivity: id => {
        const current = ledger.activities.find(a => a.id === id)
        savePatch({ ...patch, activities: { ...patch.activities, [id]: { ...patch.activities[id], done: !current?.done } } })
      },
      addActivity: activity => savePatch({
        ...patch,
        newActivities: [{ ...activity, id: `act_new_${Date.now().toString(36)}` }, ...patch.newActivities],
      }),
      setLeadStatus: (id, status) => savePatch({
        ...patch, leads: { ...patch.leads, [id]: { ...patch.leads[id], status } },
      }),
      addLead: lead => savePatch({
        ...patch,
        newLeads: [{ ...lead, id: `led_new_${Date.now().toString(36)}`, ownerId: 'me' }, ...patch.newLeads],
      }),
      resetWorkspace: () => savePatch(emptyPatch),
      companyName: id => lookup(ledger.companies, id)?.name ?? '—',
      contactName: id => {
        const c = lookup(ledger.contacts, id)
        return c ? `${c.firstName} ${c.lastName}`.trim() : '—'
      },
      ownerName: id => lookup(ledger.users, id)?.name ?? '—',
      productName: id => lookup(ledger.products, id)?.name ?? '—',
    }
  }, [base, ledger, loaded, ops.ready, patch, savePatch])

  return <LedgerCtx.Provider value={api}>{children}</LedgerCtx.Provider>
}
