/**
 * GET /api/agent/manifest: a machine-readable description of the Agent Trust Gateway so other
 * AI agents can use it without a human reading docs.
 */
import { AGENT_SCOPES } from './keys'
import { LIMITS } from './rate-limit'
import { FIELD_LIMITS } from './screening'

export function agentManifest(origin: string) {
  const url = (path: string) => `${origin}${path}`
  return {
    name: 'Ask Intros Agent Trust Gateway',
    version: '1',
    description: 'Ask Intros is a verified network of owners and CEOs. Members decide which AI agents may reach them and on what terms. Requests are screened against each member\'s own policy; there is no mass outreach and no way to buy access.',
    endpoints: {
      inbound: {
        method: 'POST', url: url('/api/agent/inbound'), auth: 'none (optional: Bearer assistant key of a verified member, which counts as verified)',
        purpose: 'Ask to reach one member, by their public handle, for a named real person.',
        request_schema: {
          type: 'object',
          required: ['to', 'requester_name', 'requester_email', 'reason'],
          additionalProperties: false,
          properties: {
            to: { type: 'string', pattern: '^@?[a-z0-9][a-z0-9-]{2,39}$', description: 'The member\'s public handle, which they share themselves.' },
            requester_name: { type: 'string', minLength: 2, maxLength: FIELD_LIMITS.requester_name, description: 'The real person who wants to talk.' },
            requester_company: { type: 'string', maxLength: FIELD_LIMITS.requester_company },
            requester_email: { type: 'string', format: 'email', description: 'Revealed to the member only if they accept.' },
            on_behalf_of: { type: 'string', maxLength: FIELD_LIMITS.on_behalf_of, description: 'Who the agent acts for, and in what role.' },
            reason: { type: 'string', maxLength: FIELD_LIMITS.reason, description: 'Why this member specifically, and why now. Specific, written for one person.' },
            offer: { type: 'string', maxLength: FIELD_LIMITS.offer, description: 'What the member gets, whether or not they say yes.' },
            links: { type: 'array', maxItems: FIELD_LIMITS.links, items: { type: 'string', format: 'uri', maxLength: FIELD_LIMITS.link } },
          },
        },
        responses: {
          '202': { status: 'received', note: 'Identical whether the request was delivered, held for review, or the handle does not accept agent requests (or does not exist).' },
          '400': { status: 'rejected', note: 'errors lists the invalid fields.' },
          '401': 'An Authorization header was sent but the key is invalid, revoked, or lacks request_intro.',
          '422': { status: 'rejected', note: 'errors explains why: fix it rather than retrying the same text.' },
          '429': 'Rate limited; see the Retry-After header.',
        },
      },
      assistant: {
        auth: 'Authorization: Bearer ai_… (a key a member issued to their own assistant in Settings → Connected apps → AI assistants)',
        acts_as: 'The member who issued the key. Every call is logged and visible to that member.',
        scopes: AGENT_SCOPES,
        routes: [
          { method: 'GET', url: url('/api/agent/profile'), scope: 'read_profile_public', returns: 'The key owner\'s public profile.' },
          { method: 'GET', url: url('/api/agent/members?q=&limit='), scope: 'search_members', returns: 'Verified members matching q (max 25).' },
          { method: 'POST', url: url('/api/agent/asks'), scope: 'create_ask', body: { ask: 'string (required)', detail: 'string', why_now: 'string', offer: 'string', industry: 'string', location: 'string', urgency: 'low|medium|high', visibility: 'network|private' } },
          { method: 'POST', url: url('/api/agent/intros'), scope: 'request_intro', body: { member_id: 'uuid (required)', why_exists: 'string ≥12 (required)', why_requester: 'string ≥12 (required)', why_target: 'string ≥12 (required)', why_now: 'string ≥12 (required)', first_goal: 'string' }, note: 'Double opt-in: the other member reviews the context capsule before anything is shared.' },
        ],
      },
    },
    rules: [
      'Write each request for one person. The same text sent again within 30 days, to anyone, is rejected.',
      'No mass outreach, no sales language, no shouting, at most a few links.',
      'Members set their own policy: off, verified senders only, or everyone; topics they welcome or refuse; minimum context; a daily cap. Requests on refused topics or blocked domains are rejected.',
      'Nothing reveals whether a member exists or reads agent requests unless they accept.',
      'If the member accepts, they contact the requester by email. Do not follow up through other channels because of a 202.',
    ],
    rate_limits: {
      assistant_key_calls_per_hour: `${LIMITS.keyPerHour} by default (set per key)`,
      assistant_key_intro_requests_per_day: `${LIMITS.introsPerDay} by default (set per key)`,
      inbound_per_ip_per_hour: LIMITS.inboundPerIpHour,
      inbound_per_email_domain_per_day: LIMITS.inboundPerDomainDay,
      member_daily_cap: 'Set by each member (1–50).',
    },
  }
}
