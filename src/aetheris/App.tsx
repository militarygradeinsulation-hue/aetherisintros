import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowRight, BarChart3, BrainCircuit, CalendarDays, CheckCircle2, ChevronRight,
  CircleDollarSign, Clock3, Command, ContactRound, Eye, Fingerprint, GitBranch, Handshake,
  Link2, Mail, Menu, MessageSquareText, Network, Radar, Search, Settings, ShieldCheck,
  Sparkles, Target, UserRoundSearch, UsersRound, X, Zap, AlertTriangle, TrendingUp,
  Route, ScanSearch, Send, UserPlus, SlidersHorizontal, CircleDot, LockKeyhole
} from 'lucide-react'
import { defaultDigitalYou, leaks as seedLeaks, meetings as seedMeetings, objectives as seedObjectives, people as seedPeople } from './data'
import type { AutonomyLevel, DigitalYouProfile, Meeting, Objective, Person, RadarState } from './types'
import { classifyConnection, composeWarmIntro, radarLabel, scoreTone } from './lib/engine'

type Page = 'command' | 'intros' | 'network' | 'forensics' | 'meetings' | 'digital-you' | 'roi' | 'settings'

type Integration = { id: string; name: string; detail: string; connected: boolean; icon: 'mail' | 'calendar' | 'crm' | 'network' }

