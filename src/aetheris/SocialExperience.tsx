import { useMemo, useState } from 'react'
import { ArrowRight, Bell, Bookmark, CalendarDays, Check, CircleDot, Handshake, Heart, Image, Lightbulb, MessageCircle, MessageSquareText, Paperclip, Plus, Search, Send, ShieldCheck, Target, Upload, Users, X } from 'lucide-react'

import { journalKindFor, uploadJournalMedia } from './live'
import { activeMission } from './opportunity-graph'
import { useCeo, openCeo } from './ceo-store'
import { useGraph } from './graph-store'
import { useNav } from './nav'
import { useOps } from './crm/store'
import { useNetwork } from './store'
import { useAetherisNews, newsAge } from './news'
import { VerifiedBadge } from './badge'
import { Btn, Face } from './ui'
import type { JournalAttachment, Member, NetworkAsk, Post } from './social'
import { ExecutiveHome } from './pages/ExecutiveHome'

type SignalLabel = 'INSIGHT' | 'LOOKING FOR' | 'OFFERING' | 'HIRING' | 'CAPITAL' | 'PARTNERSHIP' | 'OPPORTUNITY' | 'ACQUISITION'
const signalTypes: SignalLabel[] = ['INSIGHT', 'LOOKING FOR', 'OFFERING', 'HIRING', 'CAPITAL', 'PARTNERSHIP', 'OPPORTUNITY', 'ACQUISITION']
const postKind: Record<SignalLabel, Post['kind']> = {
  INSIGHT: 'Insight', 'LOOKING FOR': 'Strategic ask', OFFERING: 'Insight', HIRING: 'Hiring', CAPITAL: 'Raising capital',
  PARTNERSHIP: 'Partnership', OPPORTUNITY: 'Strategic ask', ACQUISITION: 'Strategic ask',
}

function SelfFace({ large = false }: { large?: boolean }) {
  const net = useNetwork()
  return <Face person={{ id: 'me', name: net.profile.name || 'You', initials: net.profile.initials || 'ME', avatarUrl: net.profile.avatarUrl }} large={large} portrait />
}

function SignalComposer({ open, setOpen }: { open: boolean; setOpen: (value: boolean) => void }) {
  const net = useNetwork()
  const [type, setType] = useState<SignalLabel>('INSIGHT')
  const [text, setText] = useState('')
  const [detail, setDetail] = useState('')
  const [privacy, setPrivacy] = useState<'network' | 'private'>('network')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const addFiles = (list: FileList | null) => {
    if (!list) return
    const valid = Array.from(list).filter(file => journalKindFor(file)).slice(0, Math.max(0, 6 - files.length))
    setFiles(current => [...current, ...valid])
  }
  const share = async () => {
    if (!text.trim()) return
    setBusy(true); setNote('')
    try {
      let media: JournalAttachment[] = []
      if (files.length) {
        const { data } = await import('@/integrations/supabase/client').then(module => module.supabase.auth.getUser())
        if (!data.user) throw new Error('Sign in again to attach files.')
        media = await Promise.all(files.map(file => uploadJournalMedia(data.user.id, file)))
      }
      net.addPost(text.trim(), detail.trim() || `${type[0]}${type.slice(1).toLowerCase()} Signal`, media, privacy, postKind[type])
      setText(''); setDetail(''); setFiles([]); setOpen(false); setNote('Signal shared.')
    } catch (error) { setNote(error instanceof Error ? error.message : 'The Signal could not be shared.') }
    finally { setBusy(false) }
  }
  return <section className={`social-composer ${open ? 'open' : ''}`}>
    <div className="social-composer-start"><SelfFace /><button onClick={() => setOpen(true)}>Share a Signal…</button></div>
    <div className="signal-type-row">{signalTypes.map(item => <button key={item} className={type === item ? 'active' : ''} onClick={() => { setType(item); setOpen(true) }}>{item}</button>)}</div>
    {open && <div className="social-composer-body">
      <input autoFocus value={text} onChange={event => setText(event.target.value)} placeholder="What should your network know?" />
      <textarea rows={4} value={detail} onChange={event => setDetail(event.target.value)} placeholder="Add the context, why now, and what a useful response looks like…" />
      {files.length > 0 && <ul className="signal-file-list">{files.map((file, index) => <li key={`${file.name}-${index}`}><Paperclip size={13} /><span>{file.name}</span><button aria-label={`Remove ${file.name}`} onClick={() => setFiles(current => current.filter((_, at) => at !== index))}><X size={13} /></button></li>)}</ul>}
      <footer><label className="signal-upload"><input type="file" multiple accept="image/*,video/mp4,video/webm,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv" onChange={event => { addFiles(event.target.files); event.target.value = '' }} /><Upload size={14} /> Media or document</label>
        <select value={privacy} onChange={event => setPrivacy(event.target.value as 'network' | 'private')} aria-label="Signal visibility"><option value="network">My network</option><option value="private">Private Signal</option></select>
        <Btn kind="quiet" onClick={() => setOpen(false)}>Cancel</Btn><Btn disabled={busy || !text.trim()} onClick={() => void share()}>{busy ? 'Sharing…' : 'Share Signal'}</Btn></footer>
    </div>}
    {note && <small className="signal-note">{note}</small>}
  </section>
}

