/**
 * Membership card delivery (server only). Cards are issued by the database when a member is
 * verified (drizzle/migrations/0037). This sends each new card to its member once, through
 * Resend, and serves the personalised card image the email shows.
 *
 * Sending needs RESEND_API_KEY and a sender (MEMBERSHIP_FROM_EMAIL, else DIGEST_FROM_EMAIL).
 * Until those are set nothing is sent and cards stay queued, so they go out once configured.
 */
import { membershipCardEmail } from '@/aetheris/membership-email'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Admin = any

export type DeliveryResult = 'sent' | 'not_due' | 'no_card' | 'not_configured' | 'no_email' | 'failed'

/** Delivery attempts before a card stops being retried automatically (an admin can still resend). */
const MAX_ATTEMPTS = 5

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin as Admin
}

function sender() {
  const apiKey = process.env['RESEND_API_KEY']
  const from = process.env['MEMBERSHIP_FROM_EMAIL'] || process.env['DIGEST_FROM_EMAIL']
  return apiKey && from ? { apiKey, from } : null
}

export const bandUrl = (appUrl: string, token: string, code: string) =>
  `${appUrl}/api/public/membership-card?t=${token}&v=${encodeURIComponent(code)}`

/**
 * Email a member their card. Without `force`, only a card still waiting for its email is
 * sent, and the claim is atomic, so two callers never send it twice. `force` resends.
 */
export async function deliverMembershipCard(userId: string, opts: { appUrl: string; force?: boolean }): Promise<DeliveryResult> {
  const db = await admin()
  const { data: card } = await db.from('membership_cards')
    .select('user_id, code, holder_name, verified_at, image_token, email_due, email_attempts, status')
    .eq('user_id', userId).eq('status', 'active').maybeSingle()
  if (!card) return 'no_card'
  if (!opts.force && (!card.email_due || card.email_attempts >= MAX_ATTEMPTS)) return 'not_due'
  const config = sender()
  if (!config) return 'not_configured'

  let claim = db.from('membership_cards').update({ email_due: false, email_attempts: card.email_attempts + 1 })
    .eq('user_id', userId).eq('status', 'active')
  if (!opts.force) claim = claim.eq('email_due', true)
  const { data: claimed } = await claim.select('user_id')
  if (!claimed?.length) return 'not_due'

  const release = () => db.from('membership_cards').update({ email_due: opts.force ? card.email_due : true }).eq('user_id', userId)
  try {
    const { data: user } = await db.auth.admin.getUserById(userId)
    const to = user?.user?.email as string | undefined
    if (!to) { await release(); return 'no_email' }
    const email = membershipCardEmail({
      name: card.holder_name, code: card.code, verifiedAt: card.verified_at,
      appUrl: opts.appUrl, bandUrl: bandUrl(opts.appUrl, card.image_token, card.code),
    })
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: config.from, to, subject: email.subject, html: email.html, text: email.text }),
    })
    if (!res.ok) { await release(); return 'failed' }
    await db.from('membership_cards').update({ emailed_at: new Date().toISOString() }).eq('user_id', userId)
    return 'sent'
  } catch {
    await release()
    return 'failed'
  }
}

/** Sends every card still waiting for its email (scheduled sweep). */
export async function deliverDueMembershipCards(opts: { appUrl: string; limit?: number }) {
  const db = await admin()
  const { data } = await db.from('membership_cards').select('user_id')
    .eq('status', 'active').eq('email_due', true).lt('email_attempts', MAX_ATTEMPTS).limit(opts.limit ?? 50)
  const result: Record<DeliveryResult, number> = { sent: 0, not_due: 0, no_card: 0, not_configured: 0, no_email: 0, failed: 0 }
  for (const row of (data ?? []) as Array<{ user_id: string }>) result[await deliverMembershipCard(row.user_id, opts)]++
  return { considered: data?.length ?? 0, configured: !!sender(), ...result }
}

/** The personalised card image for an emailed card; null when the token is unknown or revoked. */
export async function membershipCardImage(token: string): Promise<Uint8Array | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return null
  const db = await admin()
  const { data: card } = await db.from('membership_cards').select('code, holder_name, verified_at')
    .eq('image_token', token).eq('status', 'active').maybeSingle()
  if (!card) return null
  const { renderCardBand } = await import('./membership-card/render')
  return renderCardBand({ name: card.holder_name, code: card.code, verifiedAt: card.verified_at })
}
