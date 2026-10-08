import { MeetingCall, type Caption, type RemotePeer } from '../../src/aetheris/meeting-call'
import { ClipRecorder, type Clip } from '../../src/aetheris/meeting-recorder'
import { fakeTransport } from './fake-transport'

declare global {
  interface Window {
    __peers: RemotePeer[]; __status: string; __captions: Caption[]; __call: MeetingCall; __leave: () => Promise<void>
    __clips: Array<{ type: string; size: number; voicedMs: number; head: string }>; __record: (clipMs: number) => () => void; __local: MediaStream; __stopRec: () => void
  }
}

const userId = new URLSearchParams(location.search).get('user') ?? 'anon'
window.__peers = []
window.__captions = []
window.__status = 'starting'
window.__clips = []

void (async () => {
  const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  const call = new MeetingCall({
    transport: fakeTransport, meetingId: '00000000-0000-4000-8000-000000000001', userId, localStream,
    onPeers: peers => { window.__peers = peers },
    onCaption: c => { window.__captions.push(c) },
    onStatus: s => { window.__status = s },
  })
  window.__call = call
  window.__local = localStream
  // The note recorder on this tab's own microphone (Chromium's fake device plays a tone).
  window.__record = (clipMs: number) => {
    const rec = new ClipRecorder(localStream, (clip: Clip) => {
      void clip.blob.slice(0, 4).arrayBuffer().then(b => window.__clips.push({ type: clip.mimeType, size: clip.blob.size, voicedMs: clip.voicedMs, head: [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('') }))
    }, clipMs)
    rec.start()
    return () => rec.stop()
  }
  window.__leave = () => call.leave()
  await call.join()
})()
