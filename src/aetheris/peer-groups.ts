/** Peer groups: pure helpers shared by the member page and the admin panel. */

export const MAX_GROUP_SIZE = 16

/** What every member agrees to, once per group, before seeing anything the group shares. */
export const AGREEMENT_POINTS = [
  'What is said in this group stays in this group. I will not repeat it, record it, or share screenshots.',
  'I will not use what I learn here for business advantage against another member.',
  'I speak from my own experience, and I keep other members’ names and companies to myself.',
  'If I leave the group, these commitments stay with me.',
]

export interface PeerPost { id: string; parent_id: string | null; author_id: string; body: string; created_at: string; updated_at: string }
export interface PostThread { post: PeerPost; replies: PeerPost[] }

/** Top-level posts newest first, each with its replies oldest first. Orphaned replies are dropped. */
export function threadPosts(posts: PeerPost[]): PostThread[] {
  const byTime = (a: PeerPost, b: PeerPost) => a.created_at.localeCompare(b.created_at)
  const roots = posts.filter(p => !p.parent_id).sort((a, b) => byTime(b, a))
  return roots.map(post => ({ post, replies: posts.filter(p => p.parent_id === post.id).sort(byTime) }))
}

export function seatsLeft(memberCount: number, maxSize: number) {
  return Math.max(0, Math.min(maxSize, MAX_GROUP_SIZE) - memberCount)
}

/** Same rule as the database: an http(s) link, or a path inside the app. Empty means no link. */
export function cleanMeetingUrl(raw: string): { url: string | null; error?: string } {
  const url = raw.trim()
  if (!url) return { url: null }
  if (url.length > 500) return { url: null, error: 'That link is too long.' }
  if (!/^(https?:\/\/|\/)/i.test(url)) return { url: null, error: 'Use a web link starting with https://, or a link from Meetings.' }
  return { url }
}

export interface PeerSession { id: string; starts_at: string; agenda: string; meeting_url: string | null }

/** Upcoming soonest first; past most recent first. A session counts as upcoming for 3 hours after it starts. */
export function splitSessions<T extends PeerSession>(sessions: T[], now = Date.now()) {
  const grace = 3 * 3600 * 1000
  const upcoming = sessions.filter(s => Date.parse(s.starts_at) + grace >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const past = sessions.filter(s => Date.parse(s.starts_at) + grace < now).sort((a, b) => b.starts_at.localeCompare(a.starts_at))
  return { upcoming, past }
}

export function validateIssue(i: { title: string; context: string; help: string }): string | null {
  if (i.title.trim().length < 3) return 'Give the issue a short title.'
  if (i.title.trim().length > 160) return 'Keep the title under 160 characters.'
  if (i.context.length > 4000) return 'Keep the context under 4,000 characters.'
  if (i.help.length > 1000) return 'Keep what you need under 1,000 characters.'
  return null
}

/** Shapes a datetime-local input value as an ISO timestamp, or null when it is not a date. */
export function localInputToIso(value: string): string | null {
  if (!value) return null
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? new Date(t).toISOString() : null
}
