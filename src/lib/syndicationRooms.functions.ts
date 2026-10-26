import { createServerFn } from '@tanstack/react-start'
import { requireAuthContract } from './auth-gate'

/**
 * Live Ask Intros currently has the original syndication_rooms,
 * syndication_room_members and syndication_interests tables. This adapter
 * keeps those RLS-protected records usable without replaying colliding
 * 0075 migrations or pretending the future message table exists.
 */
export type RoomType = 'co-invest' | 'co-sponsor' | 'co-refer' | 'other'
export type RoomStatus = 'open' | 'decided' | 'closed'
export type Vote = 'in' | 'out' | 'need_more_info'

export interface SyndicationRoom {
  id: string
  created_by: string
  title: string
  room_type: RoomType
  description: string | null
  opportunity_size: string | null
  deadline: string | null
  status: RoomStatus
  decision: string | null
  created_at: string
  closed_at: string | null
}

export interface SyndicationMember {
  id: string
  room_id: string
  user_id: string
  status: string
  vote: Vote | null
  vote_note: string | null
  voted_at: string | null
  joined_at: string
  name: string | null
  initials: string | null
  avatar_url: string | null
}

export interface SyndicationMessage {
  id: string
  room_id: string
  user_id: string
  body: string
  created_at: string
  name: string | null
  initials: string | null
  avatar_url: string | null
}

export interface RoomDetails {
  room: SyndicationRoom
  members: SyndicationMember[]
  messages: SyndicationMessage[]
  /** The legacy schema only records member interest, not threaded messages. */
  discussionAvailable: boolean
  /** Member RLS may hide other members' votes until an owner opens the room. */
  fullRosterVisible: boolean
}

type LegacyRoom = {
  id: string; created_by: string; title: string; deal_type: string | null
  description: string | null; target_raise: number | null
  close_date: string | null; status: string; metadata: unknown
  created_at: string
}

function roomMeta(row: LegacyRoom): Record<string, unknown> {
  return row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
    ? row.metadata as Record<string, unknown> : {}
}
function roomView(row: LegacyRoom): SyndicationRoom {
  const meta = roomMeta(row)
  const type = row.deal_type
  return {
    id: row.id, created_by: row.created_by, title: row.title,
    room_type: type === 'co-sponsor' || type === 'co-refer' || type === 'other' ? type : 'co-invest',
    description: row.description ?? null,
    opportunity_size: typeof meta['opportunity_size_label'] === 'string'
      ? meta['opportunity_size_label']
      : row.target_raise == null ? null : String(row.target_raise),
    deadline: row.close_date ? row.close_date.slice(0, 10) : null,
    status: row.status === 'closed' ? 'closed' : row.status === 'decided' ? 'decided' : 'open',
    decision: typeof meta['decision'] === 'string' ? meta['decision'] : null,
    created_at: row.created_at,
    closed_at: typeof meta['closed_at'] === 'string' ? meta['closed_at'] : null,
  }
}
const votes: Record<Vote, string> = { in: 'interested', out: 'not_interested', need_more_info: 'needs_information' }
function toVote(value: string | null): Vote | null {
  return value === 'interested' || value === 'committed' ? 'in'
    : value === 'not_interested' ? 'out'
    : value === 'needs_information' ? 'need_more_info' : null
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** RLS returns only rooms visible to the account, then membership filters them. */
export const listSyndicationRooms = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<SyndicationRoom[]> => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const userId = context.userId
    const [{ data: rooms, error }, { data: memberships, error: memberError }] = await Promise.all([
      db.from('syndication_rooms').select('*').order('created_at', { ascending: false }).limit(100),
      db.from('syndication_room_members').select('room_id').eq('member_id', userId),
    ])
    if (error || memberError) throw new Error(error?.message ?? memberError?.message ?? 'Rooms unavailable.')
    const mine = new Set<string>((memberships ?? []).map((m: { room_id: string }) => m.room_id))
    return (rooms ?? []).filter((room: LegacyRoom) => room.created_by === userId || mine.has(room.id))
      .map(roomView)
  })

/** Persist a real owner-scoped room and pending invitations into existing tables. */
export const createSyndicationRoom = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: {
    title: string; roomType: RoomType; description?: string
    opportunitySize?: string; deadline?: string; inviteUserIds?: string[]
  }) => {
    if (!data.title?.trim() || data.title.trim().length > 200) throw new Error('Title must have 1 to 200 characters.')
    if (!['co-invest','co-sponsor','co-refer','other'].includes(data.roomType)) throw new Error('Invalid room type.')
    if (data.description && data.description.length > 2000) throw new Error('Description is too long.')
    if (data.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(data.deadline)) throw new Error('Choose a valid date.')
    if (data.inviteUserIds && (data.inviteUserIds.length > 20 || data.inviteUserIds.some(id => !uuid.test(id))))
      throw new Error('Invite up to 20 confirmed member accounts.')
    return data
  })
  .handler(async ({ data, context }): Promise<SyndicationRoom> => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const userId = context.userId
    const sizeLabel = data.opportunitySize?.trim().slice(0, 200) ?? ''
    const numeric = sizeLabel.replace(/[,$\s]/g, '')
    const targetRaise = sizeLabel && /^\$?[0-9,]+(?:\.[0-9]{1,2})?$/.test(sizeLabel)
      && Number.isFinite(Number(numeric)) ? Number(numeric) : null

    const { data: room, error: roomErr } = await db.from('syndication_rooms').insert({
      created_by: userId,
      title: data.title.trim(),
      deal_type: data.roomType,
      description: data.description?.trim() ?? null,
      target_raise: targetRaise,
      close_date: data.deadline ? data.deadline + 'T23:59:59Z' : null,
      metadata: { opportunity_size_label: sizeLabel },
      status: 'draft',
      visibility: 'private',
    }).select('*').single()
    if (roomErr || !room) throw new Error(roomErr?.message ?? 'Room creation was not confirmed.')

    const invitees = [...new Set((data.inviteUserIds ?? []).filter(id => id !== userId))]
    const members = [
      { room_id: room.id, member_id: userId, role: 'organizer', status: 'active', joined_at: new Date().toISOString(), invited_by: userId },
      ...invitees.map(member_id => ({ room_id: room.id, member_id, role: 'investor', status: 'pending', invited_by: userId })),
    ]
    const { error: memberError } = await db.from('syndication_room_members').insert(members)
    if (memberError) {
      // A room insert may have succeeded. Do not misreport complete success or
      // silently duplicate a room if invited membership could not be saved.
      throw new Error(`Room ${room.id} was created, but participant invitations could not be saved: ${memberError.message}. Do not create it again; locate the room and retry its invitations.`)
    }
    return roomView(room)
  })

