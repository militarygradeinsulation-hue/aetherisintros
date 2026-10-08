import { MeetingCall, type Caption, type RemotePeer } from '../../src/aetheris/meeting-call'
import { fakeTransport } from './fake-transport'

declare global {
  interface Window { __peers: RemotePeer[]; __status: string; __captions: Caption[]; __call: MeetingCall; __leave: () => Promise<void> }
}

const userId = new URLSearchParams(location.search).get('user') ?? 'anon'
window.__peers = []
window.__captions = []
window.__status = 'starting'

void (async () => {
  const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  const call = new MeetingCall({
    transport: fakeTransport, meetingId: '00000000-0000-4000-8000-000000000001', userId, localStream,
    onPeers: peers => { window.__peers = peers },
    onCaption: c => { window.__captions.push(c) },
    onStatus: s => { window.__status = s },
  })
  window.__call = call
  window.__leave = () => call.leave()
  await call.join()
})()
