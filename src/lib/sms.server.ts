/**
 * Text alerts through Twilio, with no SDK (server only). Staged: does nothing until
 * TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM (a number or Messaging Service SID)
 * are set. Numbers are confirmed with a six-digit code before any alert is sent
 * (drizzle/migrations/0049).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
async function admin(): Promise<any> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

export const smsConfigured = () => !!(process.env['TWILIO_ACCOUNT_SID'] && process.env['TWILIO_AUTH_TOKEN'] && process.env['TWILIO_FROM'])

export const SMS_GROUPS = ['intros', 'meetings', 'concierge', 'messages'] as const
export type SmsGroup = typeof SMS_GROUPS[number]
const DAILY_ALERT_CAP = 10
const DAILY_CODE_CAP = 5
const CODE_TTL_MS = 10 * 60_000
const MAX_ATTEMPTS = 5

/** A typed phone number as E.164 (+15555550100). Ten digits are read as a US/Canada number. */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim()
  const digits = trimmed.replace(/[^0-9]/g, '')
  let e164 = ''
  if (trimmed.startsWith('+')) e164 = `+${digits}`
  else if (trimmed.startsWith('00')) e164 = `+${digits.slice(2)}`
  else if (digits.length === 10) e164 = `+1${digits}`
  else if (digits.length === 11 && digits.startsWith('1')) e164 = `+${digits}`
  else return null
  return /^\+[1-9][0-9]{7,14}$/.test(e164) ? e164 : null
}

/** Which alert group a notification kind belongs to (mirrors public.sms_group). */
export function smsGroup(kind: string): SmsGroup | null {
  if (kind.startsWith('intro')) return 'intros'
  if (kind.startsWith('meeting')) return 'meetings'
  if (kind === 'concierge') return 'concierge'
  if (kind.startsWith('message')) return 'messages'
  return null
}

/** The text sent for a notification: short, no links that could be mistaken for phishing beyond our own site. */
export function smsBody(text: string, appUrl: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  const short = clean.length > 240 ? `${clean.slice(0, 237)}…` : clean
  return `Ask Intros: ${short} ${appUrl.replace(/\/$/, '')}/app`
}

export async function hashCode(code: string, userId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`sms-code:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${userId}:${code}`)))
  return [...sig].map(b => b.toString(16).padStart(2, '0')).join('')
}

async function serverSecret(): Promise<string> {
  const { getSetting } = await import('./app-settings.server')
  const secret = (await getSetting('dispatch_secret')) || process.env['CRON_SECRET'] || ''
  if (!secret) throw new Error('Server secret is not set up yet.')
  return secret
}

export async function sendSms(to: string, body: string): Promise<{ ok: boolean; status: number }> {
  const sid = process.env['TWILIO_ACCOUNT_SID'] ?? ''
  const from = process.env['TWILIO_FROM'] ?? ''
  const params = new URLSearchParams({ To: to, Body: body, ...(from.startsWith('MG') ? { MessagingServiceSid: from } : { From: from }) })
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${sid}:${process.env['TWILIO_AUTH_TOKEN'] ?? ''}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
    signal: AbortSignal.timeout(10_000),
  })
  return { ok: res.ok, status: res.status }
}

const today = () => new Date().toISOString().slice(0, 10)

/** Sends a confirmation code to a new number (replacing any previous number). */
export async function startPhoneVerification(userId: string, rawPhone: string): Promise<{ phone: string }> {
  if (!smsConfigured()) throw new Error('Text alerts are not set up for this site yet.')
  const phone = normalizePhone(rawPhone)
  if (!phone) throw new Error('Enter a mobile number with its country code, like +1 555 555 0100.')
  const db = await admin()
  const { data: existing } = await db.from('member_phones').select('codes_sent_today, codes_day').eq('user_id', userId).maybeSingle()
  const sentToday = existing?.codes_day === today() ? existing.codes_sent_today : 0
  if (sentToday >= DAILY_CODE_CAP) throw new Error('Too many codes today. Please try again tomorrow.')
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000).padStart(6, '0')
  const { error } = await db.from('member_phones').upsert({
    user_id: userId, phone_e164: phone, verified_at: null,
    code_hash: await hashCode(code, userId, await serverSecret()),
    code_expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(), code_attempts: 0,
    codes_sent_today: sentToday + 1, codes_day: today(), updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) throw new Error('Could not save the number.')
  const sent = await sendSms(phone, `Your Ask Intros code is ${code}. It expires in 10 minutes.`)
  if (!sent.ok) throw new Error('The code could not be sent to that number.')
  return { phone }
}

export async function confirmPhone(userId: string, code: string): Promise<{ confirmed: true }> {
  const db = await admin()
  const { data: row } = await db.from('member_phones').select('code_hash, code_expires_at, code_attempts, verified_at').eq('user_id', userId).maybeSingle()
  if (!row?.code_hash || !row.code_expires_at) throw new Error('Request a new code first.')
  if (Date.parse(row.code_expires_at) < Date.now()) throw new Error('That code expired. Request a new one.')
  if (row.code_attempts >= MAX_ATTEMPTS) throw new Error('Too many tries. Request a new code.')
  const { sameSecret } = await import('./app-settings.server')
  if (!/^[0-9]{6}$/.test(code) || !sameSecret(await hashCode(code, userId, await serverSecret()), row.code_hash)) {
    await db.from('member_phones').update({ code_attempts: row.code_attempts + 1 }).eq('user_id', userId)
    throw new Error('That code is not right.')
  }
  await db.from('member_phones').update({ verified_at: new Date().toISOString(), code_hash: null, code_expires_at: null, code_attempts: 0, updated_at: new Date().toISOString() }).eq('user_id', userId)
  return { confirmed: true }
}

/** Texts a notification when the member confirmed a number and chose that alert group. At most 10 a day. */
export async function textNotification(n: { user_id: string; kind: string; text: string }, appUrl: string): Promise<'sent' | 'skipped' | 'failed'> {
  const group = smsGroup(n.kind)
  if (!group || !smsConfigured()) return 'skipped'
  const db = await admin()
  const { data: p } = await db.from('member_phones').select('phone_e164, verified_at, sms_kinds, sent_today, sent_day').eq('user_id', n.user_id).maybeSingle()
  if (!p?.verified_at || !(p.sms_kinds ?? []).includes(group)) return 'skipped'
  const sentToday = p.sent_day === today() ? p.sent_today : 0
  if (sentToday >= DAILY_ALERT_CAP) return 'skipped'
  try {
    const r = await sendSms(p.phone_e164, smsBody(n.text, appUrl))
    if (!r.ok) return 'failed'
    await db.from('member_phones').update({ sent_today: sentToday + 1, sent_day: today() }).eq('user_id', n.user_id)
    return 'sent'
  } catch { return 'failed' }
}
