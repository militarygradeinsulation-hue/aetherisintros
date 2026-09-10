import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, MessageSquareText, Plus, Send, X } from 'lucide-react'
import { useNetwork } from '../store'
import { usePlatform } from '../platform'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, Numeral, Why } from '../ui'
import type { Circle } from '../domain/models'

export function CirclesPage({ openId, setOpenId }: { openId: string | null; setOpenId: (id: string | null) => void }) {
  const platform = usePlatform()
  const [creating, setCreating] = useState(false)
  const open = platform.circles.find(c => c.id === openId) ?? null
  if (open) return <CircleDetail circle={open} onBack={() => setOpenId(null)} />

  const mine = platform.circles.filter(c => c.memberIds.includes('me'))
  const suggested = [...platform.circles.filter(c => !c.memberIds.includes('me'))].sort((a, b) => b.relevanceScore - a.relevanceScore)

  return <>
    <Head
      label="CIRCLES / PURPOSE-BASED ROOMS"
      title="Rooms that exist for a reason, not a category."
      copy="A circle forms around a shared objective. When the purpose is met, it closes or gets reframed — nobody maintains a dead group."
      proof={`${mine.length} circles you are in · ${platform.circles.length} in the network`}
      action={<Btn onClick={() => setCreating(true)}><Plus size={14} /> Create circle</Btn>}
    />

    <section className="circle-grid">
      <header className="section-line"><Eyebrow>YOUR CIRCLES</Eyebrow><small>{mine.length}</small></header>
      {mine.map(c => <CircleCard key={c.id} circle={c} onOpen={() => setOpenId(c.id)} />)}
      {mine.length === 0 && <p className="empty-state">You are not in a circle yet. The suggestions below are ranked by your live intents.</p>}
    </section>

    <section className="circle-grid">
      <header className="section-line"><Eyebrow>WORTH JOINING</Eyebrow><small>ranked by shared intent</small></header>
      {suggested.map(c => <CircleCard key={c.id} circle={c} onOpen={() => setOpenId(c.id)} />)}
    </section>
  </>
}

function CircleCard({ circle, onOpen }: { circle: Circle; onOpen: () => void }) {
  const platform = usePlatform()
  const net = useNetwork()
  const joined = circle.memberIds.includes('me')
  const faces = circle.memberIds.filter(id => id !== 'me').map(id => net.members.find(m => m.id === id)).filter(Boolean).slice(0, 4)
  return <article className="circle-card">
    <header>
      <button onClick={onOpen}><Eyebrow>{circle.rolesRepresented.slice(0, 2).join(' · ') || 'MIXED ROOM'}</Eyebrow><h3>{circle.name}</h3></button>
      <Numeral value={circle.relevanceScore} of=" relevance" />
    </header>
    <p className="circle-purpose">{circle.purpose}</p>
    <p>{circle.description}</p>
    <ul className="circle-intents">{circle.sharedIntents.slice(0, 3).map(i => <li key={i}>{i}</li>)}</ul>
    <footer>
      <div className="circle-faces">{faces.map(m => m && <Face key={m.id} person={m} />)}<small>{circle.memberIds.length} members · {circle.openIntroCount} open intros</small></div>
      <div>
        <Btn kind="quiet" onClick={onOpen}>Open <ArrowRight size={13} /></Btn>
        {joined
          ? <Btn kind="quiet" onClick={() => platform.leaveCircle(circle.id)}>Leave</Btn>
          : circle.visibility === 'private'
            ? <Btn kind="secondary" onClick={() => platform.joinCircle(circle.id)}>Request invite</Btn>
            : <Btn onClick={() => platform.joinCircle(circle.id)}><Plus size={13} /> Join</Btn>}
      </div>
    </footer>
  </article>
}

