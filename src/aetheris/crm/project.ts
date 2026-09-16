/**
 * Linked-sheet projection.
 *
 * Grid never stores a second copy of CRM data. A linked sheet is rendered by
 * projecting canonical records through the template fields; writable fields go
 * back to the same record through `writeLinkedField`.
 */
import type { OperationalSnapshot } from './repo'
import type { LinkedEntity } from './types'

export interface NetworkContext {
  scoreTotal: number
  whyThem: string
  whyNow: string
  nextAction: string
  relationshipStatus: string
  introState: string
}

export type NetworkIndex = Record<string, NetworkContext>

export interface ProjectedRow {
  entityId: string
  values: Record<string, unknown>
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '')

export function projectRows(entity: LinkedEntity, snap: OperationalSnapshot, network: NetworkIndex): ProjectedRow[] {
  const ctx = (memberId: string | null) => (memberId ? network[memberId] : undefined)
  const companyName = (id: string | null) => snap.companies.find(c => c.id === id)?.name ?? ''
  const personName = (id: string | null) => snap.people.find(p => p.id === id)?.fullName ?? ''

  if (entity === 'crm_people') {
    return snap.people.filter(p => !p.archived).map(p => {
      const n = ctx(p.memberId)
      return {
        entityId: p.id,
        values: {
          fullName: p.fullName, title: p.title,
          companyName: p.companyName || companyName(p.companyId),
          lifecycle: p.lifecycle, email: p.email, phone: p.phone, location: p.location,
          connectionScore: n?.scoreTotal ?? '', whyNow: n?.whyNow ?? '',
          lastActivity: day(p.lastActivityAt),
        },
      }
    })
  }

  if (entity === 'crm_companies') {
    return snap.companies.filter(c => !c.archived).map(c => ({
      entityId: c.id,
      values: {
        name: c.name, industry: c.industry, location: c.location, website: c.website,
        employees: c.employees,
        peopleCount: snap.people.filter(p => p.companyId === c.id && !p.archived).length,
        openValue: snap.opportunities
          .filter(o => o.companyId === c.id && o.status === 'open' && !o.archived)
          .reduce((sum, o) => sum + o.amount, 0),
      },
    }))
  }

  if (entity === 'crm_opportunities') {
    return snap.opportunities.filter(o => !o.archived).map(o => ({
      entityId: o.id,
      values: {
        name: o.name, personName: personName(o.personId), companyName: companyName(o.companyId),
        stageName: o.stageName, amount: o.amount, probability: o.probability,
        expectedClose: o.expectedClose ?? '', nextAction: o.nextAction,
      },
    }))
  }

  if (entity === 'crm_tasks') {
    return snap.tasks.map(t => ({
      entityId: t.id,
      values: {
        title: t.title, status: t.status, priority: t.priority, dueAt: day(t.dueAt),
        personName: personName(t.personId),
        opportunityName: snap.opportunities.find(o => o.id === t.opportunityId)?.name ?? '',
      },
    }))
  }

  if (entity === 'relationship_intelligence') {
    return snap.people.filter(p => !p.archived && p.memberId).map(p => {
      const n = ctx(p.memberId)
      return {
        entityId: p.id,
        values: {
          fullName: p.fullName, relationshipStatus: n?.relationshipStatus ?? 'unknown',
          connectionScore: n?.scoreTotal ?? '', whyThem: n?.whyThem ?? '',
          whyNow: n?.whyNow ?? '', nextAction: n?.nextAction ?? '',
        },
      }
    })
  }

  // introductions
  return snap.people.filter(p => !p.archived && p.memberId).map(p => {
    const n = ctx(p.memberId)
    return {
      entityId: p.id,
      values: {
        fullName: p.fullName, introState: n?.introState ?? 'none',
        companyName: p.companyName || companyName(p.companyId),
        whyNow: n?.whyNow ?? '',
      },
    }
  })
}

/** Columns Grid may write back to for a given linked entity. */
export const writableKeys: Record<LinkedEntity, string[]> = {
  crm_people: ['fullName', 'title', 'companyName', 'lifecycle', 'email', 'phone', 'location'],
  crm_companies: ['name', 'industry', 'location', 'website', 'employees'],
  crm_opportunities: ['name', 'personName', 'companyName', 'stageName', 'amount', 'probability', 'expectedClose', 'nextAction'],
  crm_tasks: ['title', 'status', 'priority', 'dueAt', 'personName', 'opportunityName'],
  relationship_intelligence: [],
  introductions: [],
}
