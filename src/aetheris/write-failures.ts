/** Shared delivery failure feedback for writes that originate in several product surfaces.
 * Never report "saved" before acknowledgement. Retrying reuses the original action.
 */
export const WRITE_FAILURE_EVENT = 'aetheris:write-failed'
export type WriteFailure = { title: string; message: string; retry: () => Promise<void> }
export function reportWriteFailure(failure: WriteFailure) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<WriteFailure>(WRITE_FAILURE_EVENT, { detail: failure }))
}