function CircleDetail({ circle, onBack }: { circle: Circle; onBack: () => void }) {
  const platform = usePlatform()
  const net = useNetwork()
  const nav = useNav()
  const [text, setText] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const joined = circle.memberIds.includes('me')
  const members = circle.memberIds.map(id => net.members.find(m => m.id === id)).filter(Boolean)
  const memberIntents = platform.intents.filter(i => i.status === 'active' && circle.memberIds.includes(i.memberId))
  const needs = memberIntents.filter(i => /NEED|HIRING|BUYING|EXPLORING/.test(i.type))
  const offers = memberIntents.filter(i => /HELP|INTRODUCE|INVESTING|SELLING|BUILDING/.test(i.type))
  const systems = platform.systems.filter(s => circle.activeSystemIds.includes(s.id))
  const events = ['Midwest Manufacturing Forum · Oct 2', 'PE Value Creation Roundtable · Oct 15'].filter(() => circle.eventIds.length > 0)
  const best = [...members].filter(Boolean).sort((a, b) => (b!.scoreTotal) - (a!.scoreTotal))[0]

  return <article className="circle-detail">
    <button className="back-link" onClick={onBack}><ArrowLeft size={15} /> All circles</button>

    <header className="circle-hero">
      <div>
        <Eyebrow>{circle.purposeStatus === 'expiring' ? 'PURPOSE EXPIRING' : 'ACTIVE PURPOSE'}</Eyebrow>
        <h1>{circle.name}</h1>
        <h2>{circle.purpose}</h2>
        <p>{circle.description}</p>
        <div className="sys-hero-actions">
          {joined
            ? <>
              <Btn kind="secondary" onClick={() => setShareOpen(true)}>Share a system</Btn>
              <Btn kind="quiet" onClick={() => nav.postNeed()}>Post an ask</Btn>
              <Btn kind="quiet" onClick={() => platform.leaveCircle(circle.id)}>Leave circle</Btn>
            </>
            : <Btn onClick={() => platform.joinCircle(circle.id)}><Plus size={14} /> Join circle</Btn>}
          <Btn kind="quiet" onClick={() => void navigator.clipboard?.writeText(circle.name).catch(() => {})}>Invite member</Btn>
        </div>
      </div>
      <aside className="sys-hero-side">
        <span>CIRCLE HEALTH</span><p>{circle.health}</p>
        <span>RELEVANCE TO YOU</span><p>{circle.relevanceScore} / 100 — based on your live intents and who you already know here.</p>
        {circle.purposeStatus === 'expiring' && <>
          <span>PURPOSE COMPLETION</span>
          <p>The original question is largely answered. Choose what happens next.</p>
          <div className="purpose-actions">
            {(['complete', 'archived', 'active'] as const).map(s =>
              <button key={s} onClick={() => platform.setCirclePurpose(circle.id, s)}>
                {s === 'complete' ? 'Close' : s === 'archived' ? 'Archive' : 'Renew'}
              </button>)}
          </div>
        </>}
      </aside>
    </header>

    <div className="sys-modules">
      <section className="mod">
        <header><span>WHO IS HERE ({members.length})</span></header>
        <ul className="shared-list">{members.map(m => m && <li key={m.id}>
          <Face person={m} portrait />
          <div><strong>{m.name}</strong><small>{m.title}, {m.company}</small></div>
          <button className="mod-link" onClick={() => nav.openMember(m)}>View</button>
        </li>)}</ul>
      </section>
      <section className="mod">
        <header><span>WHAT EVERYONE NEEDS</span></header>
        <ul className="mod-rows">{needs.map(i => <li key={i.id}>
          <button onClick={() => { const m = net.members.find(x => x.id === i.memberId); if (m) nav.openMember(m) }}>
            <b>{i.title}</b><small>{net.members.find(m => m.id === i.memberId)?.name ?? 'Member'} · {i.type}</small>
          </button>
        </li>)}{needs.length === 0 && <li><small>No open needs posted in this room.</small></li>}</ul>
      </section>
      <section className="mod">
        <header><span>WHAT MEMBERS CAN PROVIDE</span></header>
        <ul className="mod-rows">{offers.map(i => <li key={i.id}>
          <button onClick={() => { const m = net.members.find(x => x.id === i.memberId); if (m) nav.openMember(m) }}>
            <b>{i.title}</b><small>{net.members.find(m => m.id === i.memberId)?.name ?? 'Member'} · {i.type}</small>
          </button>
        </li>)}{offers.length === 0 && <li><small>Nothing offered yet.</small></li>}</ul>
      </section>
    </div>

    <div className="sys-modules two">
      <section className="mod">
        <header><span>SYSTEMS CIRCULATING</span></header>
        <ul className="mod-rows">{systems.map(s => <li key={s.id}>
          <button onClick={() => nav.openSystem(s.id)}><b>{s.name}</b><small>{s.thesis}</small></button>
          <em>{s.category}</em>
        </li>)}{systems.length === 0 && <li><small>No systems shared here yet.</small></li>}</ul>
        <header className="mod-second"><span>CURRENT OPPORTUNITIES</span></header>
        <ul className="mod-list">{circle.opportunities.map(o => <li key={o}>{o}</li>)}</ul>
      </section>
      <section className="mod">
        <header><span>OPEN INTRODUCTIONS</span></header>
        <p className="mod-copy">{circle.openIntroCount} introductions are in motion inside this room. Each one is double opt-in.</p>
        <header className="mod-second"><span>BEST NEXT CONNECTION</span></header>
        {best && <div className="connector-box">
          <Face person={best} portrait large />
          <div><b>{best.name}</b><small>{best.title}, {best.company}</small><em>{best.whyNow}</em></div>
        </div>}
        {best && <Why>{best.name.split(' ')[0]} shares this room’s purpose and has the strongest current timing signal of anyone here.</Why>}
        {best && <div className="row-actions">
          <Btn kind="quiet" onClick={() => nav.messageMember(best.id)}><MessageSquareText size={14} /> Message</Btn>
          <Btn onClick={() => nav.openHandshake(best.id)}>Digital handshake</Btn>
        </div>}
        {events.length > 0 && <>
          <header className="mod-second"><span>EVENTS</span></header>
          <ul className="mod-list">{events.map(e => <li key={e}>{e}</li>)}</ul>
        </>}
      </section>
    </div>

    <section className="mod circle-discussion">
      <header><span>CIRCLE DISCUSSION</span></header>
      {circle.discussion.map(d => {
        const author = net.members.find(m => m.id === d.authorId)
        return <article key={d.id} className="discussion-row">
          {author ? <Face person={author} /> : <span className="person-avatar">{net.profile.initials}</span>}
          <div><strong>{author?.name ?? 'You'}</strong><p>{d.text}</p><small>{d.when}</small></div>
        </article>
      })}
      {circle.discussion.length === 0 && <p className="empty-state">No discussion yet. Start with something specific and useful.</p>}
      <textarea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Say something the room can use…" />
      <Btn disabled={!text.trim()} onClick={() => { platform.postCircleMessage(circle.id, text.trim()); setText('') }}>
        <Send size={14} /> Start discussion
      </Btn>
    </section>

    {shareOpen && <div className="modal-wrap" onMouseDown={() => setShareOpen(false)}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <header><div><Eyebrow>SHARE A SYSTEM</Eyebrow><h2>Put something useful into the room.</h2></div>
          <button className="icon-btn" onClick={() => setShareOpen(false)} aria-label="Close"><X size={17} /></button></header>
        <ul className="mod-rows">{platform.systems.filter(s => s.ownerId === 'me').map(s => <li key={s.id}>
          <button onClick={() => { platform.shareSystemWithCircle(circle.id, s.id); setShareOpen(false) }}>
            <b>{s.name}</b><small>{s.thesis}</small>
          </button>
          {circle.activeSystemIds.includes(s.id) ? <em><Check size={13} /> shared</em> : <em>{s.category}</em>}
        </li>)}</ul>
      </div>
    </div>}
  </article>
}

