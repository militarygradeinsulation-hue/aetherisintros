/**
 * One-time population of the shared network directory.
 *
 * The professional cast, companies, feed posts, asks, signals and demo
 * conversations live in code as the canonical catalogue; this copies them into
 * the database so every signed-in member reads the same rows. It is a no-op
 * once `members` already holds rows.
 */
import {
  learnings, members, networkAsks, posts, signals, threads,
} from '@/aetheris/social'

export async function seedNetworkDirectory(): Promise<{ seeded: boolean; members: number }> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

  const { count } = await supabaseAdmin
    .from('members')
    .select('id', { count: 'exact', head: true })
  if ((count ?? 0) > 0) return { seeded: false, members: count ?? 0 }

  const memberRows = members.map(m => ({
    id: m.id, name: m.name, initials: m.initials, title: m.title, company: m.company,
    location: m.location, role: m.role, industry: m.industry,
    bio: `${m.thesis} Currently: ${m.focus} Depth in ${m.expertise.slice(0, 3).join(', ').toLowerCase()}.`,
    tags: m.tags, expertise: m.expertise, needs: m.needs, offers: m.offers,
    focus: m.focus, thesis: m.thesis, availability: m.availability, mutuals: m.mutuals,
    last_interaction_days: m.lastInteractionDays, relationship_status: m.relationshipStatus,
    score: m.score, score_total: m.scoreTotal, radar: m.radar,
    why_them: m.whyThem, why_you: m.whyYou, why_now: m.whyNow, best_path: m.bestPath,
    next_action: m.nextAction, dont_do: m.dontDo, confidence: m.confidence,
    opportunity_low: m.opportunityLow ?? null, opportunity_high: m.opportunityHigh ?? null,
    intro_state: m.introState, joined: m.joined,
  }))

  const companyMap = new Map<string, typeof members>()
  for (const m of members) companyMap.set(m.company, [...(companyMap.get(m.company) ?? []), m])
  const companyRows = [...companyMap.entries()].map(([name, group]) => {
    const first = group[0]!
    return {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      name, industry: first.industry, location: first.location,
      about: `${name} works in ${first.industry.toLowerCase()} from ${first.location}. Known in your network through ${group.map(p => p.name).join(', ')}.`,
      member_ids: group.map(p => p.id),
    }
  })

  await supabaseAdmin.from('members').upsert(memberRows as never)
  await supabaseAdmin.from('companies').upsert(companyRows)
  await supabaseAdmin.from('posts').upsert(posts.map(p => ({
    id: p.id, member_id: p.memberId, kind: p.kind, text: p.text, detail: p.detail,
    when_label: p.when, response_count: p.responses,
  })))
  await supabaseAdmin.from('asks').upsert(networkAsks.map(a => ({
    id: a.id, member_id: a.memberId, ask: a.ask, detail: a.detail, why_now: a.whyNow,
    offer: a.offer, industry: a.industry, location: a.location, urgency: a.urgency,
    posted: a.posted, response_count: a.responses, visibility: a.visibility,
  })))
  await supabaseAdmin.from('signals').upsert(signals.map(s => ({
    id: s.id, member_id: s.memberId, kind: s.kind, text: s.text, when_label: s.when,
  })))
  await supabaseAdmin.from('seed_threads').upsert(threads.map(t => ({
    id: t.id, member_id: t.memberId, intro_context: t.introContext, unread: t.unread,
    commitment: t.commitment, suggested: t.suggested, messages: t.messages as never,
  })))
  await supabaseAdmin.from('seed_learnings').upsert(learnings.map(l => ({
    id: l.id, category: l.category, text: l.text, source: l.source,
    confidence: l.confidence, scope: l.scope, when_label: l.when,
  })))

  return { seeded: true, members: memberRows.length }
}
