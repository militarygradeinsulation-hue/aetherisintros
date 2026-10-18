/** Never attempt to insert invalid or duplicate CRM records.
 * Turning off skip mode requires the user to resolve every validation error.
 */
export function safeImportSelection<T extends { errors: string[] }>(
  checked: readonly T[],
  skipInvalid: boolean,
): { rows: T[]; error: string | null } {
  const bad = checked.filter(row => row.errors.length > 0)
  if (bad.length && !skipInvalid) {
    return {
      rows: [],
      error: `${bad.length} row(s) need attention. Fix their mapping or enable Skip invalid and duplicate rows.`,
    }
  }
  return { rows: checked.filter(row => row.errors.length === 0), error: null }
}
