/**
 * Browser-to-browser video for small meetings (up to four people, every pair connected
 * directly). Connection signals and live captions travel over the private Realtime channel
 * "meeting:<id>", which only the meeting's participants can join (drizzle/migrations/0031).
 *
 * In each pair only one side makes offers (the lower user id) and the other only answers,
 * so offers never collide whatever order people join in; each peer's signals are applied
 * strictly in order. Direct connections use public STUN; a TURN relay is used too when the
 * server provides one (src/lib/iceServers.functions.ts), for strict corporate networks.
 */
import type { RealtimeChannel } from '@supabase/supabase-js'

import { supabase } from '@/integrations/supabase/client'
import { MAX_MEETING_PEOPLE } from './meeting-notes-format'

const ICE_SERVERS: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]

export interface RemotePeer { userId: string; stream: MediaStream | null; state: RTCPeerConnectionState }
export interface Caption { from: string; text: string; at: string }

interface Signal { from: string; to: string; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit | null }

interface PeerSlot {
  pc: RTCPeerConnection
  /** This side makes the offers for the pair; the other side only answers. */
  offerer: boolean
  stream: MediaStream | null
  /** Signals from one peer are applied strictly in order: a candidate must never race the offer before it. */
  queue: Promise<void>
}

/** How signals travel. Defaults to Supabase Realtime; tests pass an in-browser channel. */
export interface CallTransport {
  authorize: () => Promise<void>
  channel: (topic: string, config: { config: Record<string, unknown> }) => RealtimeChannel
  removeChannel: (channel: RealtimeChannel) => Promise<unknown>
}

const supabaseTransport: CallTransport = {
  authorize: async () => {
    // Private channels authorise with the member's session token.
    const { data } = await supabase.auth.getSession()
    if (data.session?.access_token) await supabase.realtime.setAuth(data.session.access_token)
  },
  channel: (topic, config) => supabase.channel(topic, config),
  removeChannel: channel => supabase.removeChannel(channel),
}

export interface MeetingCallOptions {
  transport?: CallTransport
  /** STUN/TURN servers; defaults to public STUN only. */
  iceServers?: RTCIceServer[] | undefined
  meetingId: string
  userId: string
  localStream: MediaStream
  onPeers: (peers: RemotePeer[]) => void
  onCaption: (caption: Caption) => void
  /** Someone changed the room (recording, consent, invites): reload its state now. */
  onRoomChange?: () => void
  onStatus: (status: 'connecting' | 'joined' | 'full' | 'error', detail?: string) => void
}

export class MeetingCall {
  private channel: RealtimeChannel | null = null
  private peers = new Map<string, PeerSlot>()
  private closed = false

  private readonly transport: CallTransport

  constructor(private readonly opts: MeetingCallOptions) {
    this.transport = opts.transport ?? supabaseTransport
  }

  async join() {
    const { meetingId, userId } = this.opts
    this.opts.onStatus('connecting')
    await this.transport.authorize()
    const channel = this.transport.channel(`meeting:${meetingId}`, {
      config: { private: true, broadcast: { self: false }, presence: { key: userId } },
    })
    this.channel = channel
    channel
      .on('presence', { event: 'sync' }, () => this.syncPresence())
      .on('broadcast', { event: 'signal' }, ({ payload }) => this.onSignal(payload as Signal))
      .on('broadcast', { event: 'caption' }, ({ payload }) => {
        const c = payload as Caption
        if (c && typeof c.text === 'string' && typeof c.from === 'string') this.opts.onCaption(c)
      })
      .on('broadcast', { event: 'room' }, () => this.opts.onRoomChange?.())
      .subscribe(async (status, err) => {
        if (this.closed) return
        if (status === 'SUBSCRIBED') {
          await channel.track({ joinedAt: new Date().toISOString() })
          this.opts.onStatus('joined')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.opts.onStatus('error', err?.message ?? 'Could not reach the meeting. Check your connection and try again.')
        }
      })
  }

  /** Share a finished phrase of your own speech with everyone in the room. */
  sendCaption(text: string) {
    void this.channel?.send({ type: 'broadcast', event: 'caption', payload: { from: this.opts.userId, text, at: new Date().toISOString() } satisfies Caption })
  }

