/** Data-only exports. Never evaluate model-generated scripts or spreadsheet formulas. */
export async function downloadButlerFile(value: string) {
  const data = JSON.parse(value) as { name?: unknown; format?: unknown; content?: unknown; rows?: unknown }
  const format = String(data.format ?? '')
  if (!['txt', 'md', 'csv', 'json', 'xlsx'].includes(format)) throw new Error('Use a text, CSV, JSON or XLSX export.')
  const name = String(data.name ?? 'butler-export').replace(/[^a-z0-9_. -]/gi, '_').replace(/^\.+/, '').slice(0, 100) || 'butler-export'
  let blob: Blob
  if (format === 'xlsx') {
    if (!Array.isArray(data.rows) || data.rows.length > 500 || data.rows.some(row => !Array.isArray(row) || row.length > 50 || row.some(cell => typeof cell !== 'string' && typeof cell !== 'number' && cell !== null))) throw new Error('Workbook export must contain up to 500 rows and 50 columns of plain values.')
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Butler analysis')
    sheet.addRows(data.rows)
    sheet.getRow(1).font = { bold: true }
    sheet.columns.forEach(column => { column.width = 24 })
    blob = new Blob([await workbook.xlsx.writeBuffer() as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  } else {
    if (typeof data.content !== 'string' || data.content.length > 16000) throw new Error('Export content is missing or too large.')
    if (format === 'json') JSON.parse(data.content)
    // CSV is data, not an executable spreadsheet. Use XLSX for formula-like cell values.
    if (format === 'csv' && /(?:^|[,;\t\r\n])\s*"?\s*[=+@-]/m.test(data.content)) throw new Error('This CSV contains formula-like cells. Ask Butler for an XLSX export with plain cell values.')
    blob = new Blob([data.content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8' })
  }
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = name.endsWith('.' + format) ? name : name + '.' + format
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
