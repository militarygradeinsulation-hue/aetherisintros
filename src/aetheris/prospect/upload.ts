export function validateProspectFile(file: { name: string; size: number }, maxBytes = 2 * 1024 * 1024) {
  if (!/\.(csv|tsv|txt)$/i.test(file.name)) throw new Error('Choose a CSV or TSV file.')
  if (file.size > maxBytes) throw new Error(`Upload at most ${Math.round(maxBytes / 1024 / 1024)} MB at a time.`)
}
export function validateProspectGrid(rows: string[][], maxRecords = Number.POSITIVE_INFINITY, maxColumns = Number.POSITIVE_INFINITY) {
  if (rows.length < 2) throw new Error('That file has no rows under the header.')
  if (rows.length > maxRecords + 1) throw new Error(`Import at most ${maxRecords.toLocaleString('en-US')} records at a time.`)
  const width = rows[0]?.length ?? 0
  if (width > maxColumns || !width) throw new Error(`Use between 1 and ${maxColumns} columns.`)
  if (rows.some(r => r.length !== width || r.some(v => v.length > 10000 || v.includes('\0')))) throw new Error('The file has malformed rows or oversized cells.')
}