import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Activity, ArrowRight, Bell, Bookmark, BriefcaseBusiness, CalendarDays, Check, ChevronRight, Compass, Heart, Home, Menu, MessageCircle, MessagesSquare, MoreHorizontal, Play, Plus, Search, Send, Share2, Sparkles, TrendingUp, Users, Video, WandSparkles, X, type LucideIcon } from 'lucide-react'
import './vision.css'

export const Route = createFileRoute('/vision')({
  head: () => ({ meta: [{ title: 'Aetheris Intros | Connected Social Experience' }, { name: 'description', content: 'A premium, connected social and professional relationship experience.' }] }),
  component: Vision,
})

type NavItem = { label: string; icon: LucideIcon }
const navigation: NavItem[] = [
  { label: 'Home', icon: Home }, { label: 'Discover', icon: Compass },
  { label: 'Network', icon: Users }, { label: 'Introductions', icon: Share2 },
  { label: 'CRM', icon: BriefcaseBusiness }, { label: 'Opportunities', icon: TrendingUp },
  { label: 'Calendar', icon: CalendarDays }, { label: 'Messages', icon: MessagesSquare },
  { label: 'Communities', icon: Users }, { label: 'Media', icon: Video },
  { label: 'AI Assistant', icon: Sparkles }, { label: 'Analytics', icon: Activity },
]
const people = [
  { name: 'Sarah Mitchell', role: 'CEO · Summit Capital', initials: 'SM', shade: 'peach' },
  { name: 'David Kim', role: 'Partner · Apex Ventures', initials: 'DK', shade: 'blue' },
  { name: 'Elena Ruiz', role: 'Founder · TerraCore', initials: 'ER', shade: 'violet' },
  { name: 'Marcus Chen', role: 'Partner · Aero Capital', initials: 'MC', shade: 'green' },
]
const trends = ['The Future of AI in Business', 'Climate Tech Opportunities', 'The Modern CEO Playbook', 'Global Expansion Strategies', 'Building High-Trust Teams']
const opportunities = [
  { name: 'Solaris Group Series B', value: '$5,000,000', status: 'Qualified' },
  { name: 'NovaHealth Expansion', value: '$12,000,000', status: 'Proposal' },
  { name: 'TerraCore Strategic', value: '$3,200,000', status: 'Discovery' },
  { name: 'Apex AI Partnership', value: '$8,500,000', status: 'Negotiation' },
]
type Post = { id: number; author: string; role: string; text: string; likes: number; comments: number; shade: string }
const initialPosts: Post[] = [
  { id: 1, author: 'Maya Chen', role: 'CEO · Veridian Capital · 3h', text: 'Excited to share our new fund focused on climate tech innovators. Looking to connect with exceptional founders.', likes: 342, comments: 64, shade: 'violet' },
  { id: 2, author: 'Daniel Kim', role: 'Partner · Apex Ventures · 5h', text: 'Just met an incredible founder working on AI for healthcare. The next decade is going to be remarkable. 🚀', likes: 201, comments: 28, shade: 'blue' },
]
function Avatar({ initials, shade = 'orange', size = '' }: { initials: string; shade?: string; size?: string }) {
  return <span className={`av av-${shade} ${size}`} aria-label={initials}>{initials}</span>
}
function Surface({ title, action, children, className = '' }: { title: string; action?: string; children: React.ReactNode; className?: string }) {
  return <section className={`vs-surface ${className}`}><div className="vs-surface-heading"><h3>{title}</h3>{action && <span>{action} <ChevronRight size={13}/></span>}</div>{children}</section>
}
function Vision() {
  const [activeNav, setActiveNav] = useState('Home')
  const [tab, setTab] = useState('For You')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [posts, setPosts] = useState(initialPosts)
  const [liked, setLiked] = useState<number[]>([])
  const [saved, setSaved] = useState<number[]>([])
  const [connected, setConnected] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const search = query.trim().toLowerCase()
  const filteredPeople = useMemo(() => people.filter(p => (p.name + ' ' + p.role).toLowerCase().includes(search)), [search])
  const filteredPosts = useMemo(() => posts.filter(p => (p.author + ' ' + p.text).toLowerCase().includes(search)), [posts, search])
  const toggle = (list: number[], setter: (v: number[]) => void, id: number) => setter(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3500) }
  const submitPost = () => {
    if (!draft.trim()) return
    setPosts([{ id: Date.now(), author: 'Alex Carter', role: 'CEO · Horizon Partners · just now', text: draft.trim(), likes: 0, comments: 0, shade: 'orange' }, ...posts])
    setDraft('')
    setTab('For You')
    notify('Your post is now in your feed.')
  }
  const navClick = (name: string) => {
    setActiveNav(name); setMobileMenu(false)
    if (name === 'Discover' || name === 'Media') document.getElementById('vision-feed')?.scrollIntoView({ behavior: 'smooth' })
    else if (name === 'Network' || name === 'Introductions') document.getElementById('vision-network')?.scrollIntoView({ behavior: 'smooth' })
    else if (name === 'Opportunities' || name === 'CRM') document.getElementById('vision-opps')?.scrollIntoView({ behavior: 'smooth' })
    else if (name === 'Calendar') document.getElementById('vision-calendar')?.scrollIntoView({ behavior: 'smooth' })
    else if (name === 'AI Assistant') document.getElementById('vision-ai')?.scrollIntoView({ behavior: 'smooth' })
    else if (name === 'Home') window.scrollTo({top: 0, behavior: 'smooth'})
    else notify(`${name} selected — connect this view to your existing Ask Intros workspace.`)
  }
  const askAi = () => {
    if (!aiPrompt.trim()) return
    setAiResponse(`Try a warm introduction related to “${aiPrompt.trim()}”. Review your mutual connections and recent activity before reaching out.`)
    setAiPrompt('')
  }
  return <div className="vision-page">
    <header className="vs-topline"><a href="/" className="vs-brand"><span className="vs-symbol">A</span><span>AETHERIS <em>INTROS</em></span></a><div className="vs-top-motto">THE RELATIONSHIP NETWORK <span>FOR CEOS.</span></div><div className="vs-top-right">PEOPLE <b>·</b> RELATIONSHIPS <b>·</b> OPPORTUNITIES</div></header>
    <div className="vs-hero"><div className="vs-eyebrow">A MORE CONNECTED TOMORROW</div><h1>One Connected System <i>for CEOs.</i></h1><p>People. Relationships. Opportunities. Meetings. Intelligence. <strong>All connected.</strong></p></div>
    <div className="vs-shell">
      <aside className={`vs-sidebar ${mobileMenu ? 'is-open' : ''}`}>
        <div className="vs-sidebar-heading"><span className="vs-symbol">A</span><b>AETHERIS <span>INTROS</span></b><button onClick={() => setMobileMenu(false)} className="vs-close-nav" aria-label="Close menu"><X size={18}/></button></div>
        <nav aria-label="Platform navigation">{navigation.map(n => <button key={n.label} onClick={() => navClick(n.label)} className={activeNav === n.label ? 'selected' : ''}><n.icon size={17}/>{n.label}{n.label === 'Messages' && <small>3</small>}</button>)}</nav>
        <div className="vs-sidebar-bottom"><Sparkles size={21}/><strong>Your network is your greatest asset.</strong><span>Make every connection count.</span></div>
      </aside>
      <div className="vs-workspace">
        <div className="vs-toolbar"><button className="vs-mobile-toggle" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={21}/></button><div className="vs-search"><Search size={17}/><input aria-label="Search people and posts" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search people, companies, topics, or opportunities..." />{query && <button onClick={()=>setQuery('')} aria-label="Clear search"><X size={14}/></button>}</div><div className="vs-toolbar-actions"><button aria-label="Create post" onClick={()=>document.getElementById('vision-composer')?.focus()}><Plus size={18}/></button><button aria-label="Notifications" onClick={()=>setShowNotifications(!showNotifications)}><Bell size={18}/></button><Avatar initials="AC" shade="orange"/><span className="vs-profile-label"><b>Alex Carter</b><small>CEO · Horizon Partners</small></span></div>{showNotifications && <div className="vs-notification-popover"><strong>Notifications</strong><p>3 new connection requests</p><p>2 introductions ready for review</p></div>}</div>
        <section className="vs-welcome"><div><span className="vs-kicker">YOUR EXECUTIVE HOME</span><h2>Good evening, Alex.</h2><p>Your network. Your opportunities. A more connected tomorrow.</p></div><div id="vision-ai" className="vs-ai-hero"><Sparkles size={27}/><div><strong>AETHERIS AI</strong><small>Turn relationships into opportunities. Get intelligent insights and next best actions.</small><button onClick={()=>document.getElementById('vision-ai-input')?.focus()}>Ask anything <ArrowRight size={14}/></button></div></div><div className="vs-score"><b>92</b><span>Connection Score</span><div className="vs-progress"><i/></div><small>↗ 12% this month</small></div></section>
        <section className="vs-stat-grid" aria-label="Key platform metrics">{[
          [Users, '248', 'Strategic connections', '+24 this month'], [Share2, '12', 'New introductions', '3 pending'], [BriefcaseBusiness, '$12.4M', 'Active opportunities', '+3 this quarter'], [CalendarDays, '8', 'Upcoming meetings', 'Next: 9:00 AM'], [Sparkles, '23', 'AI signals', 'High-value matches'],
        ].map(([Icon, val, label, sub], i) => {const I = Icon as LucideIcon;return <div className="vs-stat" key={String(label)}><I size={22} className={i%2 ? 'orange-text' : 'blue-text'}/><div><b>{val as string}</b><span>{label as string}</span><small>{sub as string}</small></div></div>})}</section>
        <div className="vs-content-grid">
          <main id="vision-feed" className="vs-feed">
            <div className="vs-tabs">{['For You','Following','CEOs','Investors','Operators','Tech','Leadership'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div>
            <div className="vs-featured">
              <article className="vs-media-card"><div className="vs-art vs-art-mountain"><span className="vs-sun"/><span className="vs-ridge vs-ridge-back"/><span className="vs-ridge vs-ridge-front"/><span className="vs-play"><Play size={22} fill="currentColor"/></span><span className="vs-video-time">6:12</span></div><div className="vs-media-body"><strong>Lessons from Building in Emerging Markets</strong><p>How local partnerships create global opportunities.</p><div className="vs-byline"><Avatar initials="JP" shade="blue"/> James Park <small>· CEO · 2h ago</small></div><div className="vs-engagement"><button onClick={()=>notify('Liked this video')}><Heart size={16}/>1.2K</button><button onClick={()=>notify('Comments are available in the full platform')}><MessageCircle size={16}/>86</button><button onClick={()=>notify('Share link ready')}><Share2 size={16}/> Share</button><button onClick={()=>notify('Video saved')}><Bookmark size={16}/></button></div></div></article>
              <article className="vs-live-card"><div className="vs-live-art"><span className="vs-live-badge">LIVE · 1.4K</span><span className="vs-live-illustration">◉</span></div><strong>The Future of Work</strong><p>Live conversations with industry leaders on AI, talent, and global opportunity.</p><div className="vs-avatar-stack"><Avatar initials="AC"/><Avatar initials="MC" shade="green"/><Avatar initials="ER" shade="violet"/></div><button className="vs-primary" onClick={()=>notify('Live rooms open in the connected platform')}><Video size={15}/> Join Live</button></article>
            </div>
            <div className="vs-post-stream"><div className="vs-post-heading"><h3>From your network</h3><span>Conversations that matter <MoreHorizontal size={16}/></span></div>
              {filteredPosts.length ? filteredPosts.map(p=><article className="vs-post" key={p.id}><div className="vs-post-author"><Avatar initials={p.author.split(' ').map(x=>x[0]).join('')} shade={p.shade}/><div><strong>{p.author}</strong><small>{p.role}</small></div><button aria-label="More actions" onClick={()=>notify('Post options opened')}><MoreHorizontal size={17}/></button></div><p>{p.text}</p>{p.id===1 && <div className="vs-post-art"><span>Ideas that move the world forward.</span></div>}<div className="vs-engagement"><button className={liked.includes(p.id)?'engaged':''} onClick={()=>toggle(liked,setLiked,p.id)}><Heart size={16} fill={liked.includes(p.id)?'currentColor':'none'}/>{p.likes+(liked.includes(p.id)?1:0)}</button><button onClick={()=>notify('Thread is ready for discussion')}><MessageCircle size={16}/>{p.comments}</button><button onClick={()=>notify('Share link ready')}><Share2 size={16}/>Share</button><button className={saved.includes(p.id)?'engaged':''} onClick={()=>toggle(saved,setSaved,p.id)}><Bookmark size={16} fill={saved.includes(p.id)?'currentColor':'none'}/>Save</button></div></article>) : <p className="vs-empty">No posts match that search.</p>}</div>
          </main>
          <aside className="vs-activity"><Surface title="Create a post"><div className="vs-composer"><div><Avatar initials="AC"/><input id="vision-composer" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submitPost()}} placeholder="What's on your mind?" /></div><div className="vs-composer-actions"><span>Post · Video · Live · Poll</span><button onClick={submitPost} disabled={!draft.trim()}><Send size={15}/> Publish</button></div></div></Surface><Surface title="Trending now" action="Explore">{trends.map((t,i)=><button className="vs-trend" key={t} onClick={()=>{setQuery(t);notify('Searching current feed')}}><b>{i+1}</b><span>{t}<small>{['12.4K','8.1K','6.9K','5.6K','4.8K'][i]} posts</small></span></button>)}</Surface><Surface title="People to know" action="View all">{filteredPeople.length ? filteredPeople.slice(0,3).map(p=><div className="vs-person" key={p.name}><Avatar initials={p.initials} shade={p.shade}/><span><strong>{p.name}</strong><small>{p.role}</small></span><button className={connected.includes(p.name)?'is-connected':''} onClick={()=>setConnected(x=>x.includes(p.name)?x.filter(n=>n!==p.name):[...x,p.name])}>{connected.includes(p.name)?<Check size={14}/>:<Plus size={14}/>}</button></div>) : <p className="vs-empty">No people match.</p>}</Surface></aside>
        </div>
        <section className="vs-bottom-grid"><div id="vision-network"><Surface title="My network" action="See all"><div className="vs-mini-tabs">People <span>Companies</span> <span>Investors</span></div>{filteredPeople.map(p=><div className="vs-person" key={p.name}><Avatar initials={p.initials} shade={p.shade}/><span><strong>{p.name}</strong><small>{p.role}</small></span><button className={connected.includes(p.name)?'is-connected':''} onClick={()=>setConnected(x=>x.includes(p.name)?x.filter(n=>n!==p.name):[...x,p.name])}>{connected.includes(p.name)?<Check size={14}/>:<Plus size={14}/>}</button></div>)}</Surface></div><div id="vision-opps"><Surface title="Opportunities" action="See all"><div className="vs-mini-tabs">Pipeline <span>Discovery</span> <span>Qualified</span></div>{opportunities.map((o,i)=><button className="vs-opportunity" key={o.name} onClick={()=>notify(`${o.name}: ${o.status}`)}><span className={`vs-op-icon vs-op-${i}`}><BriefcaseBusiness size={17}/></span><span><strong>{o.name}</strong><small>{o.value} · {o.status}</small></span><ChevronRight size={15}/></button>)}</Surface></div><div id="vision-calendar"><Surface title="Calendar" action="Today">{[['9:00 AM','Leadership Call'],['11:00 AM','Intro: Sarah Mitchell'],['2:00 PM','Investor Meeting'],['4:00 PM','Team Sync']].map(([time,name])=><div className="vs-meeting" key={time}><span>{time}</span><strong>{name}</strong></div>)}<button className="vs-secondary" onClick={()=>navClick('Calendar')}>View calendar <ArrowRight size={14}/></button></Surface></div><div><Surface title="AI insights" action="See all">{[['3 high-value intro matches','Based on recent activity'],['2 new opportunities','Matching your interests'],['Upcoming meeting prep','Brief available'],['Rising conversation','Climate Tech +240%']].map(([title,sub])=><div className="vs-insight" key={title}><Sparkles size={15}/><span><strong>{title}</strong><small>{sub}</small></span></div>)}<div className="vs-ai-form"><input id="vision-ai-input" value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')askAi()}} placeholder="Ask Aetheris AI..." aria-label="Ask Aetheris AI"/><button onClick={askAi} aria-label="Submit AI prompt"><ArrowRight size={16}/></button></div>{aiResponse && <p className="vs-ai-response">{aiResponse}</p>}</Surface></div><div><Surface title="Media & content" action="See all"><div className="vs-mini-tabs">All <span>Videos</span> <span>Podcasts</span></div><div className="vs-gallery"><button className="vs-gallery-card vs-gallery-one" onClick={()=>notify('Opening CEO retreat gallery')}><span>CEO Retreat</span><small>48 photos</small></button><button className="vs-gallery-card vs-gallery-two" onClick={()=>notify('Opening fireside chat')}><span>Fireside Chat</span><small>12 videos</small></button></div></Surface></div></section>
      </div>
    </div>
    <footer className="vs-footer"><span>AETHERIS <i>INTROS</i></span><strong>Connections today. A brighter tomorrow.</strong><small>DESIGNED FOR A MORE CONNECTED WORLD</small></footer>
    {notice && <div className="vs-toast" role="status"><Check size={17}/>{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={14}/></button></div>}
    {mobileMenu && <button className="vs-backdrop" onClick={()=>setMobileMenu(false)} aria-label="Close navigation"/>}
    <nav className="vs-mobile-bottom" aria-label="Mobile navigation"><button onClick={()=>navClick('Home')}><Home size={20}/>Home</button><button onClick={()=>navClick('Discover')}><Compass size={20}/>Discover</button><button onClick={()=>document.getElementById('vision-composer')?.focus()} className="plus"><Plus size={24}/></button><button onClick={()=>navClick('Network')}><Users size={20}/>Network</button><button onClick={()=>setMobileMenu(true)}><Menu size={20}/>More</button></nav>
  </div>
}
