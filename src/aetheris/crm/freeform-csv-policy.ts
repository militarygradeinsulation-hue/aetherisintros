/** Validate every CSV column before touching the canonical account-scoped Grid.
 * This complements the existing linked-CRM quick-create policy, not a second importer.
 */
interface Column { key: string; name: string }
const normalize = (s: string) => s.trim().toLocaleLowerCase('en-US')

export function preflightFreeformCsv(
  header: string[],
  rows: string[][],
  columns: Column[],
): Array<Record<string, unknown>> {
  if (!header.length || !rows.length) throw new Error('CSV needs headers and at least one row.')
  if (rows.length > 5000) throw new Error('Import at most 5,000 freeform rows at a time.')
  if (header.some(name => !name.trim())) throw new Error('CSV has a blank column heading.')
  if (new Set(header.map(normalize)).size !== header.length) {
    throw new Error('CSV has duplicate column headings. Rename them before import.')
  }
  if (rows.some(row => row.length > header.length)) {
    throw new Error('A CSV row has more values than headings. No rows were imported.')
  }
  const keys = header.map(name => columns.find(column => normalize(column.name) === normalize(name))?.key)
  if (keys.some(key => !key)) {
    const missing = header.filter((_, index) => !keys[index])
    throw new Error(`Unmapped CSV columns: ${missing.join(', ')}. Add those columns to Grid before import.`)
  }
  if (new Set(keys).size !== keys.length) {
    throw new Error('Multiple CSV headings map to the same Grid column. No rows were imported.')
  }
  return rows.map(line => Object.fromEntries(header.map((_, index) => [keys[index]!, line[index] ?? ''])))
}
