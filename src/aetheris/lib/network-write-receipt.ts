/** A live write is confirmed only when the server returns the requested record and owner. */
type NetworkReceipt = {
  data: { id: string; author_id: string | null } | null
  error: { message?: string; code?: string; status?: number } | null
}

export type NetworkWriteFailure = 'network' | 'permission' | 'validation' | 'unconfirmed'

export class NetworkWriteError extends Error {
  constructor(
    public readonly reason: NetworkWriteFailure,
    label: 'post' | 'need',
  ) {
    super({
      network: `Your ${label} could not be confirmed. Check your connection and retry.`,
      permission: `Your ${label} could not be saved because access was denied. Sign in again or contact support.`,
      validation: `Your ${label} was rejected. Review the content and try again.`,
      unconfirmed: `Your ${label} was not confirmed saved. Refresh before retrying to avoid a duplicate.`,
    }[reason])
    this.name = 'NetworkWriteError'
  }
}

function classify(error: NetworkReceipt['error']): NetworkWriteFailure {
  if (!error) return 'unconfirmed'
  const code = error.code ?? ''
  const status = error.status
  if (code === '42501' || status === 401 || status === 403) return 'permission'
  if (code === '23514' || code === '23502' || code === '22P02' || status === 400 || status === 422) return 'validation'
  if (status === 0 || (status !== undefined && status >= 500)) return 'network'
  return 'unconfirmed'
}

export async function requireSavedNetworkRecord(
  write: () => Promise<NetworkReceipt>,
  requestedId: string,
  userId: string,
  label: 'post' | 'need',
): Promise<void> {
  if (!requestedId || !userId) throw new NetworkWriteError('permission', label)
  let result: NetworkReceipt
  try {
    result = await write()
  } catch {
    throw new NetworkWriteError('network', label)
  }
  if (result?.error) throw new NetworkWriteError(classify(result.error), label)
  if (result?.data?.id !== requestedId || result?.data?.author_id !== userId) {
    throw new NetworkWriteError('unconfirmed', label)
  }
}
