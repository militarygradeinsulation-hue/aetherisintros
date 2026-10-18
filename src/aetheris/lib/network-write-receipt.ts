/** Confirm a live post/ask write is visible to the same signed-in member.
 * A successful HTTP response without a matching row is NOT a saved post.
 * This is used before local feed, learning, or activity mutations.
 */
type NetworkReceipt = {
  data: { id: string; author_id: string } | null
  error: { message?: string } | null
}

export async function requireSavedNetworkRecord(
  write: () => Promise<NetworkReceipt>,
  requestedId: string,
  userId: string,
  label: 'post' | 'need',
): Promise<void> {
  if (!requestedId || !userId) throw new Error('Sign in before publishing to the network.')
  let result: NetworkReceipt
  try {
    result = await write()
  } catch {
    throw new Error(`Your ${label} could not be confirmed. Check your connection and retry.`)
  }
  if (!result || result.error || result.data?.id !== requestedId || result.data?.author_id !== userId) {
    throw new Error(`Your ${label} was not confirmed saved. Check your connection or permissions and retry.`)
  }
}
