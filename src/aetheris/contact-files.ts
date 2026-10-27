// One rule for "is this a contacts spreadsheet?" and one reader for every spreadsheet format.
// Contact sheets always open the CRM import directly — Butler never has to read them.

const TEXT_SHEET = /\.(csv|tsv|txt)$/i
const WORKBOOK = /\.(xlsx|xlsm|xlsb|xls|ods|numbers|fods)$/i
const SHEET_TYPES = /(csv|tab-separated|spreadsheet|excel|ms-excel|opendocument\.spreadsheet|numbers)/i

export function isContactSheet(file: { name: string; type: string }): boolean {
  if (/\.txt$/i.test(file.name)) return false // plain notes are not contact sheets
  return TEXT_SHEET.test(file.name) || WORKBOOK.test(file.name) || SHEET_TYPES.test(file.type)
}

/** Reads the first sheet with data into rows of cells (header row first). */
export async function readSheetRows(file: File): Promise<string[][]> {
  if (TEXT_SHEET.test(file.name) || /csv|tab-separated/i.test(file.type)) {
    const { read, utils } = await import('xlsx')
    const text = await file.text()
    const wb = read(text, { type: 'string', FS: /\.tsv$/i.test(file.name) || text.split('\n')[0]?.includes('\t') ? '\t' : undefined })
    return firstSheet(wb, utils)
  }
  const { read, utils } = await import('xlsx')
  const wb = read(new Uint8Array(await file.arrayBuffer()), { type: 'array', cellDates: true })
  return firstSheet(wb, utils)
}

type Book = { SheetNames: string[]; Sheets: Record<string, unknown> }
type Utils = { sheet_to_json: (ws: never, opts: object) => unknown[][] }

function firstSheet(wb: Book, utils: Utils): string[][] {
  for (const name of wb.SheetNames) {
    const rows = utils.sheet_to_json(wb.Sheets[name] as never, { header: 1, raw: false, defval: '', blankrows: false })
      .map(r => r.map(c => String(c ?? '').trim()))
      .filter(r => r.some(Boolean))
    if (rows.length >= 2) return rows
  }
  throw new Error('That file has no rows under a header row.')
}
