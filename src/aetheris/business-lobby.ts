/**
 * Business Lobby: explicit temporary availability, only mutual accepted
 * introductions, and a knock that must be accepted before a meeting exists.
 * These are live database RPCs (migration 0082), never simulated presence.
 */
import { supabase } from '@/integrations/supabase/client'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export type LobbyContact = {
  introId: string
  userId: string
  name: string
  headline: string
  until: string
}

export type LobbyKnock = {
  id: string
  introId: string
  requesterId: string
  recipientId: string
  counterpartName: string
  note: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  expiresAt: string
  createdAt: string
  meetingId: string | null
}

export type LobbySnapshot = {
  myWindowUntil: string | null
  myHeadline: string
  contacts: LobbyContact[]
  knocks: LobbyKnock[]
}

export async function loadBusinessLobby(userId: string): Promise<LobbySnapshot> {
  const [windowRow, contacts, knocks] = await Promise.all([
    db.from('business_lobby_windows').select('available_until,headline').eq('user_id',userId).maybeSingle(),
    db.rpc('my_business_lobby_contacts'),
    db.from('business_lobby_knocks')
      .select('id,intro_request_id,requester_id,recipient_id,note,status,expires_at,created_at,meeting_id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false }).limit(30),
  ])
  for (const response of [windowRow, contacts, knocks]) {
    if (response.error) throw new Error(response.error.message)
  }
  const contactRows = (contacts.data ?? []) as any[]
  const contactList: LobbyContact[] = contactRows.map(c => ({
    introId: c.intro_request_id, userId: c.other_id, name: c.other_name,
    headline: c.headline ?? '', until: c.available_until,
  }))
  const knockRows = (knocks.data ?? []) as any[]
  const names = new Map<string, string>(contactList.map(c => [c.introId, c.name]))
  const missing = [...new Set(knockRows.map(k => k.intro_request_id).filter(id => !names.has(id)))]
  if (missing.length) {
    const r = await db.rpc('my_intro_participant_names', { p_intro_ids: missing })
    if (r.error) throw new Error(r.error.message)
    for (const name of r.data ?? []) names.set(name.intro_request_id, name.other_name)
  }
  return {
    myWindowUntil: windowRow.data?.available_until ?? null,
    myHeadline: windowRow.data?.headline ?? '',
    contacts: contactList,
    knocks: knockRows.map(k => ({
      id: k.id, introId: k.intro_request_id, requesterId: k.requester_id,
      recipientId: k.recipient_id, counterpartName: names.get(k.intro_request_id) ?? 'Member',
      note: k.note ?? '', status: k.status, expiresAt: k.expires_at,
      createdAt: k.created_at, meetingId: k.meeting_id,
    })),
  }
}

export async function setBusinessLobby(minutes: 0 | 15 | 30 | 60 | 120, headline: string) {
  const r = await db.rpc('set_business_lobby', { p_minutes: minutes, p_headline: headline })
  if (r.error) throw new Error(r.error.message)
}

export async function knockBusinessLobby(introId: string, note: string) {
  const r = await db.rpc('knock_business_lobby', { p_intro: introId, p_note: note })
  if (r.error) throw new Error(r.error.message)
  if (!r.data) throw new Error('The request could not be sent')
}

export async function answerBusinessLobby(id: string, accept: boolean): Promise<string | null> {
  const r = await db.rpc('answer_business_lobby', { p_knock: id, p_accept: accept })
  if (r.error) throw new Error(r.error.message)
  return (r.data as string | null) ?? null
}

/** A pending knock stops being actionable at its server-provided expiration. */
export function knockIsOpen(knock: Pick<LobbyKnock, 'status' | 'expiresAt'>, now = Date.now()) {
  return knock.status === 'pending' && Date.parse(knock.expiresAt) > now
}