function FeedPost({ post, member, lead = false }: { post: Post; member?: Member; lead?: boolean }) {
  const net = useNetwork(); const nav = useNav()
  const mine = post.memberId === 'me'; const liked = net.likedPosts.includes(post.id)
  const comments = net.postComments[post.id] ?? []; const [commenting, setCommenting] = useState(false); const [comment, setComment] = useState('')
  const author = member?.name ?? net.profile.name ?? 'You'
  const sendComment = () => { if (!comment.trim()) return; net.addPostComment(post.id, comment.trim(), post.memberId); setComment('') }
  return <article className={lead ? 'social-feed-card is-lead' : 'social-feed-card'}>
    <header>{member ? <button onClick={() => nav.openMember(member)}><Face person={member} portrait /><span><b>{member.name} <VerifiedBadge memberId={member.id} /></b><small>{[member.title, member.company].filter(Boolean).join(' · ')}</small><em>{post.when}</em></span></button> : <div><SelfFace /><span><b>{author}</b><small>{[net.profile.title, net.profile.company].filter(Boolean).join(' · ')}</small><em>{post.when}</em></span></div>}<span className="signal-badge">{post.kind}</span></header>
    <div className="social-feed-copy"><h2>{post.text}</h2><p>{post.detail}</p></div>
    {post.media?.length ? <div className="social-media-note"><Image size={16} /><span>{post.media.length} attached {post.media.length === 1 ? 'file' : 'files'} · open this Signal on the member profile to view</span></div> : null}
    <footer><button className={liked ? 'active' : ''} onClick={() => net.togglePostLike(post.id)}><Heart size={16} fill={liked ? 'currentColor' : 'none'} />{liked ? 'Liked' : 'Like'}</button><button onClick={() => setCommenting(value => !value)}><MessageCircle size={16} />Comment</button><button onClick={() => net.toggleSave(post.id, 'this Signal')}><Bookmark size={16} />Save</button>{!mine && member && <button onClick={() => { const id = net.respondToPost(post.id, member.id); if (id) nav.goToThread(id) }}><MessageSquareText size={16} />Message</button>}</footer>
    {(commenting || comments.length > 0) && <div className="social-comments">{comments.map(item => <p key={item.id}><b>{net.profile.name || 'You'}</b>{item.text}<small>{item.when}</small></p>)}{commenting && <div><input value={comment} onChange={event => setComment(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') sendComment() }} placeholder="Add useful context…" /><button disabled={!comment.trim()} onClick={sendComment}><Send size={14} /></button></div>}</div>}
  </article>
}

function HelpMenu({ ask, member }: { ask: NetworkAsk; member: Member }) {
  const net = useNetwork(); const nav = useNav(); const [open, setOpen] = useState(false)
  const answer = (text: string) => { const thread = net.respondToAsk(ask.id, text); if (thread) nav.goToThread(thread) }
  return <div className="help-action"><button className="primary" onClick={() => setOpen(value => !value)}><Handshake size={16} />I can help</button>{open && <div>{[
    `I know someone who may help with: ${ask.ask}`, `My company may be able to help with: ${ask.ask}`,
    `I have relevant experience with: ${ask.ask}`, `I may be able to make an introduction for: ${ask.ask}`,
  ].map((text, index) => <button key={text} onClick={() => answer(text)}>{['I know someone', 'My company can help', 'I have experience here', 'I can make an introduction'][index]}</button>)}</div>}</div>
}

function FeedAsk({ ask, member, lead = false }: { ask: NetworkAsk; member: Member; lead?: boolean }) {
  const net = useNetwork(); const nav = useNav()
  return <article className={`social-feed-card signal-ask-card${lead ? ' is-lead' : ''}`}><header><button onClick={() => nav.openMember(member)}><Face person={member} portrait /><span><b>{member.name} <VerifiedBadge memberId={member.id} /></b><small>{member.title} · {member.company}</small><em>{ask.posted}</em></span></button><span className="signal-badge looking">Looking for</span></header><div className="social-feed-copy"><h2>{ask.ask}</h2><p>{ask.detail}</p></div><aside><span>Why now</span><p>{ask.whyNow}</p>{ask.offer && <small>Offers in return: {ask.offer}</small>}</aside><footer><HelpMenu ask={ask} member={member} /><button onClick={() => net.requestWarmPath(ask.id)}><Users size={16} />Introduce</button><button onClick={() => net.toggleSave(ask.id, 'this Signal')}><Bookmark size={16} />Save</button><button onClick={() => nav.messageMember(member.id)}><MessageSquareText size={16} />Message</button></footer></article>
}

function IntelligenceCards() {
  const net = useNetwork(); const ops = useOps(); const ceo = useCeo(); const nav = useNav()
  const due = ops.tasks.find(task => task.status !== 'done' && task.status !== 'cancelled' && task.dueAt)
  const meeting = ceo.inputs.meetings.find(item => new Date(item.startsAt).getTime() > Date.now())
  const cooling = [...net.members].sort((a, b) => b.lastInteractionDays - a.lastInteractionDays)[0]
  const approval = ceo.inputs.approvals.find(item => item.status === 'pending')
  const cards = [
    cooling && cooling.lastInteractionDays > 30 ? { id: `cool-${cooling.id}`, label: 'Relationship alert', title: `${cooling.name} has no recorded interaction for ${cooling.lastInteractionDays} days.`, detail: cooling.nextAction, action: 'Follow up', run: () => nav.messageMember(cooling.id) } : null,
    due ? { id: `due-${due.id}`, label: 'Commitment due', title: due.title, detail: due.dueAt ? `Due ${new Date(due.dueAt).toLocaleDateString()}. ${due.detail}` : due.detail, action: 'Open Work', run: () => nav.setPage('work') } : null,
    meeting ? { id: `meet-${meeting.id}`, label: 'Meeting ahead', title: meeting.title, detail: new Date(meeting.startsAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), action: 'Prepare me', run: () => meeting.memberId ? openCeo({ view: 'prepare', memberId: meeting.memberId }) : nav.setPage('calendar') } : null,
    approval ? { id: `approve-${approval.id}`, label: 'Decision review', title: approval.summary, detail: 'Waiting in your private approval queue. Nothing happens without you.', action: 'Review', run: () => openCeo({ view: 'approvals' }) } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item)).slice(0, 2)
  return <>{cards.map(card => <article className="social-intelligence-card" key={card.id}><span>{card.label}</span><Lightbulb size={18} /><h2>{card.title}</h2><p>{card.detail}</p><button onClick={card.run}>{card.action}<ArrowRight size={14} /></button></article>)}</>
}

function MovingNow() {
  const net = useNetwork(); const nav = useNav(); const { data } = useAetherisNews()
  const rows: Array<{ id: string; kicker: string; title: string; meta: string; run: () => void }> = []
  net.asks.filter(ask => ask.visibility !== 'private' && ask.memberId !== 'me').slice(0, 3).forEach(ask => {
    const member = net.members.find(item => item.id === ask.memberId)
    rows.push({ id: `ask-${ask.id}`, kicker: 'Open ask', title: ask.ask, meta: member ? `${member.name} · ${ask.posted}` : ask.posted, run: () => net.requestWarmPath(ask.id) })
  })
  ;(data?.items ?? []).slice(0, 2).forEach(item => rows.push({ id: `news-${item.id}`, kicker: 'Signal', title: item.title, meta: `${item.source} · ${newsAge(item.published)}`, run: () => nav.setPage('news') }))
  if (!rows.length) return null
  return <section className="feed-radar" aria-labelledby="feed-radar-title">
    <header><b id="feed-radar-title">Moving in your network</b></header>
    <ol>{rows.slice(0, 5).map((row, index) => <li key={row.id}><span className="feed-radar-index">{String(index + 1).padStart(2, '0')}</span><button onClick={row.run}><span className="feed-radar-kicker">{row.kicker}</span><b>{row.title}</b><small>{row.meta}</small></button></li>)}</ol>
  </section>
}

function SocialRails() {
  const net = useNetwork(); const graph = useGraph(); const ops = useOps(); const ceo = useCeo(); const nav = useNav(); const { data } = useAetherisNews()
  const mission = activeMission(graph.missions); const people = [...net.members].sort((a, b) => b.scoreTotal - a.scoreTotal).slice(0, 3)
  const meetings = ceo.inputs.meetings.filter(item => new Date(item.startsAt).getTime() > Date.now()).slice(0, 2)
  const opportunities = ops.opportunities.filter(item => !item.archived && item.status === 'open').slice(0, 2)
  return <>
    <aside className="social-left-rail"><section className="social-identity-card"><SelfFace large /><VerifiedBadge memberId={graph.userId ?? ''} detail /><h2>{net.profile.name || 'Your profile'}</h2><p>{[net.profile.title, net.profile.company].filter(Boolean).join(' · ') || 'Complete your professional identity'}</p>{net.profile.location && <small>{net.profile.location}</small>}<dl><div><dt>{net.connections.length}</dt><dd>Connections</dd></div><div><dt>{ops.tasks.filter(t => t.kind === 'commitment' && t.status !== 'done').length}</dt><dd>Open commitments</dd></div></dl>{mission && <div className="identity-mission"><span>Active Mission</span><b>{mission.title}</b><small>{mission.successDefinition || mission.objective}</small></div>}<nav><button onClick={() => nav.setPage('me')}>View profile</button><button onClick={() => nav.setPage('network')}>My network</button><button onClick={() => openCeo({ view: 'strategic' })}>Strategic relationships</button></nav></section></aside>
    <aside className="social-right-rail"><MovingNow /><section><header><b>People who matter now</b><button onClick={() => nav.setPage('network')}>See all</button></header>{people.map(person => <button className="social-rail-person" key={person.id} onClick={() => nav.openMember(person)}><Face person={person} /><span><b>{person.name}</b><small>{person.title} · {person.company}</small></span></button>)}</section><section><header><b>Upcoming meetings</b><button onClick={() => nav.setPage('calendar')}>Calendar</button></header>{meetings.map(item => <button className="social-rail-row" key={item.id} onClick={() => nav.setPage('calendar')}><CalendarDays size={15} /><span><b>{item.title}</b><small>{new Date(item.startsAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' })}</small></span></button>)}{!meetings.length && <p>No upcoming meetings recorded.</p>}</section><section><header><b>Opportunities for you</b><button onClick={() => nav.setPage('work')}>Work</button></header>{opportunities.map(item => <button className="social-rail-row" key={item.id} onClick={() => nav.setPage('work')}><Target size={15} /><span><b>{item.name}</b><small>{item.nextAction || item.stageName}</small></span></button>)}{!opportunities.length && <p>No open opportunities recorded.</p>}</section><section><header><b>Top intelligence</b><button onClick={() => nav.setPage('news')}>All news</button></header>{(data?.items ?? []).slice(0, 3).map(item => <button className="social-rail-news" key={item.id} onClick={() => nav.setPage('news')}><b>{item.title}</b><small>{item.source} · {newsAge(item.published)}</small></button>)}</section></aside>
  </>
}

const feedLanes = ['ALL SIGNALS', 'ASKS', 'INSIGHTS', 'CAPITAL', 'HIRING', 'PARTNERSHIPS'] as const
type FeedLane = typeof feedLanes[number]

function FeedMasthead({ count, onCompose, onBrief }: { count: number; onCompose: () => void; onBrief: () => void }) {
  const net = useNetwork()
  const first = (net.profile.name || 'you').split(' ')[0]
  const issued = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return <header className="feed-masthead">
    <p className="feed-kicker">Network dispatch · {issued}</p>
    <h1>The signals that shape <em>what happens next.</em></h1>
    <p className="feed-standfirst">{count ? `${count} live ${count === 1 ? 'Signal' : 'Signals'} from people you can actually reach, ${first}. Context first, then the introduction.` : `Nothing is moving yet, ${first}. Share what you are building or looking for and the network answers with context.`}</p>
    <div className="feed-masthead-actions">
      <button className="feed-primary" onClick={onCompose}>Share a Signal <span aria-hidden="true">↗</span></button>
      <button className="feed-textlink" onClick={onBrief}>Read the executive brief</button>
    </div>
  </header>
}

function FeedTicker() {
  const line = 'Know who matters · Know why now · Double opt-in introductions · Context before the ask · No noise'
  return <div className="feed-ticker" aria-hidden="true"><div className="feed-ticker-track"><span>{line}</span><span>{line}</span><span>{line}</span></div></div>
}

export function SocialHome() {
  const net = useNetwork()
  const [mode, setMode] = useState<'feed' | 'brief'>('feed')
  const [composerOpen, setComposerOpen] = useState(false)
  const [lane, setLane] = useState<FeedLane>('ALL SIGNALS')
  const feed = useMemo(() => {
    const rows: Array<{ id: string; type: 'post' | 'ask'; post?: Post; ask?: NetworkAsk; member?: Member }> = []
    net.posts.filter(post => post.visibility !== 'private' || post.memberId === 'me').forEach(post => {
      const member = net.members.find(item => item.id === post.memberId)
      rows.push({ id: `p-${post.id}`, type: 'post', post, ...(member ? { member } : {}) })
    })
    net.asks.filter(ask => ask.visibility !== 'private' && ask.memberId !== 'me').forEach(ask => { const member = net.members.find(item => item.id === ask.memberId); if (member) rows.push({ id: `a-${ask.id}`, type: 'ask', ask, member }) })
    return rows.slice(0, 12)
  }, [net.posts, net.asks, net.members])
  const shown = useMemo(() => feed.filter(row => {
    if (lane === 'ALL SIGNALS') return true
    if (lane === 'ASKS') return row.type === 'ask' || row.post?.kind === 'Strategic ask'
    const kind = row.post?.kind
    if (lane === 'INSIGHTS') return kind === 'Insight'
    if (lane === 'CAPITAL') return kind === 'Raising capital'
    if (lane === 'HIRING') return kind === 'Hiring'
    return kind === 'Partnership'
  }), [feed, lane])
  return <div className="social-home"><nav className="home-view-switch" aria-label="Home view"><button className={mode === 'feed' ? 'active' : ''} onClick={() => setMode('feed')}>Feed</button><button className={mode === 'brief' ? 'active' : ''} onClick={() => setMode('brief')}>Executive Brief</button></nav>{mode === 'brief' ? <ExecutiveHome embedded /> : <div className="social-editorial">
    <FeedMasthead count={feed.length} onCompose={() => setComposerOpen(true)} onBrief={() => setMode('brief')} />
    <FeedTicker />
    <div className="social-home-grid"><SocialRails /><main className="social-feed">
      <SignalComposer open={composerOpen} setOpen={setComposerOpen} />
      <nav className="feed-lanes" aria-label="Signal categories">{feedLanes.map(item => <button key={item} className={lane === item ? 'active' : ''} onClick={() => setLane(item)}>{item}</button>)}</nav>
      <IntelligenceCards />
      {shown.map((row, index) => {
        if (row.type === 'post' && row.post) return row.member ? <FeedPost key={row.id} post={row.post} member={row.member} lead={index === 0} /> : <FeedPost key={row.id} post={row.post} lead={index === 0} />
        return row.ask && row.member ? <FeedAsk key={row.id} ask={row.ask} member={row.member} lead={index === 0} /> : null
      })}
      {!shown.length && <section className="social-empty"><CircleDot size={22} /><h2>{feed.length ? 'Nothing in this category yet.' : 'Your Signal Feed is ready.'}</h2><p>{feed.length ? 'Switch back to all Signals, or share one of your own in this category.' : 'Share what you are building, looking for, or able to help with. Relevant member Signals will appear here as the network grows.'}</p></section>}
    </main></div>
  </div>}</div>
}

/* Editorial magazine feed used on the member home page. */
export function EditorialFeed({ onBrief }: { onBrief?: () => void }) {
  const net = useNetwork()
  const [composerOpen, setComposerOpen] = useState(false)
  const [lane, setLane] = useState<FeedLane>('ALL SIGNALS')
  const feed = useMemo(() => {
    const rows: Array<{ id: string; type: 'post' | 'ask'; post?: Post; ask?: NetworkAsk; member?: Member }> = []
    net.posts.filter(post => post.visibility !== 'private' || post.memberId === 'me').forEach(post => {
      const member = net.members.find(item => item.id === post.memberId)
      rows.push({ id: `p-${post.id}`, type: 'post', post, ...(member ? { member } : {}) })
    })
    net.asks.filter(ask => ask.visibility !== 'private' && ask.memberId !== 'me').forEach(ask => { const member = net.members.find(item => item.id === ask.memberId); if (member) rows.push({ id: `a-${ask.id}`, type: 'ask', ask, member }) })
    return rows.slice(0, 12)
  }, [net.posts, net.asks, net.members])
  const shown = useMemo(() => feed.filter(row => {
    if (lane === 'ALL SIGNALS') return true
    if (lane === 'ASKS') return row.type === 'ask' || row.post?.kind === 'Strategic ask'
    const kind = row.post?.kind
    if (lane === 'INSIGHTS') return kind === 'Insight'
    if (lane === 'CAPITAL') return kind === 'Raising capital'
    if (lane === 'HIRING') return kind === 'Hiring'
    return kind === 'Partnership'
  }), [feed, lane])
  return <section className="social-editorial" aria-labelledby="editorial-feed-title">
    <FeedMasthead count={feed.length} onCompose={() => setComposerOpen(true)} {...(onBrief ? { onBrief } : {})} />
    <FeedTicker />
    <div className="feed-editorial-layout">
      <div className="feed-editorial-main">
        <header className="feed-section-head"><h2 id="editorial-feed-title">Latest from your network</h2><span>{feed.length} live {feed.length === 1 ? 'Signal' : 'Signals'}</span></header>
        <SignalComposer open={composerOpen} setOpen={setComposerOpen} />
        <nav className="feed-lanes" aria-label="Signal categories">{feedLanes.map(item => <button key={item} className={lane === item ? 'active' : ''} onClick={() => setLane(item)}>{item}</button>)}</nav>
        <IntelligenceCards />
        <div className="feed-grid">
          {shown.map((row, index) => {
            if (row.type === 'post' && row.post) return row.member ? <FeedPost key={row.id} post={row.post} member={row.member} lead={index === 0} /> : <FeedPost key={row.id} post={row.post} lead={index === 0} />
            return row.ask && row.member ? <FeedAsk key={row.id} ask={row.ask} member={row.member} lead={index === 0} /> : null
          })}
        </div>
        {!shown.length && <section className="social-empty"><CircleDot size={22} /><h2>{feed.length ? 'Nothing in this category yet.' : 'Your Signal Feed is ready.'}</h2><p>{feed.length ? 'Switch back to all Signals, or share one of your own in this category.' : 'Share what you are building, looking for, or able to help with. Relevant member Signals will appear here as the network grows.'}</p></section>}
      </div>
      <aside className="feed-editorial-rail"><MovingNow /></aside>
    </div>
  </section>
}

type PeopleFilter = 'FOR YOU' | 'CUSTOMERS' | 'CAPITAL' | 'PARTNERS' | 'TALENT' | 'ADVISORS' | 'NEARBY' | 'CONNECTED'
export function SocialNetwork({ people }: { people: Member[] }) {
  const net = useNetwork(); const nav = useNav(); const [query, setQuery] = useState(''); const [filter, setFilter] = useState<PeopleFilter>('FOR YOU')
  const filters: PeopleFilter[] = ['FOR YOU', 'CUSTOMERS', 'CAPITAL', 'PARTNERS', 'TALENT', 'ADVISORS', 'NEARBY', 'CONNECTED']
  const shown = useMemo(() => people.filter(person => {
    const hay = `${person.name} ${person.title} ${person.company} ${person.location} ${person.industry} ${person.role} ${person.expertise.join(' ')} ${person.needs.join(' ')} ${person.offers.join(' ')}`.toLowerCase()
    if (query.trim() && !hay.includes(query.trim().toLowerCase())) return false
    if (filter === 'CONNECTED') return net.connections.includes(person.id)
    if (filter === 'NEARBY') return Boolean(net.profile.location && person.location.toLowerCase().includes(net.profile.location.toLowerCase().split(',')[0] ?? ''))
    if (filter === 'CUSTOMERS') return /customer|buyer|client/.test(hay)
    if (filter === 'CAPITAL') return /investor|capital|lender|private equity|family office/.test(hay)
    if (filter === 'PARTNERS') return /partner|partnership/.test(hay)
    if (filter === 'TALENT') return /talent|hiring|recruit|operator/.test(hay)
    if (filter === 'ADVISORS') return /advisor|advisory/.test(hay)
    return true
  }).sort((a, b) => b.scoreTotal - a.scoreTotal), [people, query, filter, net.connections, net.profile.location])
  return <section className="social-network"><header><span>People</span><h1>Find the right person at the right time.</h1><p>Discover verified professionals through shared context, current needs, and credible paths—not vanity metrics.</p></header><label className="people-social-search"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search people, companies, expertise, or location…" /></label><nav className="people-filter-row">{filters.map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</nav><div className="people-social-grid">{shown.map(person => <article key={person.id}><button className="people-card-open" onClick={() => nav.openMember(person)}><Face person={person} large portrait /><span><h2>{person.name} <VerifiedBadge memberId={person.id} /></h2><p>{person.title}</p><b>{person.company}</b><small>{person.location}</small></span></button><div className="people-tags">{[person.industry, ...person.expertise].filter(Boolean).slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div><div className="people-why"><span>Why this person matters now</span><p>{person.whyNow || person.focus || 'No current timing signal recorded.'}</p><small>{person.bestPath.length > 2 ? `Warm path via ${person.bestPath[1]}` : person.mutuals.length ? `${person.mutuals.length} mutual paths` : 'No warm path recorded'}</small></div><footer><Btn kind="secondary" onClick={() => net.connect(person.id)}>{net.connections.includes(person.id) ? <><Check size={14} />Connected</> : <><Plus size={14} />Connect</>}</Btn><Btn kind="quiet" onClick={() => nav.messageMember(person.id)}>Message</Btn><Btn kind="quiet" onClick={() => nav.openIntro(person)}>Ask for intro</Btn><button className="text-link" onClick={() => nav.openMember(person)}>View</button></footer></article>)}{!shown.length && <div className="social-empty"><CircleDot size={20} /><h2>No people match this view yet.</h2><p>Try another filter or search phrase.</p></div>}</div></section>
}

export function NotificationsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const net = useNetwork(); const ops = useOps(); const ceo = useCeo(); const nav = useNav()
  if (!open) return null
  const items = [
    ...net.threads.filter(thread => thread.unread).map(thread => ({ id: `m-${thread.id}`, label: 'Unread message', text: net.members.find(member => member.id === thread.memberId)?.name ?? 'A member', detail: thread.messages.at(-1)?.text ?? thread.introContext, run: () => nav.goToThread(thread.id) })),
    ...ops.tasks.filter(task => task.status !== 'done' && task.status !== 'cancelled' && task.dueAt).slice(0, 4).map(task => ({ id: `t-${task.id}`, label: task.kind === 'commitment' ? 'Commitment due' : 'Task due', text: task.title, detail: new Date(task.dueAt ?? '').toLocaleDateString(), run: () => nav.setPage('work') })),
    ...ceo.inputs.approvals.filter(item => item.status === 'pending').slice(0, 4).map(item => ({ id: `q-${item.id}`, label: 'Approval waiting', text: item.summary, detail: 'Nothing happens without your approval.', run: () => openCeo({ view: 'approvals' }) })),
    ...ceo.officeRequests.filter(item => item.status === 'pending').slice(0, 3).map(item => ({ id: `o-${item.id}`, label: 'Office-hours request', text: item.reason, detail: 'Review and approve or decline.', run: () => openCeo({ view: 'officeHours' }) })),
  ]
  const go = (run: () => void) => { onClose(); run() }
  return <div className="notifications-wrap" role="dialog" aria-label="Notifications"><button className="notifications-scrim" onClick={onClose} aria-label="Close notifications" /><aside className="notifications-panel"><header><div><span>Today</span><h2>Notifications</h2></div><button onClick={onClose} aria-label="Close"><X size={18} /></button></header><div>{items.map(item => <button key={item.id} onClick={() => go(item.run)}><Bell size={16} /><span><small>{item.label}</small><b>{item.text}</b><p>{item.detail}</p></span><ArrowRight size={14} /></button>)}{!items.length && <div className="notifications-empty"><ShieldCheck size={22} /><b>You’re caught up.</b><p>No unread conversations, due commitments, pending approvals, or office-hours requests.</p></div>}</div></aside></div>
}