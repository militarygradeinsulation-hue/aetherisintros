/**
 * The membership card email: the member's card (three stacked images, the middle one drawn
 * with their name, code and date) and a short welcome. Pure, so it is unit-tested.
 */
import { cardDate } from './membership-card-layout'

export interface MembershipEmailInput {
  name: string
  code: string
  verifiedAt: string
  appUrl: string
  /** URL of the personalised band image for this member. */
  bandUrl: string
}

export interface MembershipEmail { subject: string; html: string; text: string }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function membershipCardEmail(input: MembershipEmailInput): MembershipEmail {
  const first = input.name.trim().split(/\s+/)[0] ?? ''
  const date = cardDate(input.verifiedAt)
  const profileUrl = `${input.appUrl}/app`
  const subject = 'Your Ask Intros membership card'
  const lines = [
    first ? `Welcome to Ask Intros, ${first}.` : 'Welcome to Ask Intros.',
    '',
    'Your membership is verified. Your card is below.',
    '',
    `Member: ${input.name.trim()}`,
    `Membership code: ${input.code}`,
    `Verified: ${date}`,
    '',
    'Your code is recorded to your account. Your card now appears on your profile, so other members can see you are verified and trusted.',
    '',
    `Open your profile: ${profileUrl}`,
  ]
  const img = (src: string, alt: string, height: number) =>
    `<img src="${esc(src)}" width="600" alt="${esc(alt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none" height="${height}">`
  const font = '-apple-system,Segoe UI,Helvetica,Arial,sans-serif'
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#07090C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07090C"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
  <tr><td style="font:700 11px ${font};letter-spacing:.18em;color:#9AA4B2;padding:0 4px 14px">ASK INTROS · PRIVATE EXECUTIVE MEMBERSHIP</td></tr>
  <tr><td style="line-height:0;font-size:0">${img(`${input.appUrl}/membership/email-top.jpg`, 'Ask Intros membership card', 240)}</td></tr>
  <tr><td style="line-height:0;font-size:0">${img(input.bandUrl, `${input.name.trim()} · ${input.code} · Verified ${date}`, 81)}</td></tr>
  <tr><td style="line-height:0;font-size:0">${img(`${input.appUrl}/membership/email-bottom.jpg`, '', 129)}</td></tr>
  <tr><td style="padding:28px 4px 0">
    <div style="font:26px/1.3 Georgia,'Times New Roman',serif;color:#F2EEE6">${esc(first ? `Welcome to Ask Intros, ${first}.` : 'Welcome to Ask Intros.')}</div>
    <p style="font:15px/1.6 ${font};color:#B8BFC9;margin:12px 0 18px">Your membership is verified. Your code is recorded to your account, and your card now appears on your profile so other members can see you are verified and trusted.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-top:1px solid #222831;border-bottom:1px solid #222831;width:100%">
      <tr><td style="font:12px ${font};letter-spacing:.14em;color:#7D8794;padding:12px 0">MEMBER</td><td align="right" style="font:15px Georgia,serif;color:#F2EEE6">${esc(input.name.trim())}</td></tr>
      <tr><td style="font:12px ${font};letter-spacing:.14em;color:#7D8794;padding:12px 0;border-top:1px solid #1A1F26">MEMBERSHIP CODE</td><td align="right" style="font:15px Georgia,serif;letter-spacing:.08em;color:#F2EEE6;border-top:1px solid #1A1F26">${esc(input.code)}</td></tr>
      <tr><td style="font:12px ${font};letter-spacing:.14em;color:#7D8794;padding:12px 0;border-top:1px solid #1A1F26">VERIFIED</td><td align="right" style="font:15px Georgia,serif;color:#F2EEE6;border-top:1px solid #1A1F26">${esc(date)}</td></tr>
    </table>
    <p style="margin:24px 0 0"><a href="${esc(profileUrl)}" style="display:inline-block;background:#F2EEE6;color:#07090C;font:600 14px ${font};padding:12px 20px;border-radius:8px;text-decoration:none">Open your profile</a></p>
    <p style="font:12px/1.6 ${font};color:#6B7480;margin:28px 0 0">Keep this email: your membership code identifies you in the Ask Intros network.</p>
  </td></tr>
</table></td></tr></table></body></html>`
  return { subject, html, text: lines.join('\n') }
}
