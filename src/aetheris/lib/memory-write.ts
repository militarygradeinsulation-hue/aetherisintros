export const MEMORY_FAILURE = 'Your Memory save was not confirmed. Your draft is still here. Please retry.'
export interface MemoryReceipt { id: string; user_id: string; text: string; source: string }
type Result = { data: MemoryReceipt | null; error: unknown }

/** Database triggers can suppress duplicates; verify the existing owner-bound row. */
export async function confirmMemoryWrite(
  insert: () => PromiseLike<Result>,
  findDuplicate: () => PromiseLike<Result>,
  expected: MemoryReceipt,
): Promise<void> {
  try {
    let result = await insert()
    if (result.error) throw new Error(MEMORY_FAILURE)
    if (result.data && result.data.id !== expected.id) throw new Error(MEMORY_FAILURE)
    if (!result.data) result = await findDuplicate()
    if (result.error || !result.data?.id || result.data.user_id !== expected.user_id ||
      result.data.text !== expected.text || result.data.source !== expected.source) throw new Error(MEMORY_FAILURE)
  } catch { throw new Error(MEMORY_FAILURE) }
}