  /** Tell everyone in the room to reload its state (recording started, consent changed, someone invited). */
  announceRoomChange() {
    void this.channel?.send({ type: 'broadcast', event: 'room', payload: { from: this.opts.userId } })
  }

  setTrackEnabled(kind: 'audio' | 'video', enabled: boolean) {
    for (const track of this.opts.localStream.getTracks()) if (track.kind === kind) track.enabled = enabled
  }

  async leave() {
    this.closed = true
    for (const id of [...this.peers.keys()]) this.dropPeer(id)
    if (this.channel) {
      try { await this.channel.untrack() } catch { /* already gone */ }
      await this.transport.removeChannel(this.channel)
      this.channel = null
    }
    for (const track of this.opts.localStream.getTracks()) track.stop()
  }

  private syncPresence() {
    if (!this.channel || this.closed) return
    const present = Object.keys(this.channel.presenceState()).filter(id => id !== this.opts.userId).sort()
    // Connect to the earliest arrivals first; beyond four people the room is full.
    const allowed = present.slice(0, MAX_MEETING_PEOPLE - 1)
    if (present.length > allowed.length) this.opts.onStatus('full')
    for (const id of allowed) if (!this.peers.has(id)) this.addPeer(id)
    for (const id of [...this.peers.keys()]) if (!allowed.includes(id)) this.dropPeer(id)
    this.emitPeers()
  }

  private addPeer(peerId: string): PeerSlot {
    const pc = new RTCPeerConnection({ iceServers: this.opts.iceServers?.length ? this.opts.iceServers : ICE_SERVERS })
    const slot: PeerSlot = { pc, offerer: this.opts.userId < peerId, stream: null, queue: Promise.resolve() }
    this.peers.set(peerId, slot)
    for (const track of this.opts.localStream.getTracks()) pc.addTrack(track, this.opts.localStream)

    pc.onnegotiationneeded = () => {
      if (!slot.offerer) return
      slot.queue = slot.queue.then(async () => {
        try {
          await pc.setLocalDescription()
          if (pc.localDescription) this.signal(peerId, { description: pc.localDescription.toJSON() })
        } catch { /* the next negotiation retries */ }
      })
    }
    pc.onicecandidate = ({ candidate }) => this.signal(peerId, { candidate: candidate ? candidate.toJSON() : null })
    pc.ontrack = ({ streams }) => {
      slot.stream = streams[0] ?? slot.stream
      this.emitPeers()
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && slot.offerer) pc.restartIce()
      this.emitPeers()
    }
    return slot
  }

  private dropPeer(peerId: string) {
    const slot = this.peers.get(peerId)
    if (!slot) return
    slot.pc.onnegotiationneeded = null
    slot.pc.onicecandidate = null
    slot.pc.ontrack = null
    slot.pc.close()
    this.peers.delete(peerId)
  }

  private signal(to: string, body: Omit<Signal, 'from' | 'to'>) {
    void this.channel?.send({ type: 'broadcast', event: 'signal', payload: { from: this.opts.userId, to, ...body } satisfies Signal })
  }

  private onSignal(msg: Signal) {
    if (this.closed || !msg || msg.to !== this.opts.userId || typeof msg.from !== 'string') return
    const slot = this.peers.get(msg.from) ?? (this.peers.size < MAX_MEETING_PEOPLE - 1 ? this.addPeer(msg.from) : null)
    if (!slot) return
    slot.queue = slot.queue.then(() => this.applySignal(slot, msg))
  }

  private async applySignal(slot: PeerSlot, msg: Signal) {
    const { pc } = slot
    if (pc.signalingState === 'closed') return
    try {
      if (msg.description) {
        // The answering side never offers, so an offer can only meet a stable connection.
        if (msg.description.type === 'offer' && slot.offerer) return
        await pc.setRemoteDescription(msg.description)
        if (msg.description.type === 'offer') {
          await pc.setLocalDescription()
          if (pc.localDescription) this.signal(msg.from, { description: pc.localDescription.toJSON() })
        }
      } else if (msg.candidate !== undefined) {
        await pc.addIceCandidate(msg.candidate ?? undefined)
      }
    } catch {
      // A broken negotiation recovers through ICE restart on the next state change.
    }
    this.emitPeers()
  }

  private emitPeers() {
    this.opts.onPeers([...this.peers.entries()].map(([userId, s]) => ({ userId, stream: s.stream, state: s.pc.connectionState })))
  }
}
