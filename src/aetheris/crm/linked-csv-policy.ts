import type { LinkedEntity } from './types'

/** A linked sheet is a projection, not a second CRM. Quick-create is name-only.
 * Reject extra columns up front instead of silently losing their data.
 * Full CSV mapping is already provided by CRM → Import.
 */
const heads: Partial<Record<LinkedEntity, string[]>> = {
  crm_people: ['person', 'full name', 'fullname', 'name'],
  crm_companies: ['company', 'company name', 'name'],
  crm_opportunities: ['opportunity', 'name'],
  crm_tasks: ['task', 'title'],
}

export function validateLinkedGridCsv(
  type: LinkedEntity,
  headers: string[],
  rows: string[][],
): string | null {
  const accepted = heads[type]
  if (!accepted) return 'This sheet is read-only and cannot import records.'
  if (!rows.length) return 'The CSV contains no records.'
  if (rows.length > 500) return 'Import at most 500 quick-create names at a time.'
  const first = (headers[0] ?? '').trim().toLowerCase()
  if (!accepted.includes(first)) {
    return 'The first column is not the name/title field for this sheet. Use CRM → Import for mapped files.'
  }
  if (headers.slice(1).some(h => h.trim()) ||
      rows.some(r => r.slice(1).some(value => value.trim()))) {
    return 'Linked Grid quick import accepts names only. Use CRM → Import to preserve all CSV columns.'
  }
  if (rows.some(r => !(r[0] ?? '').trim())) {
    return 'Every imported record needs a name/title. Correct blank rows before retrying.'
  }
  return null
}
