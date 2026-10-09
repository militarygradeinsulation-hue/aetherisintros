/**
 * Phone and desktop notifications for the signed-in member: the service worker (public/sw.js),
 * the install prompt, and turning push on or off for this device. Subscriptions are stored in
 * push_subscriptions (own rows only); the database asks the app to deliver each new
 * notification to them (drizzle/migrations/0041).
 */
import { supabase } from '@/integrations/supabase/client'
import { getPushPublicKey } from '@/lib/push.functions'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export type PushState = 'unsupported' | 'ios-install-first' | 'blocked' | 'off' | 'on'

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  // Not inside editor preview frames, which cannot keep a worker.
  try { if (window.self !== window.top) return } catch { return }
  void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
}

export async function pushState(): Promise<PushState> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) {
    // iPhone and iPad only allow push for apps added to the Home Screen.
    return typeof window !== 'undefined' && isIos() && !isStandalone() ? 'ios-install-first' : 'unsupported'
  }
  if (Notification.permission === 'denied') return 'blocked'
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

const toBytes = (b64: string) => {
  const s = b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4)
  return Uint8Array.from(atob(s), c => c.charCodeAt(0))
}

/** Asks permission, subscribes this device and saves it. Returns the resulting state. */
export async function enablePush(): Promise<PushState> {
  registerServiceWorker()
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'
  const reg = await navigator.serviceWorker.ready
  const { publicKey } = await getPushPublicKey()
  const sub = await reg.pushManager.getSubscription() ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(publicKey) as BufferSource })
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  const r = await db.from('push_subscriptions').insert({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent.slice(0, 300) })
  // Already saved for this device is fine.
  if (r.error && r.error.code !== '23505') { await sub.unsubscribe().catch(() => undefined); throw new Error('Notifications could not be turned on. Please try again.') }
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe().catch(() => undefined)
  }
  return 'off'
}

/* Install prompt (Chrome, Edge, Android): kept until the member chooses to install. */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as InstallEvent; listeners.forEach(f => f()) })
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach(f => f()) })
}
export const canInstall = () => !!deferred
export const onInstallChange = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  listeners.forEach(f => f())
  return outcome === 'accepted'
}
