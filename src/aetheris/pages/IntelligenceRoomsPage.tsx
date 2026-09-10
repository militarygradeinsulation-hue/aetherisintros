import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNetwork } from '../store'
import { usePro } from '../pro-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, memberById } from '../ui'

export function IntelligenceRoomsPage() {
  const net = useNetwork()
  const pro = usePro()
  const nav = useNav()
  const [roomId, setRoomId] = useState(pro.industryRooms[0]?.id ?? '')
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [councilId, setCouncilId] = useState(pro.councils[0]?.id ?? '')
  const [question, setQuestion] = useState('')
  const [reply, setReply] = useState<Record<string, string>>({})

  const room = pro.industryRooms.find(r => r.id === roomId) ?? pro.industryRooms[0]
  const items = pro.intelligence.filter(i => i.roomId === room?.id)
  const council = pro.councils.find(c => c.id === councilId) ?? pro.councils[0]

  return <>
    <Head
      label="INDUSTRY INTELLIGENCE AND COUNCILS"
      title="What is actually happening, from the people it is happening to."
      copy="Rooms carry field observations, open questions, emerging decisions and people worth knowing — every item labelled firsthand, evidence-backed, derived or opinion. Councils are small, private and confidential: peers at the same altitude working on the same decisions."
      proof={`${pro.industryRooms.filter(r => r.joined).length} rooms joined · ${pro.councils.filter(c => c.joined).length} councils · no engagement metrics anywhere`}
      action={<Btn kind="secondary" onClick={() => nav.setPage('knowledgeassets')}>Knowledge assets <ArrowRight size={13} /></Btn>}
    />

    <div className="filter-chips">
      {pro.industryRooms.map(r => <button key={r.id} className={`chip ${room?.id === r.id ? 'on' : ''}`} onClick={() => setRoomId(r.id)}>{r.name}</button>)}
    </div>

    {room && <section className="room-layout">
      <article className="module room-main">
        <header>
          <div><Eyebrow>{room.industry.toUpperCase()}</Eyebrow><h3>{room.name}</h3><small>{room.premise}</small></div>
          <Btn kind={room.joined ? 'secondary' : 'primary'} onClick={() => pro.toggleRoom(room.id)}>{room.joined ? 'Leave room' : 'Join room'}</Btn>
        </header>
        <p className="room-charter"><b>Charter.</b> {room.charter}</p>

        <div className="room-post">
          <label>Post a field observation
            <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="What you saw, in one line" />
          </label>
          <label>What you actually observed, and how you know it
            <textarea rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder="Firsthand detail beats opinion here." />
          </label>
          <Btn disabled={headline.trim().length < 8 || body.trim().length < 20} onClick={() => {
            pro.postIntelligence({
              roomId: room.id, kind: 'Field observation', headline: headline.trim(), body: body.trim(),
              provenance: 'Firsthand', evidence: 'Observed directly by you.', relatedIds: [], scope: 'shareable',
            })
            setHeadline(''); setBody('')
          }}>Post to the room</Btn>
        </div>

        <div className="room-items">
          {items.map(item => {
            const author = memberById(net.members, item.authorId)
            return <div key={item.id} className="room-item">
              <header>
                <div><Eyebrow>{item.kind.toUpperCase()}</Eyebrow><strong>{item.headline}</strong></div>
                <span className={`prov-tag ${item.provenance.toLowerCase().replace(/\s/g, '-')}`}>{item.provenance}</span>
              </header>
              <p>{item.body}</p>
              <footer>
                <small>{author?.name ?? 'You'} · {item.when}</small>
                <small><b>Evidence.</b> {item.evidence}</small>
                {author && author.id !== 'me' && <button className="text-action" onClick={() => nav.openMember(author)}>Open profile</button>}
              </footer>
            </div>
          })}
          {!items.length && <p className="empty-state">Nothing posted here yet. A single firsthand observation is worth more than ten opinions.</p>}
        </div>
      </article>

      <aside className="room-rail">
        <div className="module">
          <Eyebrow>IN THIS ROOM</Eyebrow>
          {room.memberIds.slice(0, 6).map(id => {
            const m = memberById(net.members, id)
            if (!m) return <p key={id} className="room-you">You</p>
            return <button key={id} className="room-member" onClick={() => nav.openMember(m)}>
              <Face person={m} /><span><strong>{m.name}</strong><small>{m.title}</small></span>
            </button>
          })}
        </div>
        <div className="module">
          <Eyebrow>HOW PROVENANCE WORKS</Eyebrow>
          <p>Every item is labelled at the source. Firsthand means the author was there. Evidence-backed means a document or record supports it. Derived means Aetheris inferred it. Opinion is honest opinion, and is never treated as fact by matching.</p>
        </div>
      </aside>
    </section>}

    <section className="council-section">
      <Head
        label="PRIVATE PEER COUNCILS"
        title="Small, confidential, and made of people who cannot say this anywhere else."
        copy="Formed on level, industry, geography, problem or objective. Aetheris shows what expertise the group is missing and who could fill it."
      />
      <div className="filter-chips">
        {pro.councils.map(c => <button key={c.id} className={`chip ${council?.id === c.id ? 'on' : ''}`} onClick={() => setCouncilId(c.id)}>{c.name}</button>)}
      </div>

      {council && <article className="module council-card">
        <header>
          <div><Eyebrow>{council.basis.toUpperCase()} COUNCIL · {council.cadence.toUpperCase()}</Eyebrow>
            <h3>{council.name}</h3><small>{council.purpose}</small></div>
          <Btn kind={council.joined ? 'secondary' : 'primary'} onClick={() => pro.toggleCouncil(council.id)}>{council.joined ? 'Member' : 'Request a seat'}</Btn>
        </header>
        <p className="room-charter"><b>Confidentiality.</b> {council.confidentiality}</p>
        <p><b>Charter.</b> {council.charter}</p>

        {!!council.missingExpertise.length && <p className="council-missing"><b>Missing expertise.</b> {council.missingExpertise.join(' · ')}</p>}

        <div className="council-members">
          {council.memberIds.map(id => {
            const m = memberById(net.members, id)
            return m ? <button key={id} className="room-member" onClick={() => nav.openMember(m)}><Face person={m} /><span><strong>{m.name}</strong><small>{m.title}</small></span></button> : <span key={id} className="room-you">You</span>
          })}
        </div>

        <div className="room-post">
          <label>Bring a question to the council
            <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="The thing you cannot ask publicly" />
          </label>
          <Btn disabled={question.trim().length < 10} onClick={() => { pro.askCouncil(council.id, question.trim()); setQuestion('') }}>Ask the council</Btn>
        </div>

        {council.sharedQuestions.map(q => <div key={q.id} className="council-question">
          <p><b>{q.question}</b><small>{memberById(net.members, q.memberId)?.name ?? 'You'} · {q.when}</small></p>
          {q.responses.map((r, i) => <p key={i} className="council-response">{memberById(net.members, r.memberId)?.name ?? 'You'}: {r.text}</p>)}
          <div className="deal-answer-form">
            <input value={reply[q.id] ?? ''} onChange={e => setReply({ ...reply, [q.id]: e.target.value })} placeholder="Answer from experience" />
            <Btn kind="secondary" disabled={(reply[q.id] ?? '').trim().length < 6} onClick={() => { pro.respondToCouncil(council.id, q.id, (reply[q.id] ?? '').trim()); setReply({ ...reply, [q.id]: '' }) }}>Respond</Btn>
          </div>
        </div>)}

        {!!council.decisions.length && <div className="deal-block">
          <Eyebrow>DECISIONS THIS COUNCIL HELPED MAKE</Eyebrow>
          {council.decisions.map(d => <p key={d.id}><b>{d.when}</b> {d.record}</p>)}
        </div>}
      </article>}
    </section>

    <section className="teach-block">
      <div><Eyebrow>WHY THERE ARE NO LIKES IN HERE</Eyebrow>
        <h2>Nothing in these rooms rewards volume.</h2>
        <p>There are no follower counts, no reach metrics and no engagement scoring. Value comes from provenance and from whether an item changed a decision. Councils stay small on purpose: confidentiality only holds when the group is small enough to trust.</p>
        <button className="text-action" onClick={() => nav.setPage('briefing')}>See today&rsquo;s briefing <ArrowRight size={14} /></button></div>
    </section>
  </>
}
