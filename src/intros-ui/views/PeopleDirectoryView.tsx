import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, LayoutGrid, List, Orbit, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NetworkMember, RelationshipTier } from '../networkData';
import { ExecutivePortrait } from '../components/shared/ExecutivePortrait';
import { FloatingConnectionField } from '../components/shared/FloatingConnectionField';
import type { ActivePage } from '../components/layout/TopNavigation';
import { directoryDistribution, selectDirectoryMembers } from '../directory-model';
import './people-directory.css';

interface PeopleDirectoryViewProps {
  members: NetworkMember[];
  onNavigate: (page: ActivePage, memberId?: string) => void;
  onRequestIntro: (member: NetworkMember) => void;
  connectedMemberIds: Set<string>;
  onToggleConnect: (memberId: string) => void;
  isLive?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export const PeopleDirectoryView: React.FC<PeopleDirectoryViewProps> = ({ members, onNavigate, onRequestIntro, connectedMemberIds, onToggleConnect, isLive = false, searchQuery, onSearchChange }) => {
  const [localKeyword, setLocalKeyword] = useState('');
  const searchKeyword = searchQuery ?? localKeyword;
  const setSearchKeyword = onSearchChange ?? setLocalKeyword;
  const [selectedRoleTypes, setSelectedRoleTypes] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [selectedTier, setSelectedTier] = useState<'All' | RelationshipTier>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'bubbles'>('list');
  const [sortBy, setSortBy] = useState<'relevance' | 'match' | 'mutuals'>('relevance');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [section, setSection] = useState<'people' | 'context'>('people');
  const filterToggle = useRef<HTMLButtonElement>(null);
  const filterPanel = useRef<HTMLElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const closeFilters = () => { setFiltersOpen(false); filterToggle.current?.focus(); };
  useEffect(() => {
    if (filtersOpen) filterPanel.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [filtersOpen]);
  useEffect(() => { results.current?.scrollTo({ top: 0 }); }, [searchKeyword, selectedTier, selectedCity, selectedIndustry, selectedRoleTypes, sortBy, section, viewMode]);

  const filteredMembers = useMemo(() => selectDirectoryMembers(members, { keyword: searchKeyword, roles: selectedRoleTypes, city: selectedCity, industry: selectedIndustry, tier: selectedTier, sort: sortBy }), [members, searchKeyword, selectedRoleTypes, selectedCity, selectedIndustry, selectedTier, sortBy]);
  const locations = useMemo(() => directoryDistribution(members, 'location'), [members]);
  const industries = useMemo(() => directoryDistribution(members, 'industry'), [members]);
  const connectors = useMemo(() => members.filter(m => m.openToIntros), [members]);
  const activeFilters = selectedRoleTypes.length + Number(selectedCity !== 'All') + Number(selectedIndustry !== 'All') + Number(selectedTier !== 'All');
  const clearFilters = () => { setSearchKeyword(''); setSelectedRoleTypes([]); setSelectedCity('All'); setSelectedIndustry('All'); setSelectedTier('All'); setSortBy('relevance'); };
  const changeSection = (next: 'people' | 'context') => { setSection(next); setFiltersOpen(false); };

  return <section className="people-directory" aria-label="Member directory">
    <header className="directory-heading">
      <h1>Member Network</h1>
      <nav aria-label="Network destinations">
        <Button variant="ghost" size="sm" aria-current="page" onClick={() => changeSection('people')}>People</Button>
        <Button variant="ghost" size="sm" onClick={() => onNavigate('intros')}>Introductions<ArrowRight size={14}/></Button>
      </nav>
    </header>
    <div className="directory-toolbar">
      <label className="directory-search"><Search size={16} aria-hidden="true"/>
        <input type="search" value={searchKeyword} onChange={e => { setSearchKeyword(e.target.value); setSection('people'); }} placeholder="Name, company, role or city" aria-label="Search the member network"/>
      </label>
      <Button ref={filterToggle} variant="outline" size="sm" aria-expanded={filtersOpen} aria-controls="people-filter-rail" onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal size={14}/>Filters{activeFilters ? ` (${activeFilters})` : ''}</Button>
      <select value={sortBy} aria-label="Sort people" onChange={e => { const v=e.target.value; if (v==='relevance'||v==='match'||v==='mutuals') setSortBy(v); }}>
        <option value="relevance">Relevance</option><option value="match">Highest fit</option><option value="mutuals">Most mutuals</option>
      </select>
      <div className="directory-views" role="group" aria-label="Directory view">
        {([{id:'list',label:'List view',Icon:List},{id:'grid',label:'Grid view',Icon:LayoutGrid},{id:'bubbles',label:'Connection bubbles',Icon:Orbit}] as const).map(({id,label,Icon}) => <Button key={id} variant="ghost" size="icon" aria-label={label} title={label} aria-pressed={viewMode===id && section==='people'} onClick={() => {setViewMode(id);changeSection('people');}}><Icon size={16}/></Button>)}
      </div>
    </div>
    <div className="directory-heading">
      <p className="directory-meta" role="status">{filteredMembers.length} of {members.length} people{!isLive ? ' · Demo' : ''}</p>
      <Button variant="ghost" size="sm" aria-pressed={section==='context'} onClick={() => changeSection(section==='people'?'context':'people')}>{section==='context'?'Back to results':'Network context'}</Button>
    </div>
    <div className="directory-body">
      {filtersOpen && <aside id="people-filter-rail" ref={filterPanel} className="directory-filters" aria-label="Filter people" onKeyDown={e => {
        if(e.key==='Escape') {e.preventDefault();closeFilters();}
        if(e.key==='Tab' && window.matchMedia('(max-width: 760px)').matches) {
          const nodes=filterPanel.current?.querySelectorAll<HTMLElement>('button,input,select');
          if(!nodes?.length) return;
          const first=nodes[0], last=nodes[nodes.length-1];
          if(e.shiftKey && document.activeElement===first) {e.preventDefault();last?.focus();}
          else if(!e.shiftKey && document.activeElement===last) {e.preventDefault();first?.focus();}
        }
      }}>
        <div className="directory-heading"><h2>Filter people</h2><Button variant="ghost" size="icon" aria-label="Close filters" onClick={closeFilters}><X size={16}/></Button></div>
        <label>Relationship tier<select aria-label="Relationship tier" value={selectedTier} onChange={e => {const v=e.target.value;if(v==='All'||v==='Core'||v==='Extended'||v==='Prospect')setSelectedTier(v);}}>
          <option value="All">All members ({members.length})</option>{(['Core','Extended','Prospect'] as const).map(t => <option key={t} value={t}>{t} ({members.filter(m=>m.tier===t).length})</option>)}
        </select></label>
        <label>City / Location<select aria-label="City / Location" value={selectedCity} onChange={e=>setSelectedCity(e.target.value)}><option value="All">Any location</option>{locations.map(([name,count])=><option key={name} value={name}>{name} ({count})</option>)}</select></label>
        <label>Industry<select aria-label="Industry" value={selectedIndustry} onChange={e=>setSelectedIndustry(e.target.value)}><option value="All">All industries</option>{industries.map(([name,count])=><option key={name} value={name}>{name} ({count})</option>)}</select></label>
        <fieldset><legend>Role</legend>{(['founder','operator','investor','advisor','expert'] as const).map(role=><label key={role}><input type="checkbox" checked={selectedRoleTypes.includes(role)} onChange={()=>setSelectedRoleTypes(prev=>prev.includes(role)?prev.filter(r=>r!==role):[...prev,role])}/>{role[0]?.toUpperCase()}{role.slice(1)}</label>)}</fieldset>
        <Button variant="outline" size="sm" onClick={clearFilters}>Reset filters</Button>
        <Button variant="outline" size="sm" onClick={closeFilters}>Show results</Button>
      </aside>}
      <div ref={results} className="directory-results" role="region" aria-label={section==='people'?'Member results':'Network context'} tabIndex={0}>
        {section==='context' ? <div className="directory-context">
          <section><h2>Geography</h2>{locations.length?<dl>{locations.map(([name,count])=><React.Fragment key={name}><dt><Button variant="ghost" size="sm" onClick={()=>{setSelectedCity(name);changeSection('people');}}>{name}</Button></dt><dd>{count}</dd></React.Fragment>)}</dl>:<p className="directory-meta">No locations supplied.</p>}</section>
          <section><h2>Industries</h2>{industries.length?<dl>{industries.map(([name,count])=><React.Fragment key={name}><dt><Button variant="ghost" size="sm" onClick={()=>{setSelectedIndustry(name);changeSection('people');}}>{name}</Button></dt><dd>{count}</dd></React.Fragment>)}</dl>:<p className="directory-meta">No industries supplied.</p>}</section>
          <section><h2>Open to introductions</h2><ul>{connectors.map(m=><li key={m.id}><Button variant="ghost" size="sm" onClick={()=>onNavigate('profile',m.id)}>{m.name}</Button><Button variant="outline" size="sm" onClick={()=>onRequestIntro(m)}>Request Intro</Button></li>)}</ul>{!connectors.length && <p className="directory-meta">No availability supplied.</p>}</section>
          <section><h2>Current objectives</h2><ul>{members.filter(m=>m.currentObjectives.length>0).map(m=><li key={m.id}><Button variant="ghost" size="sm" onClick={()=>onNavigate('profile',m.id)}>{m.name}</Button><p className="directory-meta">{m.currentObjectives.join(' · ')}</p></li>)}</ul></section>
          <section><h2>Your connections</h2><p className="directory-meta">{members.filter(m=>connectedMemberIds.has(m.id)).length} connected people in this directory</p><Button variant="outline" size="sm" onClick={()=>onNavigate('intros')}>View intro requests</Button></section>
        </div> : !filteredMembers.length ? <div className="directory-context"><h2>No matching members</h2><p className="directory-meta">{members.length?'Try fewer filters or a different search.':'No members available in this directory.'}</p>{members.length>0 && <Button variant="outline" size="sm" onClick={clearFilters}>Reset filters</Button>}</div> : viewMode==='bubbles' ? <div className="directory-bubbles"><FloatingConnectionField members={filteredMembers} onSelectMember={id=>onNavigate('profile',id)} onRequestIntro={onRequestIntro} density="interactive" speedMultiplier={0.16} className="w-full h-full"/></div> : <div className={viewMode==='grid'?'directory-grid':'directory-list'}>
          {filteredMembers.map(member=><article key={member.id} className="directory-person" aria-label={member.name}>
            <div className="directory-person-top">
              <ExecutivePortrait name={member.name} avatarUrl={member.avatarUrl} size="sm"/>
              <div><h2><Button variant="ghost" className="directory-person-name" onClick={()=>onNavigate('profile',member.id)}>{member.name}</Button></h2>
                <p>{[member.title,member.company].filter(Boolean).join(' · ')}</p><p>{member.location}</p>
                {member.tier && <span className="directory-tier">{member.tier}</span>}
              </div>
            </div>
            {viewMode==='grid' && member.bioStatement && <p className="directory-bio">{member.bioStatement}</p>}
            <details><summary>Context &amp; focus</summary><p>{member.focusAreas.join(' · ') || 'No focus areas supplied.'}</p>{member.currentObjectives.length>0 && <p>{member.currentObjectives.join(' · ')}</p>}<p>{member.mutualConnectionsCount} mutual connections{member.matchScore>0?` · ${member.matchScore}% fit`:''}</p><Button variant="ghost" size="sm" onClick={()=>onNavigate('profile',member.id)}>View profile</Button></details>
            <div className="directory-actions"><Button variant="outline" size="sm" onClick={()=>onRequestIntro(member)}>Request Intro</Button><Button variant="outline" size="sm" aria-pressed={connectedMemberIds.has(member.id)} onClick={()=>onToggleConnect(member.id)}>{connectedMemberIds.has(member.id)?'Connected':'Connect'}</Button></div>
          </article>)}
        </div>}
      </div>
    </div>
  </section>;
};
