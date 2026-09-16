/**
 * Aetheris operational layer — canonical types.
 *
 * One record per entity per account. CRM pages, Grid linked sheets and Intros
 * surfaces are all views over these records; nothing is copied between them.
 */

export type ID = string

export type Lifecycle =
  | 'Lead' | 'Prospect' | 'Customer' | 'Partner' | 'Investor'
  | 'Advisor' | 'Talent' | 'Vendor' | 'Other'

export const lifecycles: Lifecycle[] = [
  'Lead', 'Prospect', 'Customer', 'Partner', 'Investor', 'Advisor', 'Talent', 'Vendor', 'Other',
]

export type ActivityKind =
  | 'call' | 'email' | 'meeting' | 'message' | 'intro' | 'note' | 'task' | 'demo' | 'other'

export const activityKinds: ActivityKind[] = [
  'call', 'email', 'meeting', 'message', 'intro', 'note', 'task', 'demo', 'other',
]

export type TaskStatus = 'open' | 'doing' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high'
export type OpportunityStatus = 'open' | 'won' | 'lost' | 'paused'
export type ValueState = 'known' | 'modeled' | 'unquantified'

export interface CrmCompany {
  id: ID
  name: string
  domain: string
  industry: string
  location: string
  website: string
  phone: string
  employees: string
  revenueBand: string
  notes: string
  directoryCompanyId: string | null
  networkCompanyId: string | null
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface CrmPerson {
  id: ID
  fullName: string
  email: string
  phone: string
  title: string
  companyId: ID | null
  companyName: string
  lifecycle: Lifecycle
  location: string
  linkedinUrl: string
  source: string
  notes: string
  tags: string[]
  /** Aetheris network member id when this person is a live member. */
  memberId: string | null
  profileId: string | null
  directoryContactId: string | null
  lastActivityAt: string | null
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface CrmStage {
  id: ID
  pipelineId: ID
  name: string
  position: number
  probability: number
  isWon: boolean
  isLost: boolean
}

export interface CrmPipeline {
  id: ID
  name: string
  isDefault: boolean
  position: number
}

export interface CrmOpportunity {
  id: ID
  name: string
  pipelineId: ID | null
  stageId: ID | null
  stageName: string
  amount: number
  currency: string
  probability: number
  valueState: ValueState
  expectedClose: string | null
  personId: ID | null
  companyId: ID | null
  source: string
  nextAction: string
  detail: string
  status: OpportunityStatus
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface CrmActivity {
  id: ID
  kind: ActivityKind
  subject: string
  detail: string
  occurredAt: string
  personId: ID | null
  companyId: ID | null
  opportunityId: ID | null
  introRequestId: string | null
  threadId: string | null
  calendarEventId: string | null
}

export interface CrmTask {
  id: ID
  title: string
  detail: string
  dueAt: string | null
  priority: TaskPriority
  status: TaskStatus
  assignee: string
  personId: ID | null
  companyId: ID | null
  opportunityId: ID | null
  createdAt: string
}

export interface CrmNote {
  id: ID
  entityType: string
  entityId: ID
  body: string
  createdAt: string
}

export interface EntityEvent {
  id: ID
  entityType: string
  entityId: string
  event: string
  summary: string
  createdAt: string
}

/* ------------------------------------------------------------------ grid */

export type GridColumnType =
  | 'text' | 'number' | 'currency' | 'percent' | 'date' | 'checkbox'
  | 'select' | 'relation' | 'formula'

export type SheetMode = 'linked' | 'freeform'

/** Canonical entity a linked sheet projects. */
export type LinkedEntity =
  | 'crm_people' | 'crm_companies' | 'crm_opportunities' | 'crm_tasks'
  | 'relationship_intelligence' | 'introductions'

export interface GridWorkbook {
  id: ID
  name: string
  description: string
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface GridSheet {
  id: ID
  workbookId: ID
  name: string
  mode: SheetMode
  entityType: LinkedEntity | null
  position: number
  config: { frozenRow?: boolean; frozenColumn?: boolean; sort?: { key: string; dir: 'asc' | 'desc' } | null; filter?: string }
  archived: boolean
}

export interface GridColumn {
  id: ID
  sheetId: ID
  name: string
  key: string
  position: number
  type: GridColumnType
  width: number
  formula: string
  defaultValue: string
  options: string[]
  sourceField: string | null
  relationType: string | null
  writable: boolean
}

export interface GridRow {
  id: ID
  sheetId: ID
  position: number
  entityType: string | null
  entityId: string | null
  values: Record<string, unknown>
}

export interface GridView {
  id: ID
  sheetId: ID
  name: string
  config: Record<string, unknown>
}
