import { useState } from 'react'
import { Bookmark, MessageSquare, ThumbsUp } from 'lucide-react'
import { useNetwork } from '../store'
import { useMoat } from '../moat-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head } from '../ui'
import { useOutreachGate } from '../moat-ui'
import type { KnowledgePostKind } from '../domain/moat-models'

const kinds: KnowledgePostKind[] = ['what worked', 'what failed', 'how we solved it', 'hard-won lesson', 'market observation']

export function KnowledgePage() {
  const moat = useMoat()
  const net = useNetwork()
  const nav = useNav()
  const { gate, modal } = useOutreachGate()
  const [kind, setKind] = useState<KnowledgePostKind>('what worked')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [filter, setFilter] = useState<'all' | 'saved' | KnowledgePostKind>('all')
  const [comment, setComment] = useState<Record<string, string>>({})

  const posts = moat.knowledge
    .filter(p => filter === 'all' ? true : filter === 'saved' ? p.saved : p.kind === filter)
    .sort((a, b) => b.relevance - a.relevance)

  return <>
    <Head
      label="KNOWLEDGE EXCHANGE"
      title="What worked, what failed, and what it cost to learn."
      copy="Not thought leadership. Specific operating knowledge from people doing the work: the decision, the constraint, the outcome. Contributing here is how credibility is earned in this network — no promotion, no pitching, no engagement farming."
      proof="Ranked by relevance to what you are moving, never by popularity"
    />

    <section className="module knowledge-compose">
      <header><div><Eyebrow>CONTRIBUTE</Eyebrow><h3>Share the specifics, not the takeaway.</h3></div></header>
      <div className="knowledge-kinds">
        {kinds.map(k => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k}</button>)}
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What happened, in one line" />
      <textarea rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="The situation, the decision, what it actually produced" />
      <Btn disabled={!title.trim() || !body.trim()} onClick={() => {
        gate(`${title}\n\n${body}`, { channel: 'ask', authorId: 'me' }, () => {
          moat.addKnowledge({ kind, title: title.trim(), body: body.trim(), industries: net.profile.industries ?? [] })
          setTitle(''); setBody('')
        })
      }}>Publish to the exchange</Btn>
    </section>

    <nav className="lane-row" role="tablist" aria-label="Knowledge filters">
      {(['all', 'saved', ...kinds] as const).map(f =>
        <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f}</button>)}
    </nav>

    <section className="knowledge-list">
      {posts.map(post => {
        const author = net.members.find(m => m.id === post.authorId)
        return <article key={post.id} className="module knowledge-card">
          <header>
            {author && <Face person={author} />}
            <div><Eyebrow>{post.kind.toUpperCase()}</Eyebrow><h3>{post.title}</h3>
              <small>{author ? `${author.name} · ${author.title}` : 'You'} · {post.createdAt}</small></div>
            <span className="knowledge-relevance">{post.relevance}% relevant</span>
          </header>
          <p className="knowledge-body">{post.body}</p>
          <p className="knowledge-why"><b>Why this is in your feed.</b> {post.whyInYourFeed}</p>
          <footer className="knowledge-actions">
            <button className={post.usefulPrivately ? 'on' : ''} onClick={() => moat.toggleKnowledgeUseful(post.id)}><ThumbsUp size={13} /> Useful{post.usefulPrivately ? ' (private)' : ''}</button>
            <button className={post.saved ? 'on' : ''} onClick={() => moat.toggleKnowledgeSave(post.id)}><Bookmark size={13} /> {post.saved ? 'Saved' : 'Save'}</button>
            {author && <button onClick={() => nav.messageMember(author.id)}><MessageSquare size={13} /> Ask privately</button>}
            {!!post.industries.length && <span className="knowledge-tags">{post.industries.join(' · ')}</span>}
          </footer>
          <div className="knowledge-discussion">
            {post.discussion.map(d => <p key={d.id}><b>{net.members.find(m => m.id === d.authorId)?.name ?? 'You'}</b> {d.text} <small>{d.when}</small></p>)}
            {post.followUps.map(f => <p key={f.id} className="knowledge-followup"><b>Follow-up</b> {f.question}{f.answer ? <em>{f.answer}</em> : <small>awaiting answer</small>}</p>)}
            <div className="knowledge-reply">
              <input value={comment[post.id] ?? ''} onChange={e => setComment({ ...comment, [post.id]: e.target.value })} placeholder="Add specifics or ask a follow-up" />
              <button className="text-action" onClick={() => { const t = (comment[post.id] ?? '').trim(); if (t) { moat.discussKnowledge(post.id, t); setComment({ ...comment, [post.id]: '' }) } }}>Reply</button>
              <button className="text-action" onClick={() => { const t = (comment[post.id] ?? '').trim(); if (t) { moat.askFollowUp(post.id, t); setComment({ ...comment, [post.id]: '' }) } }}>Ask follow-up</button>
            </div>
          </div>
        </article>
      })}
      {!posts.length && <p className="quiet-empty">Nothing here yet under this filter.</p>}
    </section>
    {modal}
  </>
}
