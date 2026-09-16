/**
 * Supabase repository for the operational layer.
 *
 * Every read and write is account-scoped by RLS (`owner_id = auth.uid()`).
 * Mutations append to the entity event ledger so timelines and future
 * reasoning share one history.
 */
import { supabase } from '@/integrations/supabase/client'
import type {
  CrmActivity, CrmCompany, CrmNote, CrmOpportunity, CrmPerson, CrmPipeline, CrmStage, CrmTask,
  EntityEvent, GridColumn, GridRow, GridSheet, GridView, GridWorkbook, ID, LinkedEntity, SheetMode,
} from './types'

type Row = Record<string, unknown>

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const nul = (v: unknown) => (typeof v === 'string' && v ? v : null)
const nbr = (v: unknown, fallback = 0) => (typeof v === 'number' ? v : Number(v ?? fallback) || fallback)
const bool = (v: unknown) => v === true

export async function currentAccountId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/* ------------------------------------------------------------------ mappers */

const toCompany = (r: Row): CrmCompany => ({
  id: str(r['id']), name: str(r['name']), domain: str(r['domain']), industry: str(r['industry']),
  location: str(r['location']), website: str(r['website']), phone: str(r['phone']),
  employees: str(r['employees']), revenueBand: str(r['revenue_band']), notes: str(r['notes']),
  directoryCompanyId: nul(r['directory_company_id']), networkCompanyId: nul(r['network_company_id']),
  archived: bool(r['archived']), createdAt: str(r['created_at']), updatedAt: str(r['updated_at']),
})

const toPerson = (r: Row): CrmPerson => ({
  id: str(r['id']), fullName: str(r['full_name']), email: str(r['email']), phone: str(r['phone']),
  title: str(r['title']), companyId: nul(r['company_id']), companyName: str(r['company_name']),
  lifecycle: (str(r['lifecycle'], 'Lead') as CrmPerson['lifecycle']), location: str(r['location']),
  linkedinUrl: str(r['linkedin_url']), source: str(r['source']), notes: str(r['notes']),
  tags: Array.isArray(r['tags']) ? (r['tags'] as string[]) : [],
  memberId: nul(r['member_id']), profileId: nul(r['profile_id']), directoryContactId: nul(r['directory_contact_id']),
  lastActivityAt: nul(r['last_activity_at']), archived: bool(r['archived']),
  createdAt: str(r['created_at']), updatedAt: str(r['updated_at']),
})

const toOpportunity = (r: Row): CrmOpportunity => ({
  id: str(r['id']), name: str(r['name']), pipelineId: nul(r['pipeline_id']), stageId: nul(r['stage_id']),
  stageName: str(r['stage_name']), amount: nbr(r['amount']), currency: str(r['currency'], 'USD'),
  probability: nbr(r['probability']), valueState: (str(r['value_state'], 'known') as CrmOpportunity['valueState']),
  expectedClose: nul(r['expected_close']), personId: nul(r['person_id']), companyId: nul(r['company_id']),
  source: str(r['source']), nextAction: str(r['next_action']), detail: str(r['detail']),
  status: (str(r['status'], 'open') as CrmOpportunity['status']), archived: bool(r['archived']),
  createdAt: str(r['created_at']), updatedAt: str(r['updated_at']),
})

const toActivity = (r: Row): CrmActivity => ({
  id: str(r['id']), kind: (str(r['kind'], 'note') as CrmActivity['kind']), subject: str(r['subject']),
  detail: str(r['detail']), occurredAt: str(r['occurred_at']), personId: nul(r['person_id']),
  companyId: nul(r['company_id']), opportunityId: nul(r['opportunity_id']),
  introRequestId: nul(r['intro_request_id']), threadId: nul(r['thread_id']), calendarEventId: nul(r['calendar_event_id']),
})

const toTask = (r: Row): CrmTask => ({
  id: str(r['id']), title: str(r['title']), detail: str(r['detail']), dueAt: nul(r['due_at']),
  priority: (str(r['priority'], 'medium') as CrmTask['priority']), status: (str(r['status'], 'open') as CrmTask['status']),
  assignee: str(r['assignee']), personId: nul(r['person_id']), companyId: nul(r['company_id']),
  opportunityId: nul(r['opportunity_id']), createdAt: str(r['created_at']),
})

const toNote = (r: Row): CrmNote => ({
  id: str(r['id']), entityType: str(r['entity_type']), entityId: str(r['entity_id']),
  body: str(r['body']), createdAt: str(r['created_at']),
})

