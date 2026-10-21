/**
 * Google Calendar connection (Settings → Connected apps) and the private calendar line on a
 * member's profile. Read-only: the app sees who you met and when, never meeting content.
 */
import { CalendarDays } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { supabase } from '@/integrations/supabase/client'
import { disconnectGoogle, googleStatus, startGoogleConnect, syncGoogleNow, type GoogleStatus } from '@/lib/google.functions'
import { ghostSyncMeeting } from './crm/ghost-sync'

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
  const load = () => googleStatus().then(setStatus).catch(() => setStatus({ configured: false, connected: false, email: '', lastSyncAt: null, lastError: '', gmailAvailable: false, gmailConnected: false }))
  useEffect(() => { void load() }, [])
  if (!status) return null

  const run = async (kind: string, action: () => Promise<void>) => {
    setBusy(kind); setMsg('')
    try { await action() } catch (e) { setMsg(e instanceof Error ? e.message : 'That did not work. Please try again.') }
    setBusy('')
  }
  const connect = (withGmail = false) => run(withGmail ? 'gmail' : 'connect', async () => { const { url } = await startGoogleConnect({ data: { withGmail } }); location.assign(url) })
  const sync = () => run('sync', async () => {
    const { matched, emailMatched } = await syncGoogleNow()
    const parts = [matched ? `meetings with ${matched} member${matched === 1 ? '' : 's'}` : '', emailMatched ? `email with ${emailMatched} member${emailMatched === 1 ? '' : 's'}` : ''].filter(Boolean)
    setMsg(parts.length ? `Found ${parts.join(' and ')}.` : 'Synced. Nothing with members found yet.')
    await load()
    // Ghost-CRM: for each member whose calendar signals just updated, log a meeting activity so
    // the contact timeline reflects real face-time. Non-blocking — never throws.
    if (matched > 0) {
      void (async () => {
        try {
          const { data } = await db.from('relationship_signals').select('member_id, last_at').eq('source', 'calendar').gt('count_90d', 0)
          for (const row of data ?? []) {
            void ghostSyncMeeting({ theirProfile: { id: row.member_id, name: '', title: '', company: '', location: '' }, eventTitle: 'Calendar meeting', startAt: row.last_at ?? new Date().toISOString() })
          }
        } catch { /* non-blocking */ }
      })()
    }
  })
  const remove = () => run('disconnect', async () => { await disconnectGoogle(); setMsg('Disconnected. Your calendar data was removed.'); await load() })

  return <div className="connected-app">
    <header><CalendarDays size={18} aria-hidden /><div><b>Google Calendar</b><small>{status.connected ? `Connected as ${status.email || 'your Google account'}` : 'Not connected'}</small></div></header>
    <p>See when you last met each member and when you meet next, on their profile, visible only to you. Ask Intros reads who attended and when, never titles, notes or other details, and never writes to your calendar.</p>
    {status.connected && <p className="connected-app-meta">Last synced {when(status.lastSyncAt)}. Syncs daily.{status.lastError ? ` Last attempt failed: ${status.lastError}` : ''}</p>}
    <div className="connected-app-actions">
      {!status.connected && <button type="button" className="push-btn" disabled={!status.configured || !!busy} onClick={() => void connect(false)}>{busy === 'connect' ? 'Opening Google…' : 'Connect Google Calendar'}</button>}
      {status.connected && <>
        <button type="button" className="push-btn" disabled={!!busy} onClick={() => void sync()}>{busy === 'sync' ? 'Syncing…' : 'Sync now'}</button>
        <button type="button" className="push-btn quiet" disabled={!!busy} onClick={() => void remove()}>{busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}</button>
      </>}
    </div>
    {!status.configured && <p className="connected-app-meta">Google sign-in is not set up for this site yet.</p>}
    {msg && <p className="push-msg">{msg}</p>}
    {status.gmailAvailable
      ? <div className="connected-app-gmail">
        <p><b>Gmail</b> {status.gmailConnected ? '· connected' : ''}<br />See when you last emailed each member. Ask Intros reads only who an email was from and to, and when. Never subjects, message text or attachments.</p>
        {!status.gmailConnected && <button type="button" className="push-btn quiet" disabled={!status.configured || !!busy} onClick={() => void connect(true)}>{busy === 'gmail' ? 'Opening Google…' : 'Add Gmail'}</button>}
      </div>
      : <p className="connected-app-meta">Gmail is coming later: reading email requires Google's security assessment for restricted access, which we will complete first.</p>}
  </div>
}

interface CalendarSignal { source: 'calendar' | 'email'; last_at: string | null; next_at: string | null; count_90d: number }

/** What your own calendar and email say about one member (each null when there is nothing). */
export function useRelationshipSignals(memberId: string): { calendar: CalendarSignal | null; email: CalendarSignal | null } {
  const [rows, setRows] = useState<CalendarSignal[]>([])
  useEffect(() => {
    let live = true
    void db.from('relationship_signals').select('source, last_at, next_at, count_90d').eq('member_id', memberId)
      .then((r: { data: CalendarSignal[] | null }) => { if (live) setRows(r.data ?? []) })
    return () => { live = false }
  }, [memberId])
  return { calendar: rows.find(r => r.source === 'calendar') ?? null, email: rows.find(r => r.source === 'email') ?? null }
}

export function CalendarSignalRows({ memberId }: { memberId: string }) {
  const { calendar, email } = useRelationshipSignals(memberId)
  const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  return <>
    {calendar && <div><dt>Last met (calendar)</dt><dd>{calendar.last_at ? `${day(calendar.last_at)} · ${plural(calendar.count_90d, 'meeting')} in 90 days` : 'No recent meetings'}</dd></div>}
    {calendar?.next_at && <div><dt>Next meeting</dt><dd>{day(calendar.next_at)}</dd></div>}
    {email?.last_at && <div><dt>Last emailed</dt><dd>{`${day(email.last_at)} · ${plural(email.count_90d, 'email')} in 90 days`}</dd></div>}
  </>
}
