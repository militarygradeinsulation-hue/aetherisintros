/**
 * Operational store — the single account-scoped graph behind CRM and Grid.
 *
 * Once and done: a person, company, opportunity, task or value is entered once
 * and every surface reads it from here. Mutations write to Supabase, append an
 * event to the ledger, then refresh the shared snapshot so CRM, Grid and Intros
 * all show the change immediately.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  activityRepo, columnRepo, companyRepo, currentAccountId, ensureDefaultPipeline, emptySnapshot, loadSnapshot, logEvent,
  noteRepo, opportunityRepo, personRepo, rowRepo, sheetRepo, taskRepo, viewRepo, workbookRepo,
  type OperationalSnapshot,
} from './repo'
import { blankColumns, templateById, type LinkedField } from './linked'
import type {
  CrmCompany, CrmOpportunity, CrmPerson, CrmTask, GridColumn, GridSheet, GridWorkbook, ID, LinkedEntity,
} from './types'

export interface OpsApi extends OperationalSnapshot {
  ready: boolean
  /** True once an account session is available; private records need one. */
  signedIn: boolean
  /** Plain-language reason the last save failed, if it did. */
  lastError: () => string
  refresh: () => Promise<void>
  /* people */
  createPerson: (p: Partial<CrmPerson>) => Promise<CrmPerson | null>
  updatePerson: (id: ID, p: Partial<CrmPerson>) => Promise<void>
  archivePerson: (id: ID) => Promise<void>
  personForMember: (memberId: string) => CrmPerson | undefined
  addMemberToCrm: (member: { id: string; name: string; title?: string; company?: string; location?: string }) => Promise<CrmPerson | null>
  /* companies */
  createCompany: (p: Partial<CrmCompany>) => Promise<CrmCompany | null>
  updateCompany: (id: ID, p: Partial<CrmCompany>) => Promise<void>
  archiveCompany: (id: ID) => Promise<void>
  companyByName: (name: string) => CrmCompany | undefined
  ensureCompany: (name: string) => Promise<CrmCompany | null>
  /* opportunities */
  createOpportunity: (p: Partial<CrmOpportunity>) => Promise<CrmOpportunity | null>
  updateOpportunity: (id: ID, p: Partial<CrmOpportunity>) => Promise<void>
  archiveOpportunity: (id: ID) => Promise<void>
  moveOpportunity: (id: ID, stageId: ID) => Promise<void>
  /* tasks + activities + notes */
  createTask: (p: Partial<CrmTask>) => Promise<CrmTask | null>
  updateTask: (id: ID, p: Partial<CrmTask>) => Promise<void>
  removeTask: (id: ID) => Promise<void>
  logActivity: (p: Partial<import('./types').CrmActivity>) => Promise<void>
  addNote: (entityType: string, entityId: ID, body: string) => Promise<void>
  removeNote: (id: ID) => Promise<void>
  /* grid */
  createWorkbook: (name: string, description?: string) => Promise<GridWorkbook | null>
  renameWorkbook: (id: ID, name: string) => Promise<void>
  archiveWorkbook: (id: ID) => Promise<void>
  createSheet: (workbookId: ID, name: string, template: string) => Promise<GridSheet | null>
  renameSheet: (id: ID, name: string) => Promise<void>
  duplicateSheet: (id: ID) => Promise<GridSheet | null>
  archiveSheet: (id: ID) => Promise<void>
  updateSheetConfig: (id: ID, config: GridSheet['config']) => Promise<void>
  addColumn: (sheetId: ID, name: string, type: GridColumn['type']) => Promise<void>
  updateColumn: (id: ID, p: Partial<GridColumn>) => Promise<void>
  removeColumn: (id: ID) => Promise<void>
  addRow: (sheetId: ID, values?: Record<string, unknown>) => Promise<void>
  addRows: (sheetId: ID, rows: Array<Record<string, unknown>>) => Promise<void>
  setCell: (rowId: ID, key: string, value: unknown) => Promise<void>
  removeRow: (id: ID) => Promise<void>
  saveView: (sheetId: ID, name: string, config: Record<string, unknown>) => Promise<void>
  removeView: (id: ID) => Promise<void>
  /* linked writes */
  writeLinkedField: (entityType: LinkedEntity, entityId: ID, key: string, value: unknown) => Promise<void>
  createLinkedRecord: (entityType: LinkedEntity, primary: string) => Promise<void>
}

