/** Fail closed on database/RLS denials and zero-row updates to launch controls.
 * No response is treated as success without a matching server-confirmed row.
 */
export async function requireConfirmedAdminWrite<T>(
  operation: () => Promise<{ data: T | null; error: { message: string } | null }>,
  matches: (row: T) => boolean,
  label: string,
): Promise<T> {
  let result: { data: T | null; error: { message: string } | null }
  try {
    result = await operation()
  } catch {
    throw new Error(`${label} could not reach the database. No change was confirmed.`)
  }
  if (!result || result.error || result.data === null || !matches(result.data)) {
    throw new Error(`${label} was not confirmed by the database. Please retry.`)
  }
  return result.data
}
