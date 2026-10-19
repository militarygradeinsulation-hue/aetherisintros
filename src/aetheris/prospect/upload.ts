export function validateProspectFile(file: { name: string; size: number }) {
  if (!/\.(csv|tsv|txt)$/i.test(file.name)) throw new Error('Choose a CSV or TSV file.')
  if (file.size > 2 * 1024 * 1024) throw new Error('Upload at most 2 MB at a time.')
}
export function validateProspectGrid(rows: string[][]) {
  if (rows.length < 2) throw new Error('That file has no rows under the header.')
  if (rows.length > 501) throw new Error('Import at most 500 records at a time.')
  const width = rows[0]?.length ?? 0
  if (width > 50 || !width) throw new Error('Use between 1 and 50 columns.')
  if (rows.some(r => r.length !== width || r.some(v => v.length > 10000 || v.includes('\0')))) throw new Error('The file has malformed rows or oversized cells.')
}