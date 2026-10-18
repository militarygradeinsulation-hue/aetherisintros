/** Validate CSV completely before modifying an existing canonical Grid/CRM. */
interface Column { key: string; name: string }
const normalize = (name: string) => name.trim().toLocaleLowerCase('en-US')

function validateShape(header: string[], body: string[][]) {
  if (!header.length || !body.length) throw new Error('CSV needs a header row and at least one data row.')
  if (body.length > 5000) throw new Error('CSV has more than 5,000 rows. Import in smaller batches.')
  if (header.some(h => !h.trim())) throw new Error('CSV column names cannot be empty.')
  if (new Set(header.map(normalize)).size !== header.length) throw new Error('CSV contains duplicate column headings.')
  if (body.some(row => row.length > header.length)) throw new Error('CSV contains data without a matching column heading.')
}

/** Freeform cells are stored once through the existing account-scoped grid_rows table. */
export function preflightFreeformCsv(
  header: string[], body: string[][], columns: Column[],
): Array<Record<string, unknown>> {
  validateShape(header, body)
  const keys = header.map(name => columns.find(c => normalize(c.name) === normalize(name))?.key)
  if (keys.some(k => !k)) {
    const missing = header.filter((_, i) => !keys[i])
    throw new Error(`Unmapped CSV columns: ${missing.join(', ')}. Add or rename Grid columns before importing.`)
  }
  return body.map(line => Object.fromEntries(
    header.map((_, i) => [keys[i]!, line[i] ?? '']),
  ))
}

/** Linked Grid imports are deliberately primary-field-only. For additional
 * fields members must use the existing CRM importer with an explicit mapping.
 */
export function preflightLinkedNames(
  header: string[], body: string[][], primaryHeader: string,
): string[] {
  validateShape(header, body)
  if (header.length !== 1 || !primaryHeader || normalize(header[0]!) !== normalize(primaryHeader)) {
    throw new Error('Linked Grid CSV accepts one primary-name column only. Use CRM > Import for mapped people and company fields.')
  }
  const names = body.map(line => (line[0] ?? '').trim())
  if (names.some(name => !name)) throw new Error('Linked CSV contains a blank record name. No records were changed.')
  if (new Set(names.map(normalize)).size !== names.length) throw new Error('Linked CSV repeats a record name. Review duplicates before importing.')
  return names
}
