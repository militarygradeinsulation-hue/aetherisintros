import { createServerFn } from '@tanstack/react-start'
import { requireAuthContract } from './auth-gate'

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
}

/** List all syndication rooms where the authenticated user is a member or creator. */
export const listSyndicationRooms = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<SyndicationRoom[]> => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const userId = context.userId

    // Rooms the user created
    const { data: created, error: e1 } = await db
      .from('syndication_rooms')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
    if (e1) throw new Error(e1.message)

    // Rooms the user is a member of (but not creator)
    const { data: memberships, error: e2 } = await db
      .from('syndication_members')
      .select('room_id')
      .eq('user_id', userId)
    if (e2) throw new Error(e2.message)

    const memberRoomIds: string[] = (memberships ?? []).map((m: { room_id: string }) => m.room_id)
    const createdIds = new Set<string>((created ?? []).map((r: SyndicationRoom) => r.id))
    const idsToFetch = memberRoomIds.filter(id => !createdIds.has(id))

    let memberRooms: SyndicationRoom[] = []
    if (idsToFetch.length > 0) {
      const { data: mr, error: e3 } = await db
        .from('syndication_rooms')
        .select('*')
        .in('id', idsToFetch)
        .order('created_at', { ascending: false })
      if (e3) throw new Error(e3.message)
      memberRooms = mr ?? []
    }

    const all: SyndicationRoom[] = [...(created ?? []), ...memberRooms]
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return all
  })

/** Create a syndication room and add invitees as members. */
export const createSyndicationRoom = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: {
    title: string
    roomType: RoomType
    description?: string
    opportunitySize?: string
    deadline?: string
    inviteUserIds?: string[]
  }) => {
    if (!data?.title?.trim()) throw new Error('Title is required.')
    if (!['co-invest', 'co-sponsor', 'co-refer', 'other'].includes(data.roomType)) throw new Error('Invalid room type.')
    return data
  })
  .handler(async ({ data, context }): Promise<SyndicationRoom> => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const userId = context.userId

    const { data: room, error: roomErr } = await db
      .from('syndication_rooms')
      .insert({
        created_by: userId,
        title: data.title.trim(),
        room_type: data.roomType,
        description: data.description?.trim() ?? null,
        opportunity_size: data.opportunitySize?.trim() ?? null,
        deadline: data.deadline ?? null,
      })
      .select()
      .single()
    if (roomErr) throw new Error(roomErr.message)

    // Add creator as a member so they can vote
    const membersToInsert = [
      { room_id: room.id, user_id: userId },
      ...(data.inviteUserIds ?? [])
        .filter(id => id !== userId)
        .map(id => ({ room_id: room.id, user_id: id })),
    ]
    const { error: membersErr } = await db.from('syndication_members').insert(membersToInsert)
    if (membersErr) throw new Error(membersErr.message)

    return room as SyndicationRoom
  })

/** Cast or update the authenticated user's vote in a room. */
export const castVote = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { roomId: string; vote: Vote; voteNote?: string }) => {
    if (!data?.roomId) throw new Error('roomId is required.')
    if (!['in', 'out', 'need_more_info'].includes(data.vote)) throw new Error('Invalid vote.')
    return data
  })
  .handler(async ({ data, context }): Promise<void> => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const userId = context.userId

    const { error } = await db
      .from('syndication_members')
      .update({ vote: data.vote, vote_note: data.voteNote ?? null, voted_at: new Date().toISOString() })
      .eq('room_id', data.roomId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)

    // Auto-close to decided when all members have voted
    const { data: members } = await db
      .from('syndication_members')
      .select('vote')
      .eq('room_id', data.roomId)
    const allVoted = (members ?? []).every((m: { vote: Vote | null }) => m.vote !== null)
    if (allVoted) {
      const votes: Vote[] = (members ?? []).map((m: { vote: Vote }) => m.vote)
      const inCount = votes.filter(v => v === 'in').length
      const outCount = votes.filter(v => v === 'out').length
      const needMoreCount = votes.filter(v => v === 'need_more_info').length
      const summary = `${inCount} In / ${outCount} Out / ${needMoreCount} Need More Info`
      await db
        .from('syndication_rooms')
        .update({ status: 'decided', decision: summary, closed_at: new Date().toISOString() })
        .eq('id', data.roomId)
    }
  })

/** Post a message to a syndication room discussion thread. */
export const postSyndicationMessage = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { roomId: string; body: string }) => {
    if (!data?.roomId) throw new Error('roomId is required.')
    if (!data?.body?.trim()) throw new Error('Message body is required.')
    return data
  })
  .handler(async ({ data, context }): Promise<SyndicationMessage> => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const userId = context.userId

    const { data: message, error } = await db
      .from('syndication_messages')
      .insert({ room_id: data.roomId, user_id: userId, body: data.body.trim() })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return message as SyndicationMessage
  })

/** Get full room details: room info, members with votes, and discussion thread. */
export const getRoomDetails = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .inputValidator((data: { roomId: string }) => {
    if (!data?.roomId) throw new Error('roomId is required.')
    return data
  })
  .handler(async ({ data, context }): Promise<RoomDetails> => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

    const [{ data: room, error: roomErr }, { data: rawMembers, error: membersErr }, { data: rawMessages, error: messagesErr }] =
      await Promise.all([
        db.from('syndication_rooms').select('*').eq('id', data.roomId).single(),
        db.from('syndication_members').select('*, profiles(name, initials, avatar_url)').eq('room_id', data.roomId).order('joined_at'),
        db.from('syndication_messages').select('*, profiles(name, initials, avatar_url)').eq('room_id', data.roomId).order('created_at'),
      ])

    if (roomErr) throw new Error(roomErr.message)
    if (membersErr) throw new Error(membersErr.message)
    if (messagesErr) throw new Error(messagesErr.message)

    const members: SyndicationMember[] = (rawMembers ?? []).map((m: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: m.id,
      room_id: m.room_id,
      user_id: m.user_id,
      vote: m.vote,
      vote_note: m.vote_note,
      voted_at: m.voted_at,
      joined_at: m.joined_at,
      name: m.profiles?.name ?? null,
      initials: m.profiles?.initials ?? null,
      avatar_url: m.profiles?.avatar_url ?? null,
    }))

    const messages: SyndicationMessage[] = (rawMessages ?? []).map((m: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: m.id,
      room_id: m.room_id,
      user_id: m.user_id,
      body: m.body,
      created_at: m.created_at,
      name: m.profiles?.name ?? null,
      initials: m.profiles?.initials ?? null,
      avatar_url: m.profiles?.avatar_url ?? null,
    }))

    return { room: room as SyndicationRoom, members, messages }
  })
