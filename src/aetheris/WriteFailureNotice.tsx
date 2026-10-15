import { useEffect, useState } from 'react'
import { WRITE_FAILURE_EVENT, type WriteFailure } from './write-failures'

/** Fixed-position warning shared by conversations, reactions, comments and follows. */
export function WriteFailureNotice() {
  const [failure, setFailure] = useState<WriteFailure | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const receive = (event: Event) => setFailure((event as CustomEvent<WriteFailure>).detail)
    window.addEventListener(WRITE_FAILURE_EVENT, receive)
    return () => window.removeEventListener(WRITE_FAILURE_EVENT, receive)
  }, [])
  if (!failure) return null
  const retry = async () => {
    if (busy) return
    setBusy(true)
    const initial = failure
    setFailure(null)
    try { await initial.retry() } catch { setFailure(initial) }
    finally { setBusy(false) }
  }
  return <div role="alert" className="fixed right-3 top-20 z-[110] max-w-sm w-[calc(100vw-1.5rem)] rounded-xl border border-red-400/60 bg-[#241821] text-[#FFF0F0] shadow-2xl p-4">
    <strong className="block font-semibold text-sm">{failure.title}</strong>
    <p className="text-xs mt-2 mb-3">{failure.message} Your change was not confirmed and may not have been saved.</p>
    <div className="flex gap-3 items-center">
      <button type="button" disabled={busy} className="rounded-md border border-[#F5B027] px-4 py-2 text-xs font-semibold" onClick={() => void retry()}>{busy ? 'Retrying…' : 'Retry'}</button>
      <button type="button" className="text-xs underline" onClick={() => setFailure(null)}>Dismiss</button>
    </div>
  </div>
}
