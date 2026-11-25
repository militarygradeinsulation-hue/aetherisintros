/** On-demand referral candidates from visible profile claims and the caller's
 * recorded connections. A shared topic is not proof of a second-degree edge.
 * No external AI, hidden relationship reads, or inferred personal attributes.
 */
export interface ReferralProfile {
  id: string; name?: string; title?: string; company?: string; focus?: string;
  looking_for?: string; can_help_with?: string; industries?: string[]; expertise?: string[];
}
const ignored = new Set('about across business company companies could doing every from help have looking more need needs offer offers people provide services that their them these this through want what when where which with work working would your'.split(' '));
const terms=(text:string)=>new Set(text.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>=4&&!ignored.has(w)));
const shared=(a:Set<string>,b:Set<string>)=>[...a].filter(w=>b.has(w)).sort();
const capability=(p:ReferralProfile)=>terms([p.can_help_with,p.focus,...(p.expertise ?? [])].filter(Boolean).join(' '));
const short=(s:string|undefined,fallback:string)=>s?.trim().slice(0,100)||fallback;
export interface ReferralCandidate {
  target_user_id:string; connector_user_id:string; path_explanation:string;
  shared_context:string; strength_score:number;
}
export function buildWarmReferralCandidates(owner:ReferralProfile, connectors:readonly ReferralProfile[], visible:readonly ReferralProfile[]):ReferralCandidate[] {
  const goal=terms([owner.looking_for,owner.focus].filter(Boolean).join(' '));
  if (goal.size===0) return [];
  const connected=new Set(connectors.map(p=>p.id));
  const candidates:ReferralCandidate[]=[];
  for (const target of visible) {
    if (!target.id || target.id===owner.id || connected.has(target.id)) continue;
    const targetTopics=capability(target), fit=shared(goal,targetTopics);
    if (!fit.length) continue;
    for(const connector of connectors) {
      if (!connector.id || connector.id===owner.id || connector.id===target.id) continue;
      const topics=shared(capability(connector),targetTopics);
      if (!topics.length) continue;
      candidates.push({
        target_user_id:target.id,connector_user_id:connector.id,
        path_explanation:'Possible referral: you have a recorded connection to '+short(connector.name,'this connector')+'. '+short(target.name,'The target')+' lists relevant professional topics. The connector also lists overlapping topics. Confirm whether the connector actually knows the target before requesting an introduction.',
        shared_context:'Need overlap: '+fit.slice(0,6).join(', ')+'; connector topic overlap: '+topics.slice(0,6).join(', ')+'. No verified connector-to-target relationship.',
        strength_score:Math.min(80,20+15*fit.length+10*topics.length),
      });
    }
  }
  const seen=new Set<string>();
  return candidates.sort((a,b)=>b.strength_score-a.strength_score || a.target_user_id.localeCompare(b.target_user_id)||a.connector_user_id.localeCompare(b.connector_user_id))
    .filter(x=>{if(seen.has(x.target_user_id))return false;seen.add(x.target_user_id);return true}).slice(0,5);
}