const toEvent = (r: Row): EntityEvent => ({
  id: str(r['id']), entityType: str(r['entity_type']), entityId: str(r['entity_id']),
  event: str(r['event']), summary: str(r['summary']), createdAt: str(r['created_at']),
})

const toWorkbook = (r: Row): GridWorkbook => ({
  id: str(r['id']), name: str(r['name']), description: str(r['description']),
  archived: bool(r['archived']), createdAt: str(r['created_at']), updatedAt: str(r['updated_at']),
})

const toSheet = (r: Row): GridSheet => ({
  id: str(r['id']), workbookId: str(r['workbook_id']), name: str(r['name']),
  mode: (str(r['mode'], 'freeform') as SheetMode), entityType: (nul(r['entity_type']) as LinkedEntity | null),
  position: nbr(r['position']), config: (r['config'] as GridSheet['config']) ?? {}, archived: bool(r['archived']),
})

const toColumn = (r: Row): GridColumn => ({
  id: str(r['id']), sheetId: str(r['sheet_id']), name: str(r['name']), key: str(r['key']),
  position: nbr(r['position']), type: (str(r['type'], 'text') as GridColumn['type']), width: nbr(r['width'], 160),
  formula: str(r['formula']), defaultValue: str(r['default_value']),
  options: Array.isArray(r['options']) ? (r['options'] as string[]) : [],
  sourceField: nul(r['source_field']), relationType: nul(r['relation_type']), writable: r['writable'] !== false,
})

const toGridRow = (r: Row): GridRow => ({
  id: str(r['id']), sheetId: str(r['sheet_id']), position: nbr(r['position']),
  entityType: nul(r['entity_type']), entityId: nul(r['entity_id']),
  values: (r['values'] as Record<string, unknown>) ?? {},
})

const toView = (r: Row): GridView => ({
  id: str(r['id']), sheetId: str(r['sheet_id']), name: str(r['name']),
  config: (r['config'] as Record<string, unknown>) ?? {},
})

/* -------------------------------------------------------------- event ledger */

export async function logEvent(entityType: string, entityId: string, event: string, summary: string, detail: Record<string, unknown> = {}) {
  const owner = await currentAccountId()
  if (!owner) return
  await supabase.from('entity_events').insert({ owner_id: owner, entity_type: entityType, entity_id: entityId, event, summary, detail })
}

/* -------------------------------------------------------------------- loads */

export interface OperationalSnapshot {
  companies: CrmCompany[]
  people: CrmPerson[]
  pipelines: CrmPipeline[]
  stages: CrmStage[]
  opportunities: CrmOpportunity[]
  activities: CrmActivity[]
  tasks: CrmTask[]
  notes: CrmNote[]
  events: EntityEvent[]
  workbooks: GridWorkbook[]
  sheets: GridSheet[]
  columns: GridColumn[]
  rows: GridRow[]
  views: GridView[]
}

export const emptySnapshot: OperationalSnapshot = {
  companies: [], people: [], pipelines: [], stages: [], opportunities: [], activities: [],
  tasks: [], notes: [], events: [], workbooks: [], sheets: [], columns: [], rows: [], views: [],
}

export async function loadSnapshot(): Promise<OperationalSnapshot> {
  const owner = await currentAccountId()
  if (!owner) return emptySnapshot
  const [companies, people, pipelines, stages, opportunities, activities, tasks, notes, events, workbooks, sheets, columns, rows, views] =
    await Promise.all([
      supabase.from('crm_companies').select('*').order('name'),
      supabase.from('crm_people').select('*').order('full_name'),
      supabase.from('crm_pipelines').select('*').order('position'),
      supabase.from('crm_pipeline_stages').select('*').order('position'),
      supabase.from('crm_opportunities').select('*').order('updated_at', { ascending: false }),
      supabase.from('crm_activities').select('*').order('occurred_at', { ascending: false }).limit(400),
      supabase.from('crm_tasks').select('*').order('due_at', { nullsFirst: false }),
      supabase.from('crm_notes').select('*').order('created_at', { ascending: false }),
      supabase.from('entity_events').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('grid_workbooks').select('*').order('created_at'),
      supabase.from('grid_sheets').select('*').order('position'),
      supabase.from('grid_columns').select('*').order('position'),
      supabase.from('grid_rows').select('*').order('position'),
      supabase.from('grid_views').select('*').order('created_at'),
    ])
  return {
    companies: (companies.data ?? []).map(toCompany),
    people: (people.data ?? []).map(toPerson),
    pipelines: (pipelines.data ?? []).map(r => ({
      id: str(r['id']), name: str(r['name']), isDefault: bool(r['is_default']), position: nbr(r['position']),
    })),
    stages: (stages.data ?? []).map(r => ({
      id: str(r['id']), pipelineId: str(r['pipeline_id']), name: str(r['name']), position: nbr(r['position']),
      probability: nbr(r['probability']), isWon: bool(r['is_won']), isLost: bool(r['is_lost']),
    })),
    opportunities: (opportunities.data ?? []).map(toOpportunity),
    activities: (activities.data ?? []).map(toActivity),
    tasks: (tasks.data ?? []).map(toTask),
    notes: (notes.data ?? []).map(toNote),
    events: (events.data ?? []).map(toEvent),
    workbooks: (workbooks.data ?? []).map(toWorkbook),
    sheets: (sheets.data ?? []).map(toSheet),
    columns: (columns.data ?? []).map(toColumn),
    rows: (rows.data ?? []).map(toGridRow),
    views: (views.data ?? []).map(toView),
  }
}