const nav: Array<{ id: Page; label: string; icon: typeof Command }> = [
  { id: 'command', label: 'Command Center', icon: Command },
  { id: 'intros', label: 'Intros', icon: Handshake },
  { id: 'network', label: 'Relationship Map', icon: Network },
  { id: 'forensics', label: 'Forensics', icon: ScanSearch },
  { id: 'meetings', label: 'Meetings', icon: CalendarDays },
  { id: 'digital-you', label: 'Digital You', icon: Fingerprint },
  { id: 'roi', label: 'Relationship ROI', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const labelForPage: Record<Page, string> = {
  command: 'Command Center', intros: 'Intros', network: 'Relationship Map', forensics: 'Relationship Forensics',
  meetings: 'Meeting Intelligence', 'digital-you': 'Digital You · Connector Mode', roi: 'Relationship ROI', settings: 'Settings'
}

function money(n?: number) {
  if (!n) return '$0'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function MiniLogo() {
  return <div className="mini-logo"><Eye size={20} strokeWidth={2.2}/></div>
}

function ScoreRing({ score, size = 66 }: { score: number; size?: number }) {
  const r = 25
  const c = 2 * Math.PI * r
  const o = c - (score / 100) * c
  return (
    <div className={`score-ring ${scoreTone(score)}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="30" cy="30" r={r} className="ring-bg" />
        <circle cx="30" cy="30" r={r} className="ring-meter" strokeDasharray={c} strokeDashoffset={o} />
      </svg>
      <strong>{score}</strong>
    </div>
  )
}

function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'orange' | 'gold' | 'danger' | 'success' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

function StatCard({ icon: Icon, value, label, detail }: { icon: typeof Activity; value: string; label: string; detail: string }) {
  return <div className="stat-card panel">
    <div className="stat-icon"><Icon size={18}/></div>
    <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div><div className="stat-detail">{detail}</div></div>
  </div>
}

function RadarViz({ people, onSelect }: { people: Person[]; onSelect: (p: Person) => void }) {
  const positions = [
    [51,18],[72,30],[78,55],[63,75],[39,78],[21,60],[26,34],[53,47],[41,34],[67,48],[34,56],[56,66]
  ]
  return <div className="radar-viz">
    <div className="radar-axis radar-axis-x"/><div className="radar-axis radar-axis-y"/>
    <div className="radar-circle rc1"/><div className="radar-circle rc2"/><div className="radar-circle rc3"/>
    <div className="radar-sweep"/>
    <div className="you-node"><MiniLogo/><span>YOU</span></div>
    {people.map((p, i) => {
      const [x,y] = positions[i % positions.length]
      return <button key={p.id} className={`person-node state-${p.radar}`} style={{ left: `${x}%`, top: `${y}%` }} onClick={() => onSelect(p)} aria-label={`Open ${p.name}`}>
        <span className="node-dot"/><span className="node-label">{p.name.split(' ')[0]}</span>
      </button>
    })}
    <div className="radar-key"><span><i className="key-hot"/> Hot now</span><span><i className="key-gold"/> Strong</span><span><i className="key-gray"/> Dormant</span></div>
  </div>
}

function PersonDrawer({ person, onClose, onDraft }: { person: Person | null; onClose: () => void; onDraft: (p: Person) => void }) {
  if (!person) return null
  const scores = [
    ['Strategic fit', person.score.strategicFit], ['Mutual value', person.score.mutualValue], ['Timing', person.score.timing],
    ['Trust', person.score.trust], ['Relationship', person.score.relationshipStrength], ['Influence', person.score.decisionInfluence],
    ['Opportunity', person.score.opportunityValue], ['Low friction', 100 - person.score.friction]
  ]
  return <div className="drawer-wrap" onMouseDown={onClose}>
    <aside className="drawer" onMouseDown={(e) => e.stopPropagation()}>
      <div className="drawer-head">
        <div className="person-avatar large">{person.initials}</div>
        <div className="grow"><div className="eyebrow">RELATIONSHIP INTELLIGENCE</div><h2>{person.name}</h2><p>{person.title} · {person.company}</p></div>
        <button className="icon-btn" onClick={onClose}><X size={18}/></button>
      </div>
      <div className="drawer-score"><ScoreRing score={person.scoreTotal} size={78}/><div><strong>{classifyConnection(person.scoreTotal)}</strong><p>{radarLabel[person.radar]} · {person.confidence}% confidence</p></div></div>
      <section className="drawer-section"><h4>WHY THIS PERSON MATTERS</h4><p>{person.whyThem}</p></section>
      <section className="drawer-section"><h4>WHY YOU MATTER TO THEM</h4><p>{person.whyYou}</p></section>
      <section className="drawer-section"><h4>WHY NOW</h4><p>{person.whyNow}</p></section>
      <section className="drawer-section"><div className="section-title"><h4>CONNECTION SIGNALS</h4><span>weighted</span></div>
        <div className="score-grid">{scores.map(([label, raw]) => { const v = Number(raw); return <div key={String(label)} className="signal-row"><span>{label}</span><div className="signal-track"><i style={{ width: `${v}%` }}/></div><b>{v}</b></div> })}</div>
      </section>
      <section className="drawer-section"><h4>BEST PATH</h4><div className="pathline">{person.bestPath.map((x,i) => <span key={x}><b>{x}</b>{i < person.bestPath.length - 1 && <ArrowRight size={14}/>}</span>)}</div></section>
      <section className="drawer-section"><h4>BEST NEXT ACTION</h4><p className="action-copy">{person.nextAction}</p><div className="warning"><AlertTriangle size={16}/><span><b>Do not:</b> {person.dontDo}</span></div></section>
      {(person.opportunityLow || person.opportunityHigh) && <section className="drawer-section"><h4>MODELED ACCESSIBLE VALUE</h4><div className="value-range">{money(person.opportunityLow)} <span>to</span> {money(person.opportunityHigh)}</div><p className="micro">Modeled range, not booked revenue.</p></section>}
      <div className="drawer-actions"><button className="btn secondary" onClick={onClose}>Close</button><button className="btn primary" onClick={() => onDraft(person)}><MessageSquareText size={16}/> Draft approach</button></div>
    </aside>
  </div>
}

function IntroModal({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const [text, setText] = useState('')
  useEffect(() => { if (person) setText(composeWarmIntro(person)) }, [person])
  if (!person) return null
  return <div className="modal-wrap" onMouseDown={onClose}><div className="modal panel" onMouseDown={e=>e.stopPropagation()}>
    <div className="modal-head"><div><div className="eyebrow">DIGITAL YOU · DRAFT</div><h2>Approach {person.name}</h2></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>
    <div className="context-strip"><Sparkles size={16}/><span>Drafted from relationship context, not a generic outreach template.</span></div>
    <textarea value={text} onChange={e=>setText(e.target.value)} rows={12}/>
    <div className="modal-actions"><button className="btn secondary" onClick={()=>setText(composeWarmIntro(person))}>Regenerate from context</button><button className="btn primary" onClick={()=>{navigator.clipboard?.writeText(text); onClose()}}><Send size={16}/> Copy draft</button></div>
  </div></div>
}

function CommandPage({ people, select, setPage }: { people: Person[]; select: (p: Person)=>void; setPage:(p:Page)=>void }) {
  const hot = people.filter(p=>p.radar==='hot_now').length
  const dormant = people.filter(p=>p.radar==='dormant'||p.radar==='at_risk').length
  return <>
    <div className="hero-row">
      <div><div className="eyebrow">RELATIONSHIP INTELLIGENCE · LIVE</div><h1>Good morning.</h1><p className="lead">You do not need more contacts. You need to know which relationships can change the outcome.</p></div>
      <button className="btn primary" onClick={()=>setPage('forensics')}><ScanSearch size={16}/> Scan my network</button>
    </div>
    <div className="stats-grid">
      <StatCard icon={Zap} value={String(hot)} label="Hot now" detail="High-fit relationships with timing"/>
      <StatCard icon={Route} value="3" label="Warm paths" detail="Credible introduction routes"/>
      <StatCard icon={Clock3} value={String(dormant)} label="Need attention" detail="Dormant or at-risk relationships"/>
      <StatCard icon={CircleDollarSign} value="$1.39M" label="Modeled accessible value" detail="Across current relationship signals"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel radar-panel"><div className="section-head"><div><div className="eyebrow">RELATIONSHIP RADAR</div><h3>Who matters right now</h3></div><button className="text-btn" onClick={()=>setPage('network')}>Open map <ChevronRight size={15}/></button></div><RadarViz people={people} onSelect={select}/></section>
      <section className="panel moves-panel"><div className="section-head"><div><div className="eyebrow">TODAY'S MOVES</div><h3>What should happen next</h3></div></div>
        <div className="move-list">{people.slice().sort((a,b)=>b.scoreTotal-a.scoreTotal).slice(0,4).map((p,i)=><button className="move-row" key={p.id} onClick={()=>select(p)}><span className="move-index">0{i+1}</span><span className="move-main"><strong>{p.name}</strong><small>{p.nextAction}</small></span><span className="move-score">{p.scoreTotal}</span><ChevronRight size={16}/></button>)}</div>
      </section>
    </div>
    <div className="lower-grid">
      <section className="panel"><div className="section-head"><div><div className="eyebrow">OBJECTIVE</div><h3>Founder & PE introductions</h3></div><Pill tone="orange">CRITICAL</Pill></div>
        <p className="panel-copy">Open five serious conversations with operators who can expose Aetheris to multiple companies.</p>
        <div className="objective-flow"><span>DIAGNOSE</span><i/><span>MAP</span><i/><span>SCORE</span><i/><span>CONNECT</span><i/><span>COMPOUND</span></div>
      </section>
      <section className="panel"><div className="section-head"><div><div className="eyebrow">NEXUS IQ</div><h3>Ask the graph, not the internet</h3></div><BrainCircuit size={20}/></div>
        <div className="iq-prompt"><Search size={16}/><span>Who should I talk to this week?</span><kbd>↵</kbd></div>
        <div className="quick-asks"><button>Who can get me into PE?</button><button>Which relationships are going cold?</button></div>
      </section>
    </div>
  </>
}

function IntrosPage({ people, select, draft }: { people:Person[]; select:(p:Person)=>void; draft:(p:Person)=>void }) {
  const [q,setQ]=useState('')
  const filtered = people.filter(p => `${p.name} ${p.company} ${p.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
  return <>
    <div className="page-title"><div><div className="eyebrow">MATCH THE PERSON, NOT THE PROFILE</div><h1>Intros</h1><p>Every recommendation must answer: why them, why you, why now.</p></div><button className="btn primary"><Target size={16}/> New objective</button></div>
    <div className="toolbar panel"><div className="searchbox"><Search size={16}/><input placeholder="Search relationships, companies or context" value={q} onChange={e=>setQ(e.target.value)}/></div><button className="filter-btn"><SlidersHorizontal size={16}/> Filters</button></div>
    <div className="people-table panel">
      <div className="table-head"><span>Relationship</span><span>Why now</span><span>State</span><span>Score</span><span></span></div>
      {filtered.map(p=><div className="table-row" key={p.id}>
        <button className="person-cell" onClick={()=>select(p)}><span className="person-avatar">{p.initials}</span><span><strong>{p.name}</strong><small>{p.title} · {p.company}</small></span></button>
        <button className="why-cell" onClick={()=>select(p)}>{p.whyNow}</button><span><Pill tone={p.radar==='hot_now'?'orange':p.radar==='at_risk'?'danger':p.radar==='dormant'?'neutral':'gold'}>{radarLabel[p.radar]}</Pill></span>
        <button className="score-cell" onClick={()=>select(p)}><ScoreRing score={p.scoreTotal} size={52}/></button>
        <button className="btn compact secondary" onClick={()=>draft(p)}>Draft approach</button>
      </div>)}
    </div>
  </>
}

function NetworkPage({ people, select }: { people:Person[]; select:(p:Person)=>void }) {
  const [focus,setFocus]=useState('All strategic relationships')
  return <>
    <div className="page-title"><div><div className="eyebrow">LIVING RELATIONSHIP GRAPH</div><h1>Relationship Map</h1><p>Distance means relevance to the objective. Node size means strategic weight, not status.</p></div><div className="segmented"><button className="active">Graph</button><button>Paths</button></div></div>
    <div className="map-layout">
      <section className="panel map-stage"><div className="map-top"><div className="objective-chip"><Target size={14}/>{focus}</div><button className="text-btn" onClick={()=>setFocus(focus==='All strategic relationships'?'Founder & PE introductions':'All strategic relationships')}>Change objective</button></div><RadarViz people={people} onSelect={select}/></section>
      <aside className="panel path-panel"><div className="eyebrow">STRONGEST PATH</div><h3>Gary → Maya</h3><p>Shortest is not always strongest. This path combines recent activity, trust and target relevance.</p>
        <div className="vertical-path"><div className="path-person"><span>YOU</span><small>origin</small></div><i/><div className="path-person gold"><span>Gary Frey</span><small>connector · trust 83</small></div><i/><div className="path-person orange"><span>Maya Chen</span><small>target · fit 93</small></div></div>
        <div className="path-metrics"><div><span>Path strength</span><b>86</b></div><div><span>Intro likelihood</span><b>78%</b></div><div><span>Degrees</span><b>2</b></div></div>
        <button className="btn primary full" onClick={()=>select(people.find(p=>p.id==='p2')!)}>Inspect path</button></aside>
    </div>
  </>
}

function ForensicsPage({ people, select }: { people:Person[]; select:(p:Person)=>void }) {
  const [scanned,setScanned]=useState(false)
  return <>
    <div className="page-title"><div><div className="eyebrow">RELATIONSHIP LEAK FORENSICS</div><h1>Your network already contains opportunities.</h1><p>Find value that exists inside old conversations, dormant relationships and unfinished promises.</p></div><button className="btn primary" onClick={()=>setScanned(true)}><ScanSearch size={16}/>{scanned?'Scan complete':'Run forensic scan'}</button></div>
    <div className="forensic-summary panel"><div><span>Relationship leaks</span><strong>23</strong></div><div><span>High-priority</span><strong>6</strong></div><div><span>Warm paths available</span><strong>3</strong></div><div><span>Modeled value</span><strong>$840K–$1.4M</strong></div><p>Modeled opportunity range based on current demo signals. It is not booked revenue.</p></div>
    <div className="leak-grid">{seedLeaks.map(leak=>{const p=people.find(x=>x.id===leak.personId)!; return <article className="panel leak-card" key={leak.id}><div className="leak-top"><Pill tone={leak.urgency==='high'?'danger':'gold'}>{leak.type}</Pill><span>{leak.confidence}% confidence</span></div><div className="leak-person"><span className="person-avatar">{p.initials}</span><div><h3>{p.name}</h3><p>{p.title} · {p.company}</p></div></div><p className="leak-reason">{leak.businessReason}</p><div className="evidence"><Eye size={15}/><span>{leak.evidence}</span></div>{leak.estimatedValue&&<div className="modeled-value">{leak.estimatedValue}</div>}<div className="leak-action"><span>RECOMMENDED</span><p>{leak.recommendedAction}</p></div><button className="btn secondary full" onClick={()=>select(p)}>Open intelligence</button></article>})}</div>
  </>
}

function MeetingCard({ meeting, person }: { meeting: Meeting; person:Person }) {
  const [open,setOpen]=useState(false)
  return <article className="panel meeting-card"><div className="meeting-header"><div><div className="eyebrow">{meeting.date}</div><h3>{person.name}</h3><p>{person.title} · {person.company}</p></div><div className="person-avatar large">{person.initials}</div></div><div className="meeting-reason"><span>WHY THIS MEETING EXISTS</span><p>{meeting.reason}</p></div><div className="meeting-grid"><div><span>BEST OPENING</span><p>{meeting.opening}</p></div><div><span>DESIRED OUTCOME</span><p>{meeting.desiredOutcome}</p></div></div><button className="text-btn" onClick={()=>setOpen(!open)}>{open?'Hide full brief':'Open full brief'} <ChevronRight size={15}/></button>{open&&<div className="expanded-brief"><div><h4>WHAT THEY CARE ABOUT</h4><ul>{meeting.caresAbout.map(x=><li key={x}>{x}</li>)}</ul></div><div><h4>RECENT SIGNALS</h4><ul>{meeting.recentSignals.map(x=><li key={x}>{x}</li>)}</ul></div><div><h4>QUESTIONS WORTH ASKING</h4><ol>{meeting.questions.map(x=><li key={x}>{x}</li>)}</ol></div><div className="warning"><AlertTriangle size={16}/><span><b>Do not:</b> {meeting.avoid}</span></div></div>}</article>
}

function MeetingsPage({ people }: { people:Person[] }) {
  return <><div className="page-title"><div><div className="eyebrow">CONTEXT BEFORE THE CALL</div><h1>Meeting Intelligence</h1><p>Do not summarize the person. Surface only what matters for this conversation.</p></div><button className="btn secondary"><CalendarDays size={16}/> Calendar</button></div><div className="meeting-list">{seedMeetings.map(m=><MeetingCard key={m.id} meeting={m} person={people.find(p=>p.id===m.personId)!}/>)}</div></>
}

function Slider({ label, value, onChange, low, high }: { label:string; value:number; onChange:(n:number)=>void; low:string; high:string }) {
  return <div className="slider-row"><div className="slider-title"><span>{label}</span><b>{value}</b></div><input type="range" min="0" max="100" value={value} onChange={e=>onChange(Number(e.target.value))}/><div className="slider-labels"><span>{low}</span><span>{high}</span></div></div>
}

function DigitalYouPage({ profile, setProfile }: { profile:DigitalYouProfile; setProfile:(x:DigitalYouProfile)=>void }) {
  const update=(k:keyof DigitalYouProfile,n:number)=>setProfile({...profile,[k]:n})
  return <><div className="page-title"><div><div className="eyebrow">DIGITAL YOU · CONNECTOR MODE</div><h1>Teach Intros how you handle people.</h1><p>Learn judgment and communication patterns without mechanically copying old messages.</p></div><Pill tone="success">ACTIVE</Pill></div><div className="dy-grid"><section className="panel"><div className="section-head"><div><div className="eyebrow">BEHAVIOR PROFILE</div><h3>Relationship style</h3></div><Fingerprint size={22}/></div><Slider label="Directness" value={profile.directness} onChange={n=>update('directness',n)} low="Soft" high="Direct"/><Slider label="Formality" value={profile.formality} onChange={n=>update('formality',n)} low="Casual" high="Formal"/><Slider label="Humor" value={profile.humor} onChange={n=>update('humor',n)} low="Straight" high="Playful"/><Slider label="Brevity" value={profile.brevity} onChange={n=>update('brevity',n)} low="Detailed" high="Tight"/><Slider label="Warmth" value={profile.warmth} onChange={n=>update('warmth',n)} low="Reserved" high="Warm"/><Slider label="Selling aggression" value={profile.sellingAggressiveness} onChange={n=>update('sellingAggressiveness',n)} low="Never push" high="Direct close"/></section><section className="panel"><div className="section-head"><div><div className="eyebrow">LANGUAGE GUARDRAILS</div><h3>Never sound like generic AI</h3></div><ShieldCheck size={22}/></div><div className="phrase-list">{profile.prohibitedPhrases.map(x=><span key={x}>{x}<X size={13}/></span>)}</div><div className="example-note"><span>INTROS SHOULD ASK</span><strong>Would you actually send this?</strong><p>When timing is wrong, the system should recommend waiting instead of generating outreach.</p></div><div className="autonomy-note"><LockKeyhole size={18}/><div><strong>Execution is permissioned</strong><p>Digital You drafts and recommends. Sending can remain approval-only.</p></div></div></section></div></>
}

function ROIPage() {
  const stages=[['Introductions',46,100],['Accepted',33,72],['Meetings',24,52],['Opportunities',11,24],['Closed',4,9]]
  return <><div className="page-title"><div><div className="eyebrow">RELATIONSHIP RETURN, NOT VANITY</div><h1>Relationship ROI</h1><p>Track what relationships actually create: meetings, opportunity, revenue, partnerships and referrals.</p></div><Pill tone="orange">LAST 90 DAYS</Pill></div><div className="stats-grid"><StatCard icon={Handshake} value="46" label="Introductions" detail="33 accepted"/><StatCard icon={CalendarDays} value="24" label="Meetings" detail="52% of intros"/><StatCard icon={TrendingUp} value="$486K" label="Revenue influenced" detail="$142K directly attributed"/><StatCard icon={UserPlus} value="9" label="Reactivations" detail="Dormant relationships revived"/></div><div className="roi-grid"><section className="panel"><div className="section-head"><div><div className="eyebrow">RELATIONSHIP FUNNEL</div><h3>Value through the graph</h3></div></div><div className="funnel">{stages.map(([label,value,width])=><div className="funnel-row" key={String(label)}><span>{label}</span><div><i style={{width:`${width}%`}}/></div><b>{value}</b></div>)}</div></section><section className="panel"><div className="eyebrow">ATTRIBUTION RULE</div><h3>Evidence before credit.</h3><p className="panel-copy">Intros separates direct value, influenced value and modeled value. Every attributed outcome keeps an evidence trail and confidence score.</p><div className="attribution-list"><div><CircleDot size={16}/><span><b>$142K</b> direct value</span></div><div><CircleDot size={16}/><span><b>$344K</b> influenced value</span></div><div><CircleDot size={16}/><span><b>$840K–$1.4M</b> modeled accessible value</span></div></div></section></div></>
}

function SettingsPage({ autonomy, setAutonomy }: { autonomy:AutonomyLevel; setAutonomy:(x:AutonomyLevel)=>void }) {
  const [integrations,setIntegrations]=useState<Integration[]>([
    {id:'gmail',name:'Gmail',detail:'Conversation context and thread continuity',connected:true,icon:'mail'},
    {id:'calendar',name:'Google Calendar',detail:'Availability and meeting context',connected:true,icon:'calendar'},
    {id:'hubspot',name:'HubSpot',detail:'Companies, deals and outcome attribution',connected:false,icon:'crm'},
    {id:'linkedin',name:'LinkedIn',detail:'Relationship identity and public role context',connected:false,icon:'network'},
  ])
  const icon=(x:Integration['icon'])=>x==='mail'?<Mail size={19}/>:x==='calendar'?<CalendarDays size={19}/>:x==='crm'?<ContactRound size={19}/>:<Network size={19}/>
  return <><div className="page-title"><div><div className="eyebrow">CONTROL THE SYSTEM</div><h1>Settings</h1><p>Privacy, connected sources and autonomy stay explicit.</p></div></div><div className="settings-grid"><section className="panel"><div className="section-head"><div><div className="eyebrow">DATA SOURCES</div><h3>Connections</h3></div></div><div className="integration-list">{integrations.map(i=><div className="integration" key={i.id}><span className="integration-icon">{icon(i.icon)}</span><div className="grow"><strong>{i.name}</strong><small>{i.detail}</small></div><button className={`toggle ${i.connected?'on':''}`} onClick={()=>setIntegrations(integrations.map(x=>x.id===i.id?{...x,connected:!x.connected}:x))}><i/></button></div>)}</div><p className="micro top-gap">Demo toggles only. Production connectors require provider OAuth credentials and scoped permissions.</p></section><section className="panel"><div className="section-head"><div><div className="eyebrow">AUTONOMY</div><h3>How far can Intros go?</h3></div><b className="autonomy-badge">LEVEL {autonomy}</b></div><div className="autonomy-levels">{[['Observe','Read and analyze only'],['Recommend','Suggest next actions'],['Draft','Create messages and intros'],['Approve','Ask before any external action'],['Authorized','Execute approved action classes']].map(([name,desc],i)=><button key={name} className={autonomy===i?'active':''} onClick={()=>setAutonomy(i as AutonomyLevel)}><span>{i}</span><div><strong>{name}</strong><small>{desc}</small></div>{autonomy===i&&<CheckCircle2 size={17}/>}</button>)}</div></section><section className="panel privacy-card"><ShieldCheck size={24}/><div><div className="eyebrow">PRIVATE BY DEFAULT</div><h3>Context can inform relevance without becoming shareable content.</h3><p>Every memory is scoped Private, Team, Organization, Shareable or Public. Intros should never reveal a private message to another person just because it influenced a match.</p></div></section></div></>
}

function App() {
  const [page,setPage]=useState<Page>(() => (localStorage.getItem('aetheris-intros-page') as Page) || 'command')
  const [people] = useState<Person[]>(seedPeople)
  const [selected,setSelected]=useState<Person|null>(null)
  const [draftPerson,setDraftPerson]=useState<Person|null>(null)
  const [menuOpen,setMenuOpen]=useState(false)
  const [profile,setProfileState]=useState<DigitalYouProfile>(()=>{ try{return JSON.parse(localStorage.getItem('aetheris-intros-dy')||'')||defaultDigitalYou}catch{return defaultDigitalYou} })
  const [autonomy,setAutonomyState]=useState<AutonomyLevel>(()=>Number(localStorage.getItem('aetheris-intros-autonomy')||'2') as AutonomyLevel)
  const [iqOpen,setIqOpen]=useState(false)
  const [iq,setIq]=useState('')
  const [iqAnswer,setIqAnswer]=useState('')

  useEffect(()=>localStorage.setItem('aetheris-intros-page',page),[page])
  const setProfile=(x:DigitalYouProfile)=>{setProfileState(x); localStorage.setItem('aetheris-intros-dy',JSON.stringify(x))}
  const setAutonomy=(x:AutonomyLevel)=>{setAutonomyState(x);localStorage.setItem('aetheris-intros-autonomy',String(x))}

  const pageContent = useMemo(()=>{
    switch(page){
      case 'command': return <CommandPage people={people} select={setSelected} setPage={setPage}/>
      case 'intros': return <IntrosPage people={people} select={setSelected} draft={setDraftPerson}/>
      case 'network': return <NetworkPage people={people} select={setSelected}/>
      case 'forensics': return <ForensicsPage people={people} select={setSelected}/>
      case 'meetings': return <MeetingsPage people={people}/>
      case 'digital-you': return <DigitalYouPage profile={profile} setProfile={setProfile}/>
      case 'roi': return <ROIPage/>
      case 'settings': return <SettingsPage autonomy={autonomy} setAutonomy={setAutonomy}/>
    }
  },[page,people,profile,autonomy])

  const runIq=()=>{
    const q=iq.toLowerCase()
    let ans='Scott Kelley is the strongest immediate relationship. Fit is high, timing is active, and you already have direct trust. The next move is a narrow forensic conversation, not a product pitch.'
    if(q.includes('cold')||q.includes('dormant')) ans='Alison Kaiser and Prateek Sanjay deserve attention. Alison is the better business move because her role expanded, creating a new reason to reconnect. Prateek is a relationship-preservation move, not an urgent sales move.'
    if(q.includes('pe')||q.includes('invest')) ans='Gary Frey is the strongest connector path into PE-adjacent operators. Maya Chen is the highest-value current target, but the recommended move is to validate Gary’s interest before asking for the introduction.'
    setIqAnswer(ans)
  }

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen?'mobile-open':''}`}>
      <div className="brand"><MiniLogo/><div><strong>AETHERIS</strong><span>INTROS</span></div></div>
      <nav>{nav.map(item=>{const Icon=item.icon;return <button key={item.id} className={page===item.id?'active':''} onClick={()=>{setPage(item.id);setMenuOpen(false)}}><Icon size={18}/><span>{item.label}</span>{page===item.id&&<i/>}</button>})}</nav>
      <div className="sidebar-bottom"><div className="system-status"><span className="live-dot"/><div><strong>Relationship graph</strong><small>Demo intelligence live</small></div></div><div className="profile-mini"><div className="person-avatar">JT</div><div><strong>Joseph</strong><small>Autonomy · L{autonomy}</small></div></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={()=>setMenuOpen(!menuOpen)}><Menu size={20}/></button><div className="crumb"><span>Aetheris Intros</span><ChevronRight size={14}/><strong>{labelForPage[page]}</strong></div><div className="top-actions"><button className="icon-btn" onClick={()=>setIqOpen(true)} title="Nexus IQ"><BrainCircuit size={19}/></button><button className="status-chip"><span className="live-dot"/> INTELLIGENCE ACTIVE</button></div></header>
      <main className="content">{pageContent}</main>
    </div>
    <PersonDrawer person={selected} onClose={()=>setSelected(null)} onDraft={(p)=>{setSelected(null);setDraftPerson(p)}}/>
    <IntroModal person={draftPerson} onClose={()=>setDraftPerson(null)}/>
    {iqOpen&&<div className="modal-wrap" onMouseDown={()=>setIqOpen(false)}><div className="modal iq-modal panel" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">NEXUS IQ</div><h2>Ask the relationship graph.</h2></div><button className="icon-btn" onClick={()=>setIqOpen(false)}><X size={18}/></button></div><div className="iq-input"><Search size={18}/><input autoFocus value={iq} onChange={e=>setIq(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runIq()} placeholder="Who should I talk to this week?"/><button className="btn primary compact" onClick={runIq}>Ask</button></div>{iqAnswer&&<div className="iq-answer"><div className="eyebrow">INTROS READ</div><p>{iqAnswer}</p></div>}<div className="quick-asks"><button onClick={()=>{setIq('Which relationships are going cold?');setIqAnswer('Alison Kaiser and Prateek Sanjay deserve attention. Alison is the stronger business move because her role expanded, creating a new reason to reconnect.')}}>Which relationships are going cold?</button><button onClick={()=>{setIq('Who can get me into PE?');setIqAnswer('Gary Frey is the strongest connector path. Maya Chen is the highest-value current target, but validate Gary’s interest before asking for the introduction.')}}>Who can get me into PE?</button></div></div></div>}
  </div>
}

export default App
