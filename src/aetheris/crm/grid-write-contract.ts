/** Reject unconfirmed CRM / linked Grid writes before events or UI success. */
export async function requireSavedGridRecord<T>(write: Promise<T | null>): Promise<T> {
  let saved: T | null
  try {
    saved = await write
  } catch {
    throw new Error('That Grid edit could not be saved. Check your connection or permissions and retry.')
  }
  if (saved === null) {
    throw new Error('That Grid edit could not be saved. Check your connection or permissions and retry.')
  }
  return saved
}
