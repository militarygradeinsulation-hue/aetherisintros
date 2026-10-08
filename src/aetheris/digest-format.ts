/**
 * The weekly digest email: "This week" plus upcoming meetings, as subject, HTML and plain
 * text. Pure, so it is unit-tested and shared by preview and sending. Returns null when
 * nothing is waiting: an empty week is never emailed.
 */
import type { WeekItem } from './this-week-core'

export interface DigestMeeting { title: string; startsAt: string }

export interface DigestInput {
  firstName: string
  items: WeekItem[]
  meetings: DigestMeeting[]
  appUrl: string
  unsubscribeUrl: string
  timeZone?: string
}

export interface DigestEmail { subject: string; html: string; text: string }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const destination: Record<WeekItem['target'], string> = { intros: 'introductions', needs: 'needs', organization: 'organization' }

export function digestEmail(input: DigestInput): DigestEmail | null {
  const { items, meetings } = input
  if (!items.length && !meetings.length) return null
  const when = (iso: string) => new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', ...(input.timeZone ? { timeZone: input.timeZone } : {}),
  })
  const subject = items.length
    ? `${plural(items.length, 'thing')} waiting on you this week${meetings.length ? ` · ${plural(meetings.length, 'meeting')}` : ''}`
    : `Your week on Ask Intros: ${plural(meetings.length, 'meeting')}`
  const hello = input.firstName ? `Good morning, ${input.firstName}.` : 'Good morning.'
  const link = (target: WeekItem['target']) => `${input.appUrl}/app/${destination[target]}`

  const text = [
    hello, '',
    items.length ? 'Waiting on you:' : '',
    ...items.map(i => `- ${i.title}\n  ${i.detail}\n  ${i.action}: ${link(i.target)}`),
    items.length ? '' : '',
    meetings.length ? 'Meetings this week:' : '',
    ...meetings.map(m => `- ${m.title} (${when(m.startsAt)})`),
    '', `Open Ask Intros: ${input.appUrl}`,
    `Stop these emails: ${input.unsubscribeUrl}`,
  ].filter((l, i, all) => l !== '' || all[i - 1] !== '').join('\n')

  const row = (i: WeekItem) => `<tr><td style="padding:14px 0;border-top:1px solid #E6E1D8">
    <div style="font:600 15px/1.4 Georgia,serif;color:#111">${esc(i.title)}</div>
    <div style="font:14px/1.5 -apple-system,Segoe UI,sans-serif;color:#555;margin:4px 0 8px">${esc(i.detail)}</div>
    <a href="${esc(link(i.target))}" style="font:600 13px -apple-system,Segoe UI,sans-serif;color:#9A6A00;text-decoration:none">${esc(i.action)} →</a>
  </td></tr>`
  const html = `<!doctype html><html><body style="margin:0;background:#F6F3EE;padding:24px">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;padding:28px">
    <tr><td style="font:700 11px -apple-system,Segoe UI,sans-serif;letter-spacing:.14em;color:#9A6A00">ASK INTROS · THIS WEEK</td></tr>
    <tr><td style="font:22px/1.3 Georgia,serif;color:#111;padding:10px 0 6px">${esc(hello)}</td></tr>
    ${items.length ? `<tr><td style="font:14px -apple-system,Segoe UI,sans-serif;color:#555;padding-bottom:6px">${esc(plural(items.length, 'thing'))} waiting on you.</td></tr>${items.map(row).join('')}` : ''}
    ${meetings.length ? `<tr><td style="font:600 13px -apple-system,Segoe UI,sans-serif;color:#111;padding:18px 0 6px">Meetings this week</td></tr>
    ${meetings.map(m => `<tr><td style="font:14px/1.6 -apple-system,Segoe UI,sans-serif;color:#333">${esc(m.title)} <span style="color:#777">· ${esc(when(m.startsAt))}</span></td></tr>`).join('')}` : ''}
    <tr><td style="padding-top:22px"><a href="${esc(input.appUrl)}" style="display:inline-block;background:#F5B027;color:#111;font:600 14px -apple-system,Segoe UI,sans-serif;padding:10px 16px;border-radius:8px;text-decoration:none">Open Ask Intros</a></td></tr>
    <tr><td style="font:12px/1.5 -apple-system,Segoe UI,sans-serif;color:#999;padding-top:22px">You asked for this weekly email. <a href="${esc(input.unsubscribeUrl)}" style="color:#999">Stop these emails</a>.</td></tr>
  </table></body></html>`
  return { subject, html, text }
}
