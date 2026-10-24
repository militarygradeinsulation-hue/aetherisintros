import { useRef, useState, type ReactNode } from 'react'
import { Send } from 'lucide-react'
import './network-comment-composer.css'

/** Keep a comment draft until the canonical store confirms its server receipt. */
export function NetworkCommentComposer({ onSubmit, className, children }: {
  onSubmit: (text: string) => Promise<boolean>
  className?: string
  children?: ReactNode
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)

  const submit = async () => {
    const draft = text.trim()
    if (!draft || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      if (await onSubmit(draft)) setText('')
      else setError('Comment not saved. Your draft is still here.')
    } catch {
      setError('Comment could not be confirmed. Your draft is still here.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return <div className={`network-comment-composer ${className ?? ''}`} data-avatar={children ? 'true' : undefined} aria-busy={busy}>
    {children}
    <input aria-label="Comment" value={text} disabled={busy}
      onChange={event => { setText(event.target.value); setError('') }}
      onKeyDown={event => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault()
          void submit()
        }
      }} placeholder="Add useful context to the discussion…" />
    <button className="network-comment-submit" type="button" disabled={busy || !text.trim()} aria-label={busy ? 'Saving comment' : 'Post comment'} onClick={() => void submit()}>
      <Send size={14} />
    </button>
    {error && <small role="alert">{error}</small>}
  </div>
}