export async function ensureDefaultPipeline(): Promise<string | null> {
  const { data, error } = await supabase.rpc('ensure_default_pipeline')
  if (error) return null
  return typeof data === 'string' ? data : null
}

/* ------------------------------------------------------------------ writes */

async function insert<T>(table: string, payload: Row, map: (r: Row) => T): Promise<T | null> {
  const owner = await currentAccountId()
  if (!owner) return null
  const { data, error } = await supabase.from(table).insert({ ...payload, owner_id: owner }).select('*').single()
  if (error || !data) return null
  return map(data as Row)
}

async function patch<T>(table: string, id: ID, payload: Row, map: (r: Row) => T): Promise<T | null> {
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select('*').single()
  if (error || !data) return null
  return map(data as Row)
}

export const companyRepo = {
  create: (p: Partial<CrmCompany>) => insert('crm_companies', {
    name: p.name ?? 'Untitled company', domain: p.domain ?? '', industry: p.industry ?? '',
    location: p.location ?? '', website: p.website ?? '', phone: p.phone ?? '',
    employees: p.employees ?? '', revenue_band: p.revenueBand ?? '', notes: p.notes ?? '',
    directory_company_id: p.directoryCompanyId ?? null, network_company_id: p.networkCompanyId ?? null,
  }, toCompany),
  update: (id: ID, p: Partial<CrmCompany>) => patch('crm_companies', id, {
    ...(p.name !== undefined && { name: p.name }),
    ...(p.domain !== undefined && { domain: p.domain }),
    ...(p.industry !== undefined && { industry: p.industry }),
    ...(p.location !== undefined && { location: p.location }),
    ...(p.website !== undefined && { website: p.website }),
    ...(p.phone !== undefined && { phone: p.phone }),
    ...(p.employees !== undefined && { employees: p.employees }),
    ...(p.revenueBand !== undefined && { revenue_band: p.revenueBand }),
    ...(p.notes !== undefined && { notes: p.notes }),
    ...(p.archived !== undefined && { archived: p.archived }),
  }, toCompany),
  remove: (id: ID) => supabase.from('crm_companies').delete().eq('id', id),
}

export const personRepo = {
  create: (p: Partial<CrmPerson>) => insert('crm_people', {
    full_name: p.fullName ?? 'Untitled person', email: p.email ?? '', phone: p.phone ?? '',
    title: p.title ?? '', company_id: p.companyId ?? null, company_name: p.companyName ?? '',
    lifecycle: p.lifecycle ?? 'Lead', location: p.location ?? '', linkedin_url: p.linkedinUrl ?? '',
    source: p.source ?? '', notes: p.notes ?? '', tags: p.tags ?? [],
    member_id: p.memberId ?? null, profile_id: p.profileId ?? null,
    directory_contact_id: p.directoryContactId ?? null,
  }, toPerson),
  update: (id: ID, p: Partial<CrmPerson>) => patch('crm_people', id, {
    ...(p.fullName !== undefined && { full_name: p.fullName }),
    ...(p.email !== undefined && { email: p.email }),
    ...(p.phone !== undefined && { phone: p.phone }),
    ...(p.title !== undefined && { title: p.title }),
    ...(p.companyId !== undefined && { company_id: p.companyId }),
    ...(p.companyName !== undefined && { company_name: p.companyName }),
    ...(p.lifecycle !== undefined && { lifecycle: p.lifecycle }),
    ...(p.location !== undefined && { location: p.location }),
    ...(p.linkedinUrl !== undefined && { linkedin_url: p.linkedinUrl }),
    ...(p.source !== undefined && { source: p.source }),
    ...(p.notes !== undefined && { notes: p.notes }),
    ...(p.tags !== undefined && { tags: p.tags }),
    ...(p.memberId !== undefined && { member_id: p.memberId }),
    ...(p.lastActivityAt !== undefined && { last_activity_at: p.lastActivityAt }),
    ...(p.archived !== undefined && { archived: p.archived }),
  }, toPerson),
  remove: (id: ID) => supabase.from('crm_people').delete().eq('id', id),
}

