/** Fail closed for CRM-linked and contact-shaped Grid downloads.
 * This is a UI policy guard; server-side private-library RLS remains authoritative.
 * Non-contact freeform spreadsheets (budgets, calculations) may still export.
 */
interface ExportColumn { key: string; name: string }
interface ExportRow { values: Record<string, unknown> }
const contactLabel = /\b(person|people|contact|customer|client|lead|prospect|member|name|company|organization|business|email|e-mail|phone|mobile|address|linkedin|profile)\b/i
const emailContent = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const phoneContent = /(?:\+\d{1,3}[\s.-]*)?\(?\d{3}\)?[\s.-]+\d{3}[\s.-]+\d{4}\b/

export function gridExportContainsContacts(
  linked: boolean,
  columns: ExportColumn[],
  rows: ExportRow[],
): boolean {
  if (linked) return true
  if (columns.some(c => contactLabel.test(c.name) || contactLabel.test(c.key))) return true
  return rows.some(r => Object.values(r.values).some(v =>
    typeof v === 'string' && (emailContent.test(v) || phoneContent.test(v))))
}
