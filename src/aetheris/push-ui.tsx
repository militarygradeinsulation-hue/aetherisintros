/**
 * "Get notifications on this device" and "Install the app": shown in the notifications panel
 * and in Settings. Explains the iPhone rule (add to Home Screen first) and blocked permissions.
 */
import { BellRing, Download, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'

import { canInstall, disablePush, enablePush, isStandalone, onInstallChange, promptInstall, pushState, type PushState } from './push-client'

export function PushSettings({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [installable, setInstallable] = useState(false)
  useEffect(() => {
    void pushState().then(setState).catch(() => setState('unsupported'))
    setInstallable(canInstall())
    return onInstallChange(() => setInstallable(canInstall()))
  }, [])
  if (!state) return null

  const toggle = async () => {
    setBusy(true); setMsg('')
    try { setState(state === 'on' ? await disablePush() : await enablePush()) } catch (e) { setMsg(e instanceof Error ? e.message : 'That did not work. Please try again.') }
    setBusy(false)
  }

  return <div className={`push-settings${compact ? ' compact' : ''}`}>
    {state === 'on' && <p><BellRing size={14} aria-hidden /> Notifications are on for this device.</p>}
    {state === 'off' && <p><BellRing size={14} aria-hidden /> Get introductions, replies and meeting invites on this device as they happen.</p>}
    {state === 'blocked' && <p><BellRing size={14} aria-hidden /> Notifications are blocked for this site. Allow them in your browser's site settings, then come back.</p>}
    {state === 'ios-install-first' && <p><Smartphone size={14} aria-hidden /> On iPhone: tap <b>Share</b>, then <b>Add to Home Screen</b>. Open Ask Intros from your Home Screen to turn on notifications.</p>}
    {state === 'unsupported' && !compact && <p>This browser cannot show notifications.</p>}
    <div className="push-actions">
      {(state === 'on' || state === 'off') && <button type="button" className={state === 'on' ? 'push-btn quiet' : 'push-btn'} disabled={busy} onClick={() => void toggle()}>
        {busy ? 'One moment…' : state === 'on' ? 'Turn off on this device' : 'Turn on notifications'}</button>}
      {installable && !isStandalone() && <button type="button" className="push-btn quiet" onClick={() => void promptInstall()}><Download size={13} /> Install the app</button>}
    </div>
    {msg && <p className="push-msg">{msg}</p>}
  </div>
}