export const opportunityRepo = {
  create: (p: Partial<CrmOpportunity>) => insert('crm_opportunities', {
    name: p.name ?? 'Untitled opportunity', pipeline_id: p.pipelineId ?? null, stage_id: p.stageId ?? null,
    stage_name: p.stageName ?? '', amount: p.amount ?? 0, currency: p.currency ?? 'USD',
    probability: p.probability ?? 0, value_state: p.valueState ?? 'known',
    expected_close: p.expectedClose ?? null, person_id: p.personId ?? null, company_id: p.companyId ?? null,
    source: p.source ?? '', next_action: p.nextAction ?? '', detail: p.detail ?? '', status: p.status ?? 'open',
  }, toOpportunity),
  update: (id: ID, p: Partial<CrmOpportunity>) => patch('crm_opportunities', id, {
    ...(p.name !== undefined && { name: p.name }),
    ...(p.pipelineId !== undefined && { pipeline_id: p.pipelineId }),
    ...(p.stageId !== undefined && { stage_id: p.stageId }),
    ...(p.stageName !== undefined && { stage_name: p.stageName }),
    ...(p.amount !== undefined && { amount: p.amount }),
    ...(p.probability !== undefined && { probability: p.probability }),
    ...(p.valueState !== undefined && { value_state: p.valueState }),
    ...(p.expectedClose !== undefined && { expected_close: p.expectedClose }),
    ...(p.personId !== undefined && { person_id: p.personId }),
    ...(p.companyId !== undefined && { company_id: p.companyId }),
    ...(p.source !== undefined && { source: p.source }),
    ...(p.nextAction !== undefined && { next_action: p.nextAction }),
    ...(p.detail !== undefined && { detail: p.detail }),
    ...(p.status !== undefined && { status: p.status }),
    ...(p.archived !== undefined && { archived: p.archived }),
  }, toOpportunity),
  remove: (id: ID) => supabase.from('crm_opportunities').delete().eq('id', id),
}

export const taskRepo = {
  create: (p: Partial<CrmTask>) => insert('crm_tasks', {
    title: p.title ?? 'Untitled task', detail: p.detail ?? '', due_at: p.dueAt ?? null,
    priority: p.priority ?? 'medium', status: p.status ?? 'open', assignee: p.assignee ?? '',
    person_id: p.personId ?? null, company_id: p.companyId ?? null, opportunity_id: p.opportunityId ?? null,
  }, toTask),
  update: (id: ID, p: Partial<CrmTask>) => patch('crm_tasks', id, {
    ...(p.title !== undefined && { title: p.title }),
    ...(p.detail !== undefined && { detail: p.detail }),
    ...(p.dueAt !== undefined && { due_at: p.dueAt }),
    ...(p.priority !== undefined && { priority: p.priority }),
    ...(p.status !== undefined && { status: p.status }),
    ...(p.assignee !== undefined && { assignee: p.assignee }),
    ...(p.personId !== undefined && { person_id: p.personId }),
    ...(p.companyId !== undefined && { company_id: p.companyId }),
    ...(p.opportunityId !== undefined && { opportunity_id: p.opportunityId }),
  }, toTask),
  remove: (id: ID) => supabase.from('crm_tasks').delete().eq('id', id),
}

export const activityRepo = {
  create: (p: Partial<CrmActivity>) => insert('crm_activities', {
    kind: p.kind ?? 'note', subject: p.subject ?? 'Activity', detail: p.detail ?? '',
    occurred_at: p.occurredAt ?? new Date().toISOString(),
    person_id: p.personId ?? null, company_id: p.companyId ?? null, opportunity_id: p.opportunityId ?? null,
    intro_request_id: p.introRequestId ?? null, thread_id: p.threadId ?? null,
    calendar_event_id: p.calendarEventId ?? null,
  }, toActivity),
  remove: (id: ID) => supabase.from('crm_activities').delete().eq('id', id),
}

export const noteRepo = {
  create: (entityType: string, entityId: ID, body: string) =>
    insert('crm_notes', { entity_type: entityType, entity_id: entityId, body }, toNote),
  remove: (id: ID) => supabase.from('crm_notes').delete().eq('id', id),
}