export function CreateCircleModal({ onClose }: { onClose: () => void }) {
  const platform = usePlatform()
  const [form, setForm] = useState({ name: '', purpose: '', description: '', intents: '' })
  const ready = form.name.trim() && form.purpose.trim()
  return <div className="modal-wrap light-modal-wrap" onMouseDown={onClose}>
    <div className="modal need-modal" onMouseDown={e => e.stopPropagation()}>
      <header><div><Eyebrow>CREATE CIRCLE</Eyebrow><h2>What is this room for?</h2>
        <p>State the purpose precisely. Circles close when their purpose is met.</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button></header>
      <div className="need-form">
        <label><span>01 / Name</span><textarea rows={1} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="AI Operators in Manufacturing" /></label>
        <label><span>02 / Purpose</span><textarea rows={2} value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} placeholder="Get applied AI into plants without another failed pilot." /></label>
        <label><span>03 / Description</span><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Who belongs here and what they trade." /></label>
        <label><span>04 / Shared intents (comma separated)</span><textarea rows={2} value={form.intents} onChange={e => setForm({ ...form, intents: e.target.value })} placeholder="Quoting speed, Inspection automation" /></label>
      </div>
      <footer><Btn kind="quiet" onClick={onClose}>Cancel</Btn>
        <Btn disabled={!ready} onClick={() => {
          platform.createCircle({
            name: form.name.trim(), purpose: form.purpose.trim(),
            description: form.description.trim() || form.purpose.trim(),
            sharedIntents: form.intents.split(',').map(x => x.trim()).filter(Boolean),
          })
          onClose()
        }}>Create circle <ArrowRight size={15} /></Btn></footer>
    </div>
  </div>
}
