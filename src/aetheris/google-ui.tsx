/**
 * Google Calendar connection (Settings → Connected apps) and the private calendar line on a
 * member's profile. Read-only: the app sees who you met and when, never meeting content.
 */
import { CalendarDays } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { supabase } from '@/integrations/supabase/client'
import { disconnectGoogle, googleStatus, startGoogleConnect, syncGoogleNow, type GoogleStatus } from '@/lib/google.functions'

const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

/** After Google sends the member back to /app?google=…, say what happened once. */
export function announceGoogleReturn() {
  const params = new URLSearchParams(location.search)
  const result = params.get('google')
  if (!result) return
  if (result === 'connected') toast.success('Google Calendar connected. Your meetings with members now show on their profiles, visible only to you.')
  else if (result === 'failed') toast.error('Google Calendar could not be connected. Please try again from Settings.')
  params.delete('google')
  history.replaceState(history.state, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`)
}

const when = (iso: string | null) => iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'not yet'

export function GoogleCalendarConnect() {
  const [status, setStatus] = useState<GoogleStatus | null>(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const load = () => googleStatus().then(setStatus).catch(() => setStatus({ configured: false, connected: false, email: '', lastSyncAt: null, lastError: '' }))
  useEffect(() => { void load() }, [])
  if (!status) return null

  const run = async (kind: string, action: () => Promise<void>) => {
    setBusy(kind); setMsg('')
    try { await action() } catch (e) { setMsg(e instanceof Error ? e.message : 'That did not work. Please try again.') }
    setBusy('')
  }
  const connect = () => run('connect', async () => { const { url } = await startGoogleConnect(); location.assign(url) })
  const sync = () => run('sync', async () => { const { matched } = await syncGoogleNow(); setMsg(matched ? `Found meetings with ${matched} member${matched === 1 ? '' : 's'}.` : 'Synced. No meetings with members found yet.'); await load() })
  const remove = () => run('disconnect', async () => { await disconnectGoogle(); setMsg('Disconnected. Your calendar data was removed.'); await load() })

  return <div className="connected-app">
    <header><CalendarDays size={18} aria-hidden /><div><b>Google Calendar</b><small>{status.connected ? `Connected as ${status.email || 'your Google account'}` : 'Not connected'}</small></div></header>
    <p>See when you last met each member and when you meet next, on their profile, visible only to you. Ask Intros reads who attended and when, never titles, notes or other details, and never writes to your calendar.</p>
    {status.connected && <p className="connected-app-meta">Last synced {when(status.lastSyncAt)}. Syncs daily.{status.lastError ? ` Last attempt failed: ${status.lastError}` : ''}</p>}
    <div className="connected-app-actions">
      {!status.connected && <button type="button" className="push-btn" disabled={!status.configured || !!busy} onClick={() => void connect()}>{busy === 'connect' ? 'Opening Google…' : 'Connect Google Calendar'}</button>}
      {status.connected && <>
        <button type="button" className="push-btn" disabled={!!busy} onClick={() => void sync()}>{busy === 'sync' ? 'Syncing…' : 'Sync now'}</button>
        <button type="button" className="push-btn quiet" disabled={!!busy} onClick={() => void remove()}>{busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}</button>
      </>}
    </div>
    {!status.configured && <p className="connected-app-meta">Google sign-in is not set up for this site yet.</p>}
    {msg && <p className="push-msg">{msg}</p>}
    <p className="connected-app-meta">Gmail is coming later: reading email requires Google's security assessment for restricted access, which we will complete first.</p>
  </div>
}

interface CalendarSignal { last_at: string | null; next_at: string | null; count_90d: number }

/** Your own calendar's view of one member, or null when there is none. */
export function useCalendarSignal(memberId: string): CalendarSignal | null {
  const [signal, setSignal] = useState<CalendarSignal | null>(null)
  useEffect(() => {
    let live = true
    void db.from('relationship_signals').select('last_at, next_at, count_90d').eq('member_id', memberId).eq('source', 'calendar').maybeSingle()
      .then((r: { data: CalendarSignal | null }) => { if (live) setSignal(r.data ?? null) })
    return () => { live = false }
  }, [memberId])
  return signal
}

export function CalendarSignalRows({ memberId }: { memberId: string }) {
  const s = useCalendarSignal(memberId)
  if (!s) return null
  const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
  return <>
    <div><dt>Last met (calendar)</dt><dd>{s.last_at ? `${day(s.last_at)} · ${s.count_90d} meeting${s.count_90d === 1 ? '' : 's'} in 90 days` : 'No recent meetings'}</dd></div>
    {s.next_at && <div><dt>Next meeting</dt><dd>{day(s.next_at)}</dd></div>}
  </>
}
