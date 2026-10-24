import { MemberThumbnail } from '../components/shared/MemberThumbnail';
/* CRM Contacts pattern, sourced from the REAL Bridge directory.
 * Search, saved and connection actions remain the signed-in handlers.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, Handshake, ListFilter, Network, Search, UserRound, Users } from 'lucide-react';
import type { NetworkMember } from '@/intros-ui/networkData';
import type { ActivePage } from '@/intros-ui/components/layout/TopNavigation';
import { PageHeader, Panel, StatCard } from '@/intros-ui/components/layout/LedgerUiKit';
import './ledger-directory.css';

export function LedgerDirectory({
  members, isLive, connectedMemberIds, savedMemberIds, onToggleConnect, onToggleSave,
  onRequestIntro, onNavigate, searchQuery = '',
}: {
  members: NetworkMember[]; isLive: boolean; connectedMemberIds: Set<string>; savedMemberIds: Set<string>;
  onToggleConnect: (id: string) => void; onToggleSave: (id: string) => void;
  onRequestIntro: (person: NetworkMember) => void;
  onNavigate: (page: ActivePage, memberId?: string) => void;
  searchQuery?: string;
}) {
  const [search, setSearch] = useState(searchQuery);
  useEffect(() => { setSearch(searchQuery); }, [searchQuery]);
  const [role, setRole] = useState('all');
  const [sort, setSort] = useState<'name' | 'match'>('match');
  const filtered = useMemo(() => members.filter(person => {
    const query = search.trim().toLowerCase();
    const text = [person.name, person.title, person.company, person.industry, person.location].join(' ').toLowerCase();
    return (!query || text.includes(query)) && (role === 'all' || person.roleType === role);
  }).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : b.matchScore - a.matchScore), [members, search, role, sort]);
  return <div className="ledger-directory">
    <PageHeader eyebrow="Relationships / Contacts" title="People & Network"
      description="A working relationship directory, not a visual gallery. Find the people, context and warm paths that matter."
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
      action={<span className="ledger-directory-mode">{isLive ? 'LIVE DIRECTORY' : 'SHOWCASE DIRECTORY'}</span>} bodyClassName="ledger-directory-panel">
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
        <table className="ledger-directory-table">
          <thead><tr><th>Member</th><th>Industry / Role</th><th>Location</th><th>Fit</th><th>Relationship</th><th>Actions</th></tr></thead>
          <tbody>
          {filtered.map(person => <tr key={person.id}>
            <td><button type="button" className="ledger-directory-person" onClick={() => onNavigate('people',person.id)}>
              <MemberThumbnail name={person.name} source={person.avatarUrl} className="ledger-person-initial"/>
              <span><strong>{person.name}</strong><small>{person.title} · {person.company}</small></span>
            </button></td>
            <td><span className="ledger-directory-role">{person.roleType}</span><small>{person.industry || 'Business'}</small></td>
            <td>{person.location}</td>
            <td><span className="ledger-directory-fit">{person.matchScore}%</span></td>
            <td><span className={connectedMemberIds.has(person.id) ? 'ledger-directory-status connected' : 'ledger-directory-status'}>
              {connectedMemberIds.has(person.id) ? 'Connected' : 'Not connected'}</span></td>
            <td><div className="ledger-directory-actions">
              <button type="button" aria-label={(connectedMemberIds.has(person.id) ? 'Disconnect ' : 'Connect with ') + person.name}
                title={connectedMemberIds.has(person.id)?'Disconnect':'Connect'} onClick={()=>onToggleConnect(person.id)}>
                <Users size={14}/></button>
              <button type="button" aria-label={(savedMemberIds.has(person.id)?'Unsave ':'Save ')+person.name}
                title={savedMemberIds.has(person.id)?'Remove saved contact':'Save contact'}
                className={savedMemberIds.has(person.id)?'saved':''} onClick={()=>onToggleSave(person.id)}><Bookmark size={14}/></button>
              <button type="button" aria-label={'Request introduction to '+person.name} title="Request introduction"
                onClick={()=>onRequestIntro(person)}><Handshake size={14}/></button>
            </div></td>
          </tr>)}
          </tbody>
        </table>
        {!filtered.length && <div className="ledger-ui-empty">{members.length ? 'No matching people. Clear a filter or try another keyword.' : isLive ? 'The verified directory is loading or unavailable.' : 'No people yet.'}</div>}
      </div>
    </Panel>
  </div>;
}
