import type { NetworkAsk } from '../social';

/** Compare only published, currently open business needs with the owner's
 * explicitly recorded capability text. This is a review queue, not a personal
 * suitability score, identity inference, or permission to contact anyone.
 */
const excluded = new Set('about across also and are business company companies could doing every from help have into just looking make more need needs offer offers only people provide services some that their them there these they this through want what when where which will with work working would your find seeking partner partners'.split(' '));
function terms(input: string) {
  return new Set(input.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>=4&&!excluded.has(w)));
}
export type PublishedNeedMatch = { id: string; ask: string; memberId: string; evidence: string[]; urgency: NetworkAsk['urgency']; directConnection: boolean };
export function findPublishedNeedMatches(input: {
  capabilities: readonly string[];
  asks: readonly NetworkAsk[];
  connectedIds: readonly string[];
  allowed: boolean;
}, now = Date.now()): PublishedNeedMatch[] {
  if (!input.allowed) return [];
  const mine=terms(input.capabilities.join(' '));
  if (mine.size<2) return [];
  const connected=new Set(input.connectedIds);
  const matches: PublishedNeedMatch[]=[];
  const seen=new Set<string>();
  for (const ask of input.asks) {
    if (!ask.id || !ask.memberId || ask.mine || ask.memberId==='me' || ask.visibility!=='network' || ask.status!=='open' || seen.has(ask.id)) continue;
    if (ask.expiresAt) { const expiry=Date.parse(ask.expiresAt); if (!Number.isFinite(expiry)||expiry<=now) continue; }
    // An overlapping industry name by itself is insufficient; use the actual request text.
    const need=terms(ask.ask+' '+ask.detail);
    const evidence=[...mine].filter(term=>need.has(term)).sort();
    if (evidence.length<2) continue;
    seen.add(ask.id);
    matches.push({id:ask.id,ask:ask.ask.slice(0,240),memberId:ask.memberId,evidence:evidence.slice(0,8),urgency:ask.urgency,directConnection:connected.has(ask.memberId)});
  }
  const urgency={high:0,medium:1,low:2};
  return matches.sort((a,b)=>b.evidence.length-a.evidence.length || urgency[a.urgency]-urgency[b.urgency] || Number(b.directConnection)-Number(a.directConnection) || a.id.localeCompare(b.id)).slice(0,8);
}
