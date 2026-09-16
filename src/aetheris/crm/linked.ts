/**
 * Linked sheet definitions — Grid's projection over canonical records.
 *
 * A linked sheet never stores its own copy of the data. Each template names the
 * canonical entity it reads and the fields it exposes, marking which fields are
 * writable back to the record and which are read-only network intelligence.
 */
import type { GridColumnType, LinkedEntity } from './types'

export interface LinkedField {
  key: string
  name: string
  type: GridColumnType
  width?: number
  writable: boolean
  options?: string[]
  relationType?: 'crm_people' | 'crm_companies' | 'crm_opportunities'
}

export interface LinkedTemplate {
  id: LinkedEntity | 'blank'
  label: string
  blurb: string
  entityType: LinkedEntity | null
  fields: LinkedField[]
}

const lifecycleOptions = ['Lead', 'Prospect', 'Customer', 'Partner', 'Investor', 'Advisor', 'Talent', 'Vendor', 'Other']

export const linkedTemplates: LinkedTemplate[] = [
  {
    id: 'crm_people', label: 'CRM People', blurb: 'Every canonical person in your account, editable in place.',
    entityType: 'crm_people',
    fields: [
      { key: 'fullName', name: 'Person', type: 'text', width: 200, writable: true },
      { key: 'title', name: 'Title', type: 'text', width: 180, writable: true },
      { key: 'companyName', name: 'Company', type: 'relation', width: 180, writable: true, relationType: 'crm_companies' },
      { key: 'lifecycle', name: 'Lifecycle', type: 'select', width: 130, writable: true, options: lifecycleOptions },
      { key: 'email', name: 'Email', type: 'text', width: 200, writable: true },
      { key: 'phone', name: 'Phone', type: 'text', width: 140, writable: true },
      { key: 'location', name: 'Location', type: 'text', width: 150, writable: true },
      { key: 'connectionScore', name: 'Connection score', type: 'number', width: 140, writable: false },
      { key: 'whyNow', name: 'Why now', type: 'text', width: 240, writable: false },
      { key: 'lastActivity', name: 'Last activity', type: 'date', width: 140, writable: false },
    ],
  },
  {
    id: 'crm_companies', label: 'Companies', blurb: 'Accounts with coverage, industry and open value.',
    entityType: 'crm_companies',
    fields: [
      { key: 'name', name: 'Company', type: 'text', width: 220, writable: true },
      { key: 'industry', name: 'Industry', type: 'text', width: 170, writable: true },
      { key: 'location', name: 'Location', type: 'text', width: 160, writable: true },
      { key: 'website', name: 'Website', type: 'text', width: 190, writable: true },
      { key: 'employees', name: 'Employees', type: 'text', width: 120, writable: true },
      { key: 'peopleCount', name: 'People', type: 'number', width: 100, writable: false },
      { key: 'openValue', name: 'Open value', type: 'currency', width: 140, writable: false },
    ],
  },
  {
    id: 'crm_opportunities', label: 'Pipeline', blurb: 'Stage, value and next step for every open opportunity.',
    entityType: 'crm_opportunities',
    fields: [
      { key: 'name', name: 'Opportunity', type: 'text', width: 220, writable: true },
      { key: 'personName', name: 'Person', type: 'relation', width: 180, writable: true, relationType: 'crm_people' },
      { key: 'companyName', name: 'Company', type: 'relation', width: 180, writable: true, relationType: 'crm_companies' },
      { key: 'stageName', name: 'Stage', type: 'select', width: 160, writable: true },
      { key: 'amount', name: 'Value', type: 'currency', width: 140, writable: true },
      { key: 'probability', name: 'Probability', type: 'percent', width: 120, writable: true },
      { key: 'expectedClose', name: 'Expected close', type: 'date', width: 150, writable: true },
      { key: 'nextAction', name: 'Next action', type: 'text', width: 240, writable: true },
    ],
  },
  {
    id: 'crm_tasks', label: 'Tasks', blurb: 'Commitments with owners, dates and related records.',
    entityType: 'crm_tasks',
    fields: [
      { key: 'title', name: 'Task', type: 'text', width: 260, writable: true },
      { key: 'status', name: 'Status', type: 'select', width: 130, writable: true, options: ['open', 'doing', 'done', 'cancelled'] },
      { key: 'priority', name: 'Priority', type: 'select', width: 120, writable: true, options: ['low', 'medium', 'high'] },
      { key: 'dueAt', name: 'Due', type: 'date', width: 140, writable: true },
      { key: 'personName', name: 'Person', type: 'relation', width: 180, writable: true, relationType: 'crm_people' },
      { key: 'opportunityName', name: 'Opportunity', type: 'relation', width: 200, writable: true, relationType: 'crm_opportunities' },
    ],
  },
  {
    id: 'relationship_intelligence', label: 'Relationship Intelligence',
    blurb: 'Read-only network reasoning for the people linked to your account.',
    entityType: 'relationship_intelligence',
    fields: [
      { key: 'fullName', name: 'Person', type: 'text', width: 200, writable: false },
      { key: 'relationshipStatus', name: 'Relationship', type: 'text', width: 150, writable: false },
      { key: 'connectionScore', name: 'Score', type: 'number', width: 100, writable: false },
      { key: 'whyThem', name: 'Why them', type: 'text', width: 260, writable: false },
      { key: 'whyNow', name: 'Why now', type: 'text', width: 260, writable: false },
      { key: 'nextAction', name: 'Next action', type: 'text', width: 220, writable: false },
    ],
  },
  {
    id: 'introductions', label: 'Introductions', blurb: 'Introduction requests and their current state.',
    entityType: 'introductions',
    fields: [
      { key: 'fullName', name: 'Person', type: 'text', width: 200, writable: false },
      { key: 'introState', name: 'State', type: 'text', width: 150, writable: false },
      { key: 'companyName', name: 'Company', type: 'text', width: 180, writable: false },
      { key: 'whyNow', name: 'Why now', type: 'text', width: 280, writable: false },
    ],
  },
  {
    id: 'blank', label: 'CEO Contact List', blurb: 'A freeform list you own: name, company, phone, notes.',
    entityType: null,
    fields: [
      { key: 'name', name: 'Name', type: 'text', width: 200, writable: true },
      { key: 'company', name: 'Company', type: 'text', width: 180, writable: true },
      { key: 'email', name: 'Email', type: 'text', width: 200, writable: true },
      { key: 'phone', name: 'Phone', type: 'text', width: 150, writable: true },
      { key: 'notes', name: 'Notes', type: 'text', width: 280, writable: true },
    ],
  },
]

export const blankColumns: LinkedField[] = [
  { key: 'a', name: 'A', type: 'text', width: 180, writable: true },
  { key: 'b', name: 'B', type: 'text', width: 160, writable: true },
  { key: 'c', name: 'C', type: 'number', width: 140, writable: true },
  { key: 'd', name: 'D', type: 'currency', width: 150, writable: true },
  { key: 'e', name: 'E', type: 'formula', width: 160, writable: true },
]

export const templateById = Object.fromEntries(linkedTemplates.map(t => [t.id, t])) as Record<string, LinkedTemplate>
