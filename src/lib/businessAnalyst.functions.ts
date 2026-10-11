import { createServerFn } from '@tanstack/react-start'

import { requireAuthContract } from './auth-gate'
import { gatewayChat, routeLlmChat } from './aiGateway.server'

const ANALYST_SYSTEM_PROMPT = `You are a business development analyst for a professional network of CEOs and senior executives. Analyze the member's data and return ONLY valid JSON with no markdown, no explanation, and no extra whitespace:
{"lead_leaks":["...","..."],"cold_relationships":["...","..."],"partner_needs":["...","..."],"top_opportunities":[{"title":"...","rationale":"...","action":"..."}],"health_score":75,"summary":"..."}`

export interface BusinessOpportunity {
  title: string
  rationale: string
  action: string
}

export interface BusinessDiagnostic {
  id: string
  generated_at: string
  lead_leaks: string[]
  cold_relationships: string[]
  partner_needs: string[]
  top_opportunities: BusinessOpportunity[]
  health_score: number
  summary: string
}

export interface BusinessAnalysisResult {
  report: BusinessDiagnostic | null
  error?: string
}

/**
 * Generate a fresh AI business diagnostic for the signed-in member. Reads their
 * profile, recent asks, intro history, and outcomes, calls the AI gateway, and
 * stores the result in business_diagnostics. Returns the saved report.
 */
export const generateBusinessAnalysis = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<BusinessAnalysisResult> => {
    const db = (context as any).supabase
    const userId: string = (context as any).userId

    // Gather the member's profile.
    const { data: profile } = await db
      .from('profiles')
      .select('name, what_i_do, can_help_with, expertise, company, title')
      .eq('id', userId)
      .maybeSingle()

    if (!profile) return { report: null, error: 'Profile not found.' }

    // Recent asks (last 60 days).
    const since = new Date(Date.now() - 60 * 86400000).toISOString()
    const { data: asks } = await db
      .from('asks')
      .select('ask, status, created_at')
      .eq('author_id', userId)
      .gte('created_at', since)
      .limit(20)

    // Intro history with outcomes.
    const { data: intros } = await db
      .from('intro_requests')
      .select('id, reason, created_at, accepted_at, status')
      .or(`user_id.eq.${userId},target_user_id.eq.${userId}`)
      .not('accepted_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30)

    const introIds = (intros ?? []).map((i: any) => i.id)
    const { data: outcomes } = introIds.length
      ? await db
          .from('intro_outcomes')
          .select('intro_request_id, stage, created_at')
          .eq('author_id', userId)
          .in('intro_request_id', introIds)
          .order('created_at', { ascending: false })
          .limit(40)
      : { data: [] }

    // Recent network activity: open asks from the platform.
    const { data: networkAsks } = await db
      .from('asks')
      .select('ask, author_id, created_at')
      .eq('is_demo', false)
      .eq('visibility', 'network')
      .neq('status', 'closed')
      .neq('author_id', userId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)

    // Build context string for the AI.
    const profileText = [
      `Name: ${profile.name ?? 'Unknown'}`,
      profile.title ? `Title: ${profile.title}` : null,
      profile.company ? `Company: ${profile.company}` : null,
      profile.what_i_do ? `What they do: ${profile.what_i_do}` : null,
      profile.can_help_with ? `Can help with: ${profile.can_help_with}` : null,
      profile.expertise ? `Expertise: ${profile.expertise}` : null,
    ].filter(Boolean).join('\n')

    const asksText = (asks ?? []).length
      ? `Open/recent asks:\n${(asks as any[]).map((a: any) => `- ${a.ask} (${a.status})`).join('\n')}`
      : 'No recent asks.'

    const introsText = (intros ?? []).length
      ? `Intro history (last 30):\n${(intros as any[]).map((i: any) => {
          const stage = (outcomes as any[] ?? []).find((o: any) => o.intro_request_id === i.id)?.stage ?? 'no follow-up'
          return `- ${i.reason ?? 'No reason given'} → ${stage} (${i.accepted_at ? 'accepted' : i.status})`
        }).join('\n')}`
      : 'No accepted intros yet.'

    const networkText = (networkAsks ?? []).length
      ? `Active network needs right now:\n${(networkAsks as any[]).slice(0, 10).map((a: any) => `- ${a.ask}`).join('\n')}`
      : 'No network asks at the moment.'

    const userContent = `${profileText}\n\n${asksText}\n\n${introsText}\n\n${networkText}`

    const routeKey = process.env['ROUTELLM_API_KEY']
    const apiKey = process.env['LOVABLE_API_KEY']
    if (!routeKey && !apiKey) return { report: null, error: 'AI analysis is not configured on this account yet.' }

    let answer: string
    try {
      const request = {
        system: ANALYST_SYSTEM_PROMPT,
        messages: [{ role: 'user' as const, content: userContent }],
        maxSteps: 1,
      }
      answer = routeKey ? await routeLlmChat(request) : await gatewayChat(request)
    } catch (e) {
      return { report: null, error: e instanceof Error ? e.message : 'The analyst could not answer just now.' }
    }

    // Parse the JSON response.
    let parsed: Record<string, unknown>
    try {
      const cleaned = answer.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      parsed = JSON.parse(cleaned) as Record<string, unknown>
    } catch {
      return { report: null, error: 'The analyst returned an unexpected format. Please try again.' }
    }

    // Store the result.
    const { data: saved, error: saveError } = await db
      .from('business_diagnostics' as never)
      .insert({
        user_id: userId,
        lead_leaks: parsed['lead_leaks'] ?? [],
        cold_relationships: parsed['cold_relationships'] ?? [],
        partner_needs: parsed['partner_needs'] ?? [],
        top_opportunities: parsed['top_opportunities'] ?? [],
        health_score: typeof parsed['health_score'] === 'number' ? Math.max(0, Math.min(100, parsed['health_score'])) : 50,
        summary: typeof parsed['summary'] === 'string' ? parsed['summary'] : '',
        model_used: routeKey ? 'routellm' : 'gateway',
      } as never)
      .select()
      .single()

    if (saveError) return { report: null, error: `Analysis complete but could not be saved: ${saveError.message}` }

    return { report: saved as unknown as BusinessDiagnostic }
  })

/**
 * Return the most recent AI business diagnostic for the signed-in member.
 */
export const getLatestAnalysis = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<BusinessAnalysisResult> => {
    const db = (context as any).supabase
    const userId: string = (context as any).userId

    const { data, error } = await db
      .from('business_diagnostics' as never)
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return { report: null, error: error.message }
    return { report: (data as unknown as BusinessDiagnostic) ?? null }
  })
