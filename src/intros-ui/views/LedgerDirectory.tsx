import { newcomerLane } from '@/features/evidence-loop/matching';
import { PeopleDirectoryView } from '../../bridge-reference/src/intros-ui/views/PeopleDirectoryView';
import type { ExperienceView } from '../experience/preference';
import { MemberThumbnail } from '../components/shared/MemberThumbnail';
/* CRM Contacts pattern, sourced from the REAL Bridge directory.
 * Search, saved and connection actions remain the signed-in handlers.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, Handshake, ListFilter, Network, Search, UserRound, Users, Sparkles, MessageCircle } from 'lucide-react';
import { SemanticNetworkSearch } from './SemanticNetworkSearch';
import type { SemanticSearchResult } from '@/lib/semanticSearch.functions';
import type { NetworkMember } from '@/intros-ui/networkData';
import type { ActivePage } from '@/intros-ui/components/layout/TopNavigation';
import { PageHeader, Panel, StatCard } from '@/intros-ui/components/layout/LedgerUiKit';
import './ledger-directory.css';

export function LedgerDirectory({
  experience = 'business', members, isLive, connectedMemberIds, savedMemberIds, onToggleConnect, onToggleSave,
  onRequestIntro, onMessage, onNavigate, searchQuery = '',
}: {
  experience?: ExperienceView;
  members: NetworkMember[]; isLive: boolean; connectedMemberIds: Set<string>; savedMemberIds: Set<string>;
  onToggleConnect: (id: string) => void; onToggleSave: (id: string) => void;
  onRequestIntro: (person: NetworkMember) => void;
  onMessage: (person: NetworkMember) => void;
  onNavigate: (page: ActivePage, memberId?: string) => void;
  searchQuery?: string;
}) {
  const [search, setSearch] = useState(searchQuery);
  const [semantic, setSemantic] = useState<SemanticSearchResult | null>(null);
  const insightById = useMemo(() => new Map((semantic?.matches ?? []).map(match => [match.id, match])), [semantic]);
  const displayMembers = useMemo(() => semantic
    ? semantic.matches.flatMap(match => { const person = members.find(row => row.id === match.id); return person ? [{...person, matchExplanation: match.insight}] : []; })
    : members, [members, semantic]);
  useEffect(() => { setSearch(searchQuery); }, [searchQuery]);
  const [role, setRole] = useState('all');
  const [sort, setSort] = useState<'name' | 'match'>('match');
  const filtered = useMemo(() => { const rows=displayMembers.filter(person => {
    const query = search.trim().toLowerCase();
    const text = [person.name, person.title, person.company, person.industry, person.location].join(' ').toLowerCase();
    return (!query || text.includes(query)) && (role === 'all' || person.roleType === role);
  }).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : b.matchScore - a.matchScore); return sort === 'match' ? newcomerLane(rows,p=>p.id,p=>Boolean(p.newcomerEligible)) : rows; }, [displayMembers, search, role, sort]);
  const newcomer=filtered.find(p=>p.newcomerEligible);
  return <><div className="mb-4"><SemanticNetworkSearch live={isLive} onResults={result => { setSemantic(result); setSearch(''); setRole('all'); }} />
    {semantic && <div role="status" className="mt-3 rounded-xl border border-amber-400/30 bg-[#12151c] p-3 text-xs text-slate-200">
      <strong className="text-amber-300">{displayMembers.length} AI matches</strong> from {semantic.reviewed} approved profiles reviewed.
      {semantic.truncated && <span> More profiles exist; this search covers the first 100 visible records.</span>}
      {!displayMembers.length && <span> No profiles had sufficiently supported matches. Try another description or standard search.</span>}
    </div>}
    {semantic && displayMembers.length > 0 && <div aria-label="AI match insights" className="mt-3 grid gap-2 sm:grid-cols-2">
      {displayMembers.map(person => <article key={person.id} className="rounded-xl border border-white/15 bg-[#141820] p-3 text-slate-100 shadow-lg">
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-300"><Sparkles size={13}/> AI Match Insight</span>
        <button type="button" onClick={() => onNavigate('people', person.id)} className="mt-2 text-left text-sm font-semibold text-white hover:underline">{person.name}</button>
        <p className="mt-1 text-xs text-slate-300">{person.title} · {person.company}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-200">{insightById.get(person.id)?.insight}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => onRequestIntro(person)} className="rounded-md bg-[#b42328] px-3 py-2 text-xs font-semibold text-white">Request Intro</button>
          <button type="button" onClick={() => onMessage(person)} className="flex items-center gap-1 rounded-md border border-white/30 px-3 py-2 text-xs text-white"><MessageCircle size={13}/> Message</button>
        </div>
      </article>)}
    </div>}
  </div>{newcomer&&<section className="ledger-directory" aria-label="Newcomer lane"><Panel title="Newcomer lane" subtitle="A relevant new member, with room to build a network. Selection rotates daily; fit scores stay unchanged."><button className="ledger-ui-button secondary" onClick={()=>onNavigate('people',newcomer.id)}>{newcomer.name} · {newcomer.title}</button><p>New to Ask Intros. Recommendations are introductions to explore, not hiring decisions.</p></Panel></section>}<div hidden={experience !== 'social'}><PeopleDirectoryView members={displayMembers} isLive={isLive} onNavigate={onNavigate} onRequestIntro={onRequestIntro} connectedMemberIds={connectedMemberIds} onToggleConnect={onToggleConnect}/></div><div className="ledger-directory" hidden={experience === 'social'}>
    <PageHeader eyebrow="Relationships / Contacts" title="People & Network"
      description="Find the people, context and warm paths that matter."
      actions={<>
        <button type="button" className="ledger-ui-button secondary" onClick={() => onNavigate('bubbles')}><Network size={15}/> Network map</button>
        <button type="button" className="ledger-ui-button primary" onClick={() => onNavigate('intros')}><Handshake size={15}/> Introductions</button>
      </>}/>
    <div className="ledger-dashboard-stats ledger-directory-stats">
      <StatCard label="People in directory" value={String(members.length)} hint={isLive ? 'Verified member network' : 'Guided showcase'} icon={<Users size={17}/>}/>
      <StatCard label="Connections" value={String(connectedMemberIds.size)} hint="Members you have connected with" icon={<Network size={17}/>}/>
      <StatCard label="Saved contacts" value={String(savedMemberIds.size)} hint="Private saved relationships" icon={<Bookmark size={17}/>}/>
      <StatCard label="Open to intros" value={String(members.filter(m => m.openToIntros).length)} hint="People welcoming introductions" icon={<Handshake size={17}/>}/>
    </div>
    <Panel title="Member records" subtitle={String(filtered.length) + ' matching people'}
      action={<span className="ledger-directory-mode">{semantic ? 'AI MATCHED DIRECTORY' : isLive ? 'LIVE DIRECTORY' : 'SHOWCASE DIRECTORY'}</span>} bodyClassName="ledger-directory-panel">
      <div className="ledger-directory-toolbar">
        <label className="ledger-directory-search"><Search size={15}/><span className="sr-only">Search people</span>
          <input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search name, company, industry or city…" />
        </label>
        <label className="ledger-directory-select"><ListFilter size={15}/><span className="sr-only">Filter role</span>
          <select aria-label="Filter member role" value={role} onChange={event=>setRole(event.target.value)}>
            <option value="all">All roles</option>
            <option value="founder">Founders</option><option value="investor">Investors</option>
            <option value="operator">Operators</option><option value="advisor">Advisors</option>
            <option value="expert">Experts</option>
          </select>
        </label>
        <label className="ledger-directory-select"><span className="sr-only">Sort members</span>
          <select aria-label="Sort members" value={sort} onChange={event=>setSort(event.target.value as 'name' | 'match')}>
            <option value="match">Match score</option><option value="name">Name</option>
          </select>
        </label>
      </div>
      <div className="ledger-directory-table-scroller">
        <table role="table" className="ledger-directory-table" data-presentation={experience === 'social' ? 'cards' : 'table'}>
          <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Member</th><th scope="col" role="columnheader">Industry / Role</th><th scope="col" role="columnheader">Location</th><th scope="col" role="columnheader">Fit</th><th scope="col" role="columnheader">Relationship</th><th scope="col" role="columnheader">Actions</th></tr></thead>
          <tbody role="rowgroup">
          {filtered.map(person => <tr role="row" key={person.id}>
            <td role="cell"><button type="button" className="ledger-directory-person" onClick={() => onNavigate('people',person.id)}>
              <MemberThumbnail name={person.name} source={person.avatarUrl} className="ledger-person-initial"/>
              <span><strong>{person.name}</strong><small>{person.title} · {person.company}</small></span>
            </button></td>
            <td role="cell"><span className="ledger-directory-role">{person.roleType}</span><small>{person.industry || 'Business'}</small></td>
            <td role="cell">{person.location}</td>
            <td role="cell"><span className="ledger-directory-fit">{person.matchScore}%</span>{person.newcomerEligible&&<small>Newcomer eligible</small>}{insightById.has(person.id)&&<span className="block text-[10px] uppercase tracking-wide text-amber-500">AI Match Insight</span>}{person.matchExplanation&&<details><summary>Why this match</summary><p>{person.matchExplanation}</p></details>}</td>
            <td role="cell"><span className={connectedMemberIds.has(person.id) ? 'ledger-directory-status connected' : 'ledger-directory-status'}>
              {connectedMemberIds.has(person.id) ? 'Connected' : 'Not connected'}</span></td>
            <td role="cell"><div className="ledger-directory-actions">
              <button type="button" aria-label={(connectedMemberIds.has(person.id) ? 'Disconnect ' : 'Connect with ') + person.name}
                title={connectedMemberIds.has(person.id)?'Disconnect':'Connect'} onClick={()=>onToggleConnect(person.id)}>
                <Users size={14}/></button>
              <button type="button" aria-label={(savedMemberIds.has(person.id)?'Unsave ':'Save ')+person.name}
                title={savedMemberIds.has(person.id)?'Remove saved contact':'Save contact'}
                className={savedMemberIds.has(person.id)?'saved':''} onClick={()=>onToggleSave(person.id)}><Bookmark size={14}/></button>
              <button type="button" aria-label={'Request introduction to '+person.name} title="Request introduction"
                onClick={()=>onRequestIntro(person)}><Handshake size={14}/></button>
              <button type="button" aria-label={'Message '+person.name} title="Message (opens a conversation, does not send)" onClick={()=>onMessage(person)}><MessageCircle size={14}/></button>
            </div></td>
          </tr>)}
          </tbody>
        </table>
        {!filtered.length && <div className="ledger-ui-empty">{members.length ? 'No matching people. Clear a filter or try another keyword.' : isLive ? 'The verified directory is loading or unavailable.' : 'No people yet.'}</div>}
      </div>
    </Panel>
  </div></>;
}
