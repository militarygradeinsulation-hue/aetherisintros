import { useState } from 'react'
import { Send } from 'lucide-react'

/** Share only the visible post text. Never expose signed attachment URLs. */
export function PostShareButton({ text }: { text: string }) {
  const [status, setStatus] = useState('')
  const share = async () => {
    setStatus('')
    try {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        setStatus('Post text copied')
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setStatus('Could not share. Please try again.')
    }
  }
  return <span className="post-share-control"><button type="button" onClick={() => void share()} aria-label="Share post"><Send size={16} />Share</button>{status && <small role="status">{status}</small>}</span>
}
