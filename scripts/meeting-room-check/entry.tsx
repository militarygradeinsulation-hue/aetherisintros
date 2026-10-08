import { createRoot } from 'react-dom/client'

import { MeetingRoom } from '../../src/aetheris/meetings-ui'
import type { Meeting } from '../../src/aetheris/meetings'
import '../../src/aetheris/styles.css'

const A = 'aaaaaaaa-0000-4000-8000-00000000000a'
const B = 'bbbbbbbb-0000-4000-8000-00000000000b'
const M = '00000000-0000-4000-8000-0000000000aa'
const user = new URLSearchParams(location.search).get('user')!
if (!localStorage.getItem('db:meetings')) {
  localStorage.setItem('db:meetings', JSON.stringify([{ id: M, host_id: A, title: 'Pipeline review', ended_at: null, recording_started_at: null, recording_started_by: null }]))
  localStorage.setItem('db:meeting_participants', JSON.stringify([
    { meeting_id: M, user_id: A, role: 'host', notes_consent: false },
    { meeting_id: M, user_id: B, role: 'guest', notes_consent: false },
  ]))
  localStorage.setItem('db:profiles', JSON.stringify([{ id: A, name: 'Ana Host' }, { id: B, name: 'Ben Guest' }]))
}
const meeting: Meeting = {
  id: M, hostId: A, title: 'Pipeline review', scheduledFor: null, startedAt: null, endedAt: null, createdAt: new Date().toISOString(),
  agenda: '', introRequestId: null, hasNotes: false,
  participants: [{ userId: A, name: 'Ana Host', role: 'host', notesConsent: false, joinedAt: null }, { userId: B, name: 'Ben Guest', role: 'guest', notesConsent: false, joinedAt: null }],
}
document.body.style.background = '#090C0F'
document.body.style.color = '#F1EFE9'
createRoot(document.getElementById('root')!).render(<div style={{ padding: 20 }}><MeetingRoom meeting={meeting} userId={user} onLeave={() => {}} onBack={() => {}} /></div>)