/** Invitees choose to participate; no inviter can accept on their behalf. */
export const acceptSyndicationInvite = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { roomId: string }) => data)
  .handler(async ({ data, context }): Promise<void> => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: accepted, error } = await db.from('syndication_room_members')
      .update({ status: 'active', joined_at: new Date().toISOString() })
      .eq('room_id', data.roomId).eq('member_id', context.userId).eq('status', 'pending')
      .select('id').maybeSingle()
    if (error || !accepted?.id) throw new Error(error?.message ?? 'Your invitation could not be accepted.')
  })

/** Votes are nonbinding interest records in the live legacy contract. */
export const castVote = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { roomId: string; vote: Vote; voteNote?: string }) => {
    if (!data.roomId || !['in','out','need_more_info'].includes(data.vote)) throw new Error('Invalid interest response.')
    return data
  })
  .handler(async ({ data, context }): Promise<void> => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: membership, error: memberError } = await db.from('syndication_room_members')
      .select('id,status').eq('room_id', data.roomId).eq('member_id', context.userId).maybeSingle()
    if (memberError || !membership || membership.status !== 'active')
      throw new Error('Accept your room invitation before recording your interest.')
    const { data: saved, error } = await db.from('syndication_interests').upsert({
      room_id: data.roomId,
      member_id: context.userId,
      interest_level: votes[data.vote],
      notes: data.voteNote?.trim().slice(0, 500) || null,
    }, { onConflict: 'room_id,member_id' }).select('id').single()
    if (error || !saved?.id) throw new Error(error?.message ?? 'Interest was not saved.')
    // Do not fabricate a unanimous vote or decision when RLS hides other votes.
  })

/** Thread messages require a separate tenant-scoped table, absent from production. */
export const postSyndicationMessage = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { roomId: string; body: string }) => data)
  .handler(async (): Promise<SyndicationMessage> => {
    throw new Error('Room discussion is awaiting the protected message-table upgrade. Nothing was posted.')
  })

export const getRoomDetails = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .inputValidator((data: { roomId: string }) => data)
  .handler(async ({ data, context }): Promise<RoomDetails> => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const [{ data: room, error: roomError }, { data: roster, error: rosterError }, { data: interests, error: interestsError }] = await Promise.all([
      db.from('syndication_rooms').select('*').eq('id', data.roomId).single(),
      db.from('syndication_room_members').select('id,room_id,member_id,status,joined_at,created_at').eq('room_id', data.roomId),
      db.from('syndication_interests').select('member_id,interest_level,notes,updated_at').eq('room_id', data.roomId),
    ])
    if (roomError || !room) throw new Error(roomError?.message ?? 'Room is unavailable.')
    if (rosterError || interestsError) throw new Error(rosterError?.message ?? interestsError?.message ?? 'Room details unavailable.')
    const memberIds = (roster ?? []).map((r: { member_id: string }) => r.member_id)
    const { data: profiles, error: profilesError } = memberIds.length
      ? await db.from('profiles').select('id,name,initials,avatar_url').in('id', memberIds)
      : { data: [] }
    if (profilesError) throw new Error('Room participant details are unavailable.')
    const names = new Map<string, { name?: string; initials?: string; avatar_url?: string }>(
      (profiles ?? []).map((p: { id: string; name?: string; initials?: string; avatar_url?: string }) => [p.id,p])
    )
    const byId = new Map<string, { interest_level: string; notes: string | null; updated_at: string }>(
      (interests ?? []).map((r: { member_id: string; interest_level: string; notes: string | null; updated_at: string }) => [r.member_id,r])
    )
    return {
      room: roomView(room),
      members: (roster ?? []).map((r: { id: string; room_id: string; member_id: string; status: string; joined_at: string | null; created_at: string }) => {
        const answer = byId.get(r.member_id)
        const person = names.get(r.member_id)
        return {
          id: r.id, room_id: r.room_id, user_id: r.member_id,
          status: r.status, vote: toVote(answer?.interest_level ?? null),
          vote_note: answer?.notes ?? null, voted_at: answer?.updated_at ?? null,
          joined_at: r.joined_at ?? r.created_at,
          name: person?.name ?? null, initials: person?.initials ?? null, avatar_url: person?.avatar_url ?? null,
        }
      }),
      messages: [],
      discussionAvailable: false,
      fullRosterVisible: room.created_by === context.userId,
    }
  })