/* --------------------------------------------------------------------- grid */

export const workbookRepo = {
  create: (name: string, description = '') => insert('grid_workbooks', { name, description }, toWorkbook),
  update: (id: ID, p: Partial<GridWorkbook>) => patch('grid_workbooks', id, {
    ...(p.name !== undefined && { name: p.name }),
    ...(p.description !== undefined && { description: p.description }),
    ...(p.archived !== undefined && { archived: p.archived }),
  }, toWorkbook),
  remove: (id: ID) => supabase.from('grid_workbooks').delete().eq('id', id),
}

export const sheetRepo = {
  create: (p: Partial<GridSheet> & { workbookId: ID }) => insert('grid_sheets', {
    workbook_id: p.workbookId, name: p.name ?? 'Sheet 1', mode: p.mode ?? 'freeform',
    entity_type: p.entityType ?? null, position: p.position ?? 0, config: p.config ?? {},
  }, toSheet),
  update: (id: ID, p: Partial<GridSheet>) => patch('grid_sheets', id, {
    ...(p.name !== undefined && { name: p.name }),
    ...(p.position !== undefined && { position: p.position }),
    ...(p.config !== undefined && { config: p.config }),
    ...(p.archived !== undefined && { archived: p.archived }),
  }, toSheet),
  remove: (id: ID) => supabase.from('grid_sheets').delete().eq('id', id),
}

export const columnRepo = {
  create: (p: Partial<GridColumn> & { sheetId: ID; key: string }) => insert('grid_columns', {
    sheet_id: p.sheetId, name: p.name ?? p.key, key: p.key, position: p.position ?? 0,
    type: p.type ?? 'text', width: p.width ?? 160, formula: p.formula ?? '',
    default_value: p.defaultValue ?? '', options: p.options ?? [],
    source_field: p.sourceField ?? null, relation_type: p.relationType ?? null,
    writable: p.writable ?? true,
  }, toColumn),
  createMany: async (sheetId: ID, cols: Array<Partial<GridColumn> & { key: string }>) => {
    const owner = await currentAccountId()
    if (!owner) return []
    const payload = cols.map((c, i) => ({
      owner_id: owner, sheet_id: sheetId, name: c.name ?? c.key, key: c.key, position: c.position ?? i,
      type: c.type ?? 'text', width: c.width ?? 160, formula: c.formula ?? '',
      default_value: c.defaultValue ?? '', options: c.options ?? [],
      source_field: c.sourceField ?? null, relation_type: c.relationType ?? null, writable: c.writable ?? true,
    }))
    const { data } = await supabase.from('grid_columns').insert(payload).select('*')
    return (data ?? []).map(r => toColumn(r as Row))
  },
  update: (id: ID, p: Partial<GridColumn>) => patch('grid_columns', id, {
    ...(p.name !== undefined && { name: p.name }),
    ...(p.position !== undefined && { position: p.position }),
    ...(p.type !== undefined && { type: p.type }),
    ...(p.width !== undefined && { width: p.width }),
    ...(p.formula !== undefined && { formula: p.formula }),
    ...(p.options !== undefined && { options: p.options }),
    ...(p.writable !== undefined && { writable: p.writable }),
  }, toColumn),
  remove: (id: ID) => supabase.from('grid_columns').delete().eq('id', id),
}

export const rowRepo = {
  create: (sheetId: ID, position: number, values: Record<string, unknown> = {}) =>
    insert('grid_rows', { sheet_id: sheetId, position, values }, toGridRow),
  createMany: async (sheetId: ID, rows: Array<{ position: number; values: Record<string, unknown> }>) => {
    const owner = await currentAccountId()
    if (!owner) return []
    const { data } = await supabase.from('grid_rows')
      .insert(rows.map(r => ({ owner_id: owner, sheet_id: sheetId, position: r.position, values: r.values })))
      .select('*')
    return (data ?? []).map(r => toGridRow(r as Row))
  },
  update: (id: ID, values: Record<string, unknown>) => patch('grid_rows', id, { values }, toGridRow),
  move: (id: ID, position: number) => patch('grid_rows', id, { position }, toGridRow),
  remove: (id: ID) => supabase.from('grid_rows').delete().eq('id', id),
}

export const viewRepo = {
  create: (sheetId: ID, name: string, config: Record<string, unknown>) =>
    insert('grid_views', { sheet_id: sheetId, name, config }, toView),
  remove: (id: ID) => supabase.from('grid_views').delete().eq('id', id),
}
