/**
 * In-browser stand-in for a Supabase Realtime channel (presence + broadcast) built on
 * BroadcastChannel, so several tabs of one browser can act as meeting participants.
 */
import type { CallTransport } from '../../src/aetheris/meeting-call'

type Handler = (msg: { payload?: unknown }) => void

class FakeChannel {
  private bc: BroadcastChannel
  private presence = new Map<string, unknown>()
  private syncHandlers: Array<() => void> = []
  private broadcastHandlers = new Map<string, Handler[]>()
  private key: string
  private tracked = false

  constructor(topic: string, config: { config: { presence?: { key?: string } } }) {
    this.key = config.config.presence?.key ?? Math.random().toString(36).slice(2)
    this.bc = new BroadcastChannel(topic)
    this.bc.onmessage = ({ data }) => this.receive(data)
    addEventListener('pagehide', () => this.untrack())
  }

  on(type: 'presence' | 'broadcast', filter: { event: string }, cb: Handler | (() => void)) {
    if (type === 'presence' && filter.event === 'sync') this.syncHandlers.push(cb as () => void)
    if (type === 'broadcast') this.broadcastHandlers.set(filter.event, [...(this.broadcastHandlers.get(filter.event) ?? []), cb as Handler])
    return this
  }

  subscribe(cb: (status: string) => void) { setTimeout(() => cb('SUBSCRIBED'), 0); return this }

  async track(meta: unknown) {
    this.tracked = true
    this.presence.set(this.key, [meta])
    this.bc.postMessage({ kind: 'join', key: this.key, meta, hello: true })
    this.sync()
    return 'ok'
  }

  async untrack() {
    if (!this.tracked) return 'ok'
    this.tracked = false
    this.bc.postMessage({ kind: 'leave', key: this.key })
    return 'ok'
  }

  presenceState() { return Object.fromEntries(this.presence) }

  async send(msg: { type: string; event: string; payload: unknown }) {
    this.bc.postMessage({ kind: 'broadcast', event: msg.event, payload: msg.payload })
    return 'ok'
  }

  close() { this.bc.close() }

  private receive(data: { kind: string; key?: string; meta?: unknown; hello?: boolean; event?: string; payload?: unknown }) {
    if (data.kind === 'join' && data.key) {
      this.presence.set(data.key, [data.meta])
      // Answer a newcomer so they learn who is already here.
      if (data.hello && this.tracked) this.bc.postMessage({ kind: 'join', key: this.key, meta: this.presence.get(this.key), hello: false })
      this.sync()
    } else if (data.kind === 'leave' && data.key) {
      this.presence.delete(data.key)
      this.sync()
    } else if (data.kind === 'broadcast' && data.event) {
      for (const h of this.broadcastHandlers.get(data.event) ?? []) h({ payload: data.payload })
    }
  }

  private sync() { for (const h of this.syncHandlers) h() }
}

export const fakeTransport: CallTransport = {
  authorize: async () => {},
  channel: (topic, config) => new FakeChannel(topic, config as never) as never,
  removeChannel: async channel => { (channel as unknown as FakeChannel).close() },
}
