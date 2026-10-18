/**
 * Settings → Notifications: text alerts. A member adds a mobile number, confirms it with a
 * code, and picks which alerts come by text. Staged until the site's Twilio keys are added.
 */
import { MessageSquareText } from 'lucide-react'
import { useEffect, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { confirmPhoneCode, smsStatus, startPhoneVerification } from '@/lib/sms.functions'

const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

const GROUPS = [
  { id: 'intros', label: 'Introductions' },
  { id: 'meetings', label: 'Meeting invites' },
  { id: 'concierge', label: 'Concierge suggestions' },
  { id: 'messages', label: 'Direct messages' },
] as const

interface Phone { phone_e164: string; verified_at: string | null; sms_kinds: string[] }

export function TextAlerts() {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [phone, setPhone] = useState<Phone | null>(null)
  const [input, setInput] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')

  const load = async () => {
    const r = await db.from('member_phones').select('phone_e164, verified_at, sms_kinds').maybeSingle()
    setPhone(r.data ?? null)
  }
  useEffect(() => {
    void smsStatus().then(r => setConfigured(r.configured)).catch(() => setConfigured(false))
    void load()
  }, [])
  if (configured === null) return null

  const run = async (kind: string, action: () => Promise<void>) => {
    setBusy(kind); setMsg('')
    try { await action() } catch (e) { setMsg(e instanceof Error ? e.message : 'That did not work. Please try again.') }
    setBusy('')
  }
  const send = () => run('send', async () => { await startPhoneVerification({ data: { phone: input } }); setCode(''); setMsg('We texted you a six-digit code.'); await load() })
  const confirm = () => run('confirm', async () => { await confirmPhoneCode({ data: { code } }); setMsg('Number confirmed. Text alerts are on.'); await load() })
  const toggle = (group: string) => run('kinds', async () => {
    if (!phone) return
    const next = phone.sms_kinds.includes(group) ? phone.sms_kinds.filter(k => k !== group) : [...phone.sms_kinds, group]
    const { error } = await db.from('member_phones').update({ sms_kinds: next }).eq('phone_e164', phone.phone_e164)
    if (error) throw new Error('Could not save your choice.')
    setPhone({ ...phone, sms_kinds: next })
  })
  const remove = () => run('remove', async () => { await db.from('member_phones').delete().eq('phone_e164', phone?.phone_e164 ?? ''); setPhone(null); setInput(''); setMsg('Number removed. No more texts.') })

  return <div className="push-settings text-alerts">
    <p><MessageSquareText size={14} aria-hidden /> Get the alerts that matter by text: at most 10 a day. Only you see your number.</p>
    {!configured && <p>Text alerts are not set up for this site yet.</p>}
    {configured && !phone?.verified_at && <div className="text-alerts-row">
      <input inputMode="tel" autoComplete="tel" placeholder="+1 555 555 0100" value={input} onChange={e => setInput(e.target.value)} aria-label="Mobile number" />
      <button type="button" className="push-btn" disabled={!input.trim() || !!busy} onClick={() => void send()}>{busy === 'send' ? 'Sending…' : phone ? 'Send a new code' : 'Text me a code'}</button>
    </div>}
    {configured && phone && !phone.verified_at && <div className="text-alerts-row">
      <input inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" maxLength={6} value={code} onChange={e => setCode(e.target.value)} aria-label="Confirmation code" />
      <button type="button" className="push-btn" disabled={code.length !== 6 || !!busy} onClick={() => void confirm()}>{busy === 'confirm' ? 'Checking…' : 'Confirm'}</button>
    </div>}
    {phone?.verified_at && <>
      <p>Texts go to <b>{phone.phone_e164}</b>.</p>
      <div className="text-alerts-kinds">{GROUPS.map(g => <label key={g.id}><input type="checkbox" checked={phone.sms_kinds.includes(g.id)} disabled={!!busy} onChange={() => void toggle(g.id)} /> {g.label}</label>)}</div>
      <div className="push-actions"><button type="button" className="push-btn quiet" disabled={!!busy} onClick={() => void remove()}>Remove number</button></div>
    </>}
    {msg && <p className="push-msg">{msg}</p>}
  </div>
}
