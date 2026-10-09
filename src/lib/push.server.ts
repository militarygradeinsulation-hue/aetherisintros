/**
 * Delivers a notification to the member's devices as a push (server only). Called by the
 * database when a notification is created (drizzle/migrations/0041, /api/push/dispatch).
 */
import { getSetting, getVapidKeys } from './app-settings.server'
import { sendPush } from './webpush'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Where tapping a notification opens, from its stored link. */
export function pushUrl(link: string): string {
  if (/^\/[A-Za-z0-9/_?=&.-]*$/.test(link)) return link
  return '/app'
}

export async function dispatchNotification(notificationId: string): Promise<{ sent: number; removed: number; failed: number }> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const db = supabaseAdmin as any
  const result = { sent: 0, removed: 0, failed: 0 }
  const { data: n } = await db.from('notifications').select('id, user_id, kind, text, link, created_at').eq('id', notificationId).maybeSingle()
  // Only fresh notifications: a delayed retry should not buzz someone's phone hours later.
  if (!n || Date.now() - new Date(n.created_at).getTime() > 15 * 60_000) return result
  const { data: subs } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', n.user_id)
  if (!subs?.length) return result

  const keys = await getVapidKeys()
  const appUrl = (await getSetting('app_url')) || process.env['APP_URL'] || 'https://aetherisintros.lovable.app'
  const subject = process.env['PUSH_CONTACT'] ? `mailto:${process.env['PUSH_CONTACT']}` : appUrl
  const message = { title: 'Ask Intros', body: String(n.text).slice(0, 240), url: pushUrl(n.link ?? ''), tag: `${n.kind}-${n.id}` }

  for (const s of subs as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>) {
    try {
      const r = await sendPush(s, message, keys, subject)
      if (r.ok) { result.sent++; await db.from('push_subscriptions').update({ last_sent_at: new Date().toISOString() }).eq('id', s.id) }
      else if (r.gone) { result.removed++; await db.from('push_subscriptions').delete().eq('id', s.id) }
      else result.failed++
    } catch { result.failed++ }
  }
  return result
}
