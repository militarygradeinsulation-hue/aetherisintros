/** Reject unconfirmed Intent Exchange writes, including RLS-ignored updates. */
export function confirmIntentReceipt(
  row: { id: string; author_id: string | null; status: string | null } | null,
  error: { message?: string } | null,
  expectedId: string,
  ownerId: string,
  expectedStatus: 'active' | 'closed',
): void {
  if (!expectedId || !ownerId) throw Error('A verified member session is required.')
  if (error || !row || row.id !== expectedId || row.author_id !== ownerId || row.status !== expectedStatus) {
    throw Error('The database did not confirm this signal change.')
  }
}
