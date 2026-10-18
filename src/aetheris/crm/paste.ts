/** Turn a rectangular clipboard range into one update per existing row and
 * one complete new row per overflow row. No duplicate cell writes or silent truncation.
 * This planner never stores a second data copy; all IDs remain canonical Grid IDs.
 */
export interface FreeformPasteRow {
  id: string
  values: Record<string, unknown>
}

export interface FreeformPastePlan {
  updates: Array<{ rowId: string; values: Record<string, unknown> }>
  appended: Array<Record<string, unknown>>
}

export function planFreeformPaste(
  rows: FreeformPasteRow[],
  columns: Array<{ key: string }>,
  startRow: number,
  startColumn: number,
  matrix: string[][],
): FreeformPastePlan {
  if (!Number.isInteger(startRow) || !Number.isInteger(startColumn)
    || startRow < 0 || startColumn < 0 || startRow > rows.length) {
    throw new Error('Select a valid Grid cell before pasting.')
  }
  if (matrix.some(row => startColumn + row.length > columns.length)) {
    throw new Error('Your clipboard has more columns than this sheet. Add columns first, then paste again.')
  }
  const count = matrix.reduce((sum, cells) => sum + cells.length, 0)
  if (count > 10000) {
    throw new Error('This paste exceeds 10,000 cells. Import a CSV instead.')
  }
  const updates: FreeformPastePlan['updates'] = []
  const appended: FreeformPastePlan['appended'] = []
  matrix.forEach((line, lineIndex) => {
    const at = startRow + lineIndex
    const changes: Record<string, unknown> = {}
    line.forEach((value, offset) => {
      const key = columns[startColumn + offset]?.key
      if (key) changes[key] = value
    })
    const existing = rows[at]
    if (existing) updates.push({ rowId: existing.id, values: { ...existing.values, ...changes } })
    else appended.push(changes)
  })
  return { updates, appended }
}