const OpsCtx = createContext<OpsApi | null>(null)

export function useOps() {
  const ctx = useContext(OpsCtx)
  if (!ctx) throw new Error('useOps must be used inside OpsProvider')
  return ctx
}

const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `c${Date.now().toString(36)}`

export function OpsProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<OperationalSnapshot>(emptySnapshot)
  const [ready, setReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  const refresh = useCallback(async () => {
    const next = await loadSnapshot()
    setSnap(next)
    setReady(true)
  }, [])

  useEffect(() => {
    let live = true
    void (async () => {
      // Signed-out visitors (landing, /demo) have no private account layer to load.
      const owner = await currentAccountId()
      if (!owner) { if (live) setReady(true); return }
      await ensureDefaultPipeline()
      const next = await loadSnapshot()
      if (!live) return
      setSnap(next)
      setReady(true)
    })()
    return () => { live = false }
  }, [])

  const api = useMemo<OpsApi>(() => {
    const after = async (entityType: string, entityId: string, event: string, summary: string) => {
      await logEvent(entityType, entityId, event, summary)
      await refresh()
    }

    const stageFor = (id: ID | null) => snap.stages.find(s => s.id === id)
    const defaultPipeline = snap.pipelines[0]
    const firstStage = snap.stages.filter(s => s.pipelineId === defaultPipeline?.id).sort((a, b) => a.position - b.position)[0]

    const companyByName = (name: string) =>
      snap.companies.find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase())

    const ensureCompany = async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return null
      const existing = companyByName(trimmed)
      if (existing) return existing
      const created = await companyRepo.create({ name: trimmed })
      if (created) await after('crm_company', created.id, 'created', `Company ${created.name} created`)
      return created
    }

    const personForMember = (memberId: string) => snap.people.find(p => p.memberId === memberId)

    return {
      ...snap,
      ready,
      refresh,

      /* ------------------------------------------------------------- people */
      createPerson: async p => {
        const companyId = p.companyId ?? (p.companyName ? (await ensureCompany(p.companyName))?.id ?? null : null)
        const created = await personRepo.create({ ...p, companyId })
        if (created) await after('crm_person', created.id, 'created', `${created.fullName} added to CRM`)
        return created
      },
      updatePerson: async (id, p) => {
        const patchable = { ...p }
        if (p.companyName !== undefined && p.companyId === undefined) {
          patchable.companyId = p.companyName ? (await ensureCompany(p.companyName))?.id ?? null : null
        }
        await personRepo.update(id, patchable)
        await after('crm_person', id, 'updated', `Person updated: ${Object.keys(p).join(', ')}`)
      },
      archivePerson: async id => {
        await personRepo.update(id, { archived: true })
        await after('crm_person', id, 'archived', 'Person archived')
      },
      personForMember,
      addMemberToCrm: async member => {
        const existing = personForMember(member.id)
        if (existing) return existing
        const companyId = member.company ? (await ensureCompany(member.company))?.id ?? null : null
        const created = await personRepo.create({
          fullName: member.name, title: member.title ?? '', companyName: member.company ?? '',
          companyId, location: member.location ?? '', lifecycle: 'Partner',
          memberId: member.id, source: 'Aetheris network',
        })
        if (created) {
          await activityRepo.create({ kind: 'intro', subject: `Linked ${member.name} from the Aetheris network`, personId: created.id })
          await after('crm_person', created.id, 'linked', `${member.name} linked from the network`)
        }
        return created
      },

      /* ---------------------------------------------------------- companies */
      createCompany: async p => {
        const created = await companyRepo.create(p)
        if (created) await after('crm_company', created.id, 'created', `Company ${created.name} created`)
        return created
      },
      updateCompany: async (id, p) => {
        await companyRepo.update(id, p)
        await after('crm_company', id, 'updated', 'Company updated')
      },
      archiveCompany: async id => {
        await companyRepo.update(id, { archived: true })
        await after('crm_company', id, 'archived', 'Company archived')
      },
      companyByName,
      ensureCompany,

      /* ------------------------------------------------------ opportunities */
      createOpportunity: async p => {
        const stage = p.stageId ? stageFor(p.stageId) : firstStage
        const created = await opportunityRepo.create({
          ...p,
          companyId: p.companyId ?? null,
          pipelineId: p.pipelineId ?? defaultPipeline?.id ?? null,
          stageId: stage?.id ?? null,
          stageName: stage?.name ?? '',
          probability: p.probability ?? stage?.probability ?? 0,
        } as Partial<CrmOpportunity>)
        if (created) await after('crm_opportunity', created.id, 'created', `Opportunity ${created.name} created`)
        return created
      },
      updateOpportunity: async (id, p) => {
        await opportunityRepo.update(id, p)
        await after('crm_opportunity', id, 'updated', `Opportunity updated: ${Object.keys(p).join(', ')}`)
      },
      archiveOpportunity: async id => {
        await opportunityRepo.update(id, { archived: true })
        await after('crm_opportunity', id, 'archived', 'Opportunity archived')
      },
      moveOpportunity: async (id, stageId) => {
        const stage = stageFor(stageId)
        await opportunityRepo.update(id, {
          stageId, stageName: stage?.name ?? '', probability: stage?.probability ?? 0,
          ...(stage?.isWon ? { status: 'won' as const } : stage?.isLost ? { status: 'lost' as const } : { status: 'open' as const }),
        })
        await after('crm_opportunity', id, 'stage', `Moved to ${stage?.name ?? 'stage'}`)
      },

      /* ------------------------------------------------ tasks + activities */
      createTask: async p => {
        const created = await taskRepo.create(p)
        if (created) await after('crm_task', created.id, 'created', `Task ${created.title} created`)
        return created
      },
      updateTask: async (id, p) => {
        await taskRepo.update(id, p)
        await after('crm_task', id, 'updated', 'Task updated')
      },
      removeTask: async id => {
        await taskRepo.remove(id)
        await after('crm_task', id, 'deleted', 'Task deleted')
      },
      logActivity: async p => {
        const created = await activityRepo.create(p)
        if (created?.personId) await personRepo.update(created.personId, { lastActivityAt: created.occurredAt })
        await after('crm_activity', created?.id ?? 'activity', 'logged', p.subject ?? 'Activity logged')
      },
      addNote: async (entityType, entityId, body) => {
        await noteRepo.create(entityType, entityId, body)
        await after(entityType, entityId, 'note', 'Note added')
      },
      removeNote: async id => { await noteRepo.remove(id); await refresh() },

      /* --------------------------------------------------------------- grid */
      createWorkbook: async (name, description = '') => {
        const created = await workbookRepo.create(name, description)
        if (created) {
          await sheetRepo.create({ workbookId: created.id, name: 'Sheet 1', mode: 'freeform', position: 0 })
          const sheets = await loadSnapshot()
          const sheet = sheets.sheets.find(s => s.workbookId === created.id)
          if (sheet) {
            await columnRepo.createMany(sheet.id, blankColumns)
            await rowRepo.createMany(sheet.id, Array.from({ length: 12 }, (_, i) => ({ position: i, values: {} })))
          }
          await after('grid_workbook', created.id, 'created', `Workbook ${created.name} created`)
        }
        return created
      },
      renameWorkbook: async (id, name) => { await workbookRepo.update(id, { name }); await refresh() },
      archiveWorkbook: async id => {
        await workbookRepo.update(id, { archived: true })
        await after('grid_workbook', id, 'archived', 'Workbook archived')
      },
      createSheet: async (workbookId, name, template) => {
        const tpl = templateById[template]
        const position = snap.sheets.filter(s => s.workbookId === workbookId).length
        const created = await sheetRepo.create({
          workbookId, name, position,
          mode: tpl?.entityType ? 'linked' : 'freeform',
          entityType: tpl?.entityType ?? null,
        })
        if (!created) return null
        const fields: LinkedField[] = tpl ? tpl.fields : blankColumns
        await columnRepo.createMany(created.id, fields.map((f, i) => ({
          key: f.key, name: f.name, type: f.type, width: f.width ?? 160, position: i,
          options: f.options ?? [], writable: f.writable,
          sourceField: tpl?.entityType ? f.key : null,
          relationType: f.relationType ?? null,
        })))
        if (created.mode === 'freeform') {
          await rowRepo.createMany(created.id, Array.from({ length: 12 }, (_, i) => ({ position: i, values: {} })))
        }
        await after('grid_sheet', created.id, 'created', `Sheet ${created.name} created`)
        return created
      },
      renameSheet: async (id, name) => { await sheetRepo.update(id, { name }); await refresh() },
      duplicateSheet: async id => {
        const source = snap.sheets.find(s => s.id === id)
        if (!source) return null
        const created = await sheetRepo.create({
          workbookId: source.workbookId, name: `${source.name} copy`,
          mode: source.mode, entityType: source.entityType,
          position: snap.sheets.filter(s => s.workbookId === source.workbookId).length,
          config: source.config,
        })
        if (!created) return null
        const cols = snap.columns.filter(c => c.sheetId === id).sort((a, b) => a.position - b.position)
        await columnRepo.createMany(created.id, cols.map(c => ({
          key: c.key, name: c.name, type: c.type, width: c.width, position: c.position,
          options: c.options, writable: c.writable, sourceField: c.sourceField, relationType: c.relationType,
          formula: c.formula,
        })))
        const rows = snap.rows.filter(r => r.sheetId === id).sort((a, b) => a.position - b.position)
        if (rows.length) await rowRepo.createMany(created.id, rows.map(r => ({ position: r.position, values: r.values })))
        await after('grid_sheet', created.id, 'duplicated', `Sheet duplicated from ${source.name}`)
        return created
      },
      archiveSheet: async id => {
        await sheetRepo.update(id, { archived: true })
        await after('grid_sheet', id, 'archived', 'Sheet archived')
      },
      updateSheetConfig: async (id, config) => { await sheetRepo.update(id, { config }); await refresh() },
      addColumn: async (sheetId, name, type) => {
        const existing = snap.columns.filter(c => c.sheetId === sheetId)
        let key = slug(name)
        if (existing.some(c => c.key === key)) key = `${key}_${existing.length + 1}`
        await columnRepo.create({ sheetId, key, name, type, position: existing.length })
        await refresh()
      },
      updateColumn: async (id, p) => { await columnRepo.update(id, p); await refresh() },
      removeColumn: async id => { await columnRepo.remove(id); await refresh() },
      addRow: async (sheetId, values = {}) => {
        const position = snap.rows.filter(r => r.sheetId === sheetId).length
        await rowRepo.create(sheetId, position, values)
        await refresh()
      },
      addRows: async (sheetId, rows) => {
        const base = snap.rows.filter(r => r.sheetId === sheetId).length
        await rowRepo.createMany(sheetId, rows.map((values, i) => ({ position: base + i, values })))
        await refresh()
      },
      setCell: async (rowId, key, value) => {
        const row = snap.rows.find(r => r.id === rowId)
        if (!row) return
        const next = { ...row.values, [key]: value }
        setSnap(prev => ({ ...prev, rows: prev.rows.map(r => (r.id === rowId ? { ...r, values: next } : r)) }))
        await rowRepo.update(rowId, next)
      },
      removeRow: async id => { await rowRepo.remove(id); await refresh() },
      saveView: async (sheetId, name, config) => { await viewRepo.create(sheetId, name, config); await refresh() },
      removeView: async id => { await viewRepo.remove(id); await refresh() },

      /* ----------------------------------------------------- linked writes */
      writeLinkedField: async (entityType, entityId, key, value) => {
        const textValue = value === null || value === undefined ? '' : String(value)
        if (entityType === 'crm_people') {
          const p: Partial<CrmPerson> = {}
          if (key === 'fullName') p.fullName = textValue
          else if (key === 'title') p.title = textValue
          else if (key === 'email') p.email = textValue
          else if (key === 'phone') p.phone = textValue
          else if (key === 'location') p.location = textValue
          else if (key === 'lifecycle') p.lifecycle = textValue as CrmPerson['lifecycle']
          else if (key === 'companyName') {
            p.companyName = textValue
            p.companyId = textValue ? (await ensureCompany(textValue))?.id ?? null : null
          } else return
          await personRepo.update(entityId, p)
        } else if (entityType === 'crm_companies') {
          const c: Partial<CrmCompany> = {}
          if (key === 'name') c.name = textValue
          else if (key === 'industry') c.industry = textValue
          else if (key === 'location') c.location = textValue
          else if (key === 'website') c.website = textValue
          else if (key === 'employees') c.employees = textValue
          else return
          await companyRepo.update(entityId, c)
        } else if (entityType === 'crm_opportunities') {
          const o: Partial<CrmOpportunity> = {}
          if (key === 'name') o.name = textValue
          else if (key === 'amount') o.amount = Number(textValue.replace(/[^0-9.-]/g, '')) || 0
          else if (key === 'probability') o.probability = Math.max(0, Math.min(100, Math.round(Number(textValue.replace(/[^0-9.-]/g, '')) || 0)))
          else if (key === 'nextAction') o.nextAction = textValue
          else if (key === 'expectedClose') o.expectedClose = textValue || null
          else if (key === 'stageName') {
            const stage = snap.stages.find(s => s.name.toLowerCase() === textValue.toLowerCase())
            if (!stage) return
            o.stageId = stage.id; o.stageName = stage.name; o.probability = stage.probability
          } else if (key === 'personName') {
            const person = snap.people.find(pp => pp.fullName.toLowerCase() === textValue.toLowerCase())
            o.personId = person?.id ?? null
          } else if (key === 'companyName') {
            o.companyId = textValue ? (await ensureCompany(textValue))?.id ?? null : null
          } else return
          await opportunityRepo.update(entityId, o)
        } else if (entityType === 'crm_tasks') {
          const t: Partial<CrmTask> = {}
          if (key === 'title') t.title = textValue
          else if (key === 'status') t.status = textValue as CrmTask['status']
          else if (key === 'priority') t.priority = textValue as CrmTask['priority']
          else if (key === 'dueAt') t.dueAt = textValue || null
          else if (key === 'personName') {
            const person = snap.people.find(pp => pp.fullName.toLowerCase() === textValue.toLowerCase())
            t.personId = person?.id ?? null
          } else if (key === 'opportunityName') {
            const opp = snap.opportunities.find(o => o.name.toLowerCase() === textValue.toLowerCase())
            t.opportunityId = opp?.id ?? null
          } else return
          await taskRepo.update(entityId, t)
        } else return
        await after(entityType, entityId, 'grid-edit', `${key} changed in Grid`)
      },
      createLinkedRecord: async (entityType, primary) => {
        const name = primary.trim() || 'Untitled'
        if (entityType === 'crm_people') {
          const created = await personRepo.create({ fullName: name, lifecycle: 'Lead', source: 'Grid' })
          if (created) await after('crm_person', created.id, 'created', `${name} created from Grid`)
        } else if (entityType === 'crm_companies') {
          const created = await companyRepo.create({ name })
          if (created) await after('crm_company', created.id, 'created', `${name} created from Grid`)
        } else if (entityType === 'crm_opportunities') {
          const created = await opportunityRepo.create({
            name, pipelineId: defaultPipeline?.id ?? null, stageId: firstStage?.id ?? null,
            stageName: firstStage?.name ?? '', probability: firstStage?.probability ?? 0,
          })
          if (created) await after('crm_opportunity', created.id, 'created', `${name} created from Grid`)
        } else if (entityType === 'crm_tasks') {
          const created = await taskRepo.create({ title: name })
          if (created) await after('crm_task', created.id, 'created', `${name} created from Grid`)
        }
      },
    }
  }, [snap, ready, refresh])

  return <OpsCtx.Provider value={api}>{children}</OpsCtx.Provider>
}
