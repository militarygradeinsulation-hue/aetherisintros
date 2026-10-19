import { useEffect, useState } from 'react'
import './connection-banner.css'

/** Inform members when browser connectivity is lost. This is advisory only:
 * authorization and write operations still fail closed on their own errors. */
export function ConnectionBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  useEffect(() => {
    const sync = () => setOffline(navigator.onLine === false)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    sync()
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])
  if (!offline) return null
  return <div className="ask-intros-connection-banner" role="status" aria-live="polite">
    <span aria-hidden="true" className="ask-intros-connection-indicator" />
    <span><strong>You're offline.</strong> Messages, introductions and updates may not save. Reconnect before submitting again.</span>
  </div>
}
