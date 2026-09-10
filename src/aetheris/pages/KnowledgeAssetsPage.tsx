import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNetwork } from '../store'
import { usePro } from '../pro-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, memberById } from '../ui'

export function KnowledgeAssetsPage() {
  const net = useNetwork()
  const pro = usePro()
  const nav = useNav()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState('')
  const [revision, setRevision] = useState<Record<string, string>>({})
  const [note, setNote] = useState<Record<string, string>>({})

  return <>
    <Head
      label="KNOWLEDGE AND HUMAN REVIEW"
      title="What you know is an asset. It should keep your name on it."
      copy="Frameworks, playbooks, research, field notes and lessons from execution — versioned, attributed, connected to the systems and outcomes they came from, and never harvested into anonymous content. When something consequential is at stake, a real person reviews it before anyone is introduced."
      proof={`${pro.knowledgeAssets.length} assets · ${pro.concierge.length} human reviews on record · attribution never gets stripped`}
      action={<Btn kind="secondary" onClick={() => nav.setPage('intelrooms')}>Industry rooms <ArrowRight size={13} /></Btn>}
    />

    <section className="module knowledge-publish">
      <Eyebrow>PUBLISH A KNOWLEDGE ASSET</Eyebrow>
      <label>Title
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="How we cut second-shift variance without new equipment" />
      </label>
      <label>One-sentence summary
        <input value={summary} onChange={e => setSummary(e.target.value)} placeholder="What a reader gets, in one line" />
      </label>
      <label>The substance
        <textarea rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="Written from execution, not from theory." />
      </label>
      <Btn disabled={title.trim().length < 8 || summary.trim().length < 12 || body.trim().length < 40} onClick={() => {
        pro.publishKnowledge({
          title: title.trim(), summary: summary.trim(), body: body.trim(),
          industries: net.profile.industries ?? [], provenance: 'Firsthand',
          evidence: 'Written from your own execution.',
        })
        setTitle(''); setSummary(''); setBody('')
      }}>Publish with your name on it</Btn>
    </section>

    <section className="knowledge-list">
      {pro.knowledgeAssets.map(k => {
        const author = memberById(net.members, k.authorId)
        return <article key={k.id} className="module knowledge-card">
          <header>
            <div>{author && <Face person={author} />}
              <div><Eyebrow>{k.kind.toUpperCase()} · {k.provenance.toUpperCase()}</Eyebrow>
                <h3>{k.title}</h3>
                <small>{author?.name ?? 'You'} · updated {k.updatedAt}{k.contributorIds.length ? ` · ${k.contributorIds.length} contributor${k.contributorIds.length === 1 ? '' : 's'}` : ''}</small></div></div>
          </header>
          <p className="knowledge-summary">{k.summary}</p>
          <p>{k.body}</p>
          <p className="opp-evidence"><b>Evidence.</b> {k.evidence}</p>
          <div className="knowledge-meta">
            {!!k.industries.length && <span className="scope-tag">{k.industries.join(' · ')}</span>}
            <span className="scope-tag">For {k.audience}</span>
            {!!k.systemIds.length && <span className="scope-tag">Connected to {k.systemIds.length} system{k.systemIds.length === 1 ? '' : 's'}</span>}
            {!!k.outcomeIds.length && <span className="scope-tag">Linked to {k.outcomeIds.length} outcome{k.outcomeIds.length === 1 ? '' : 's'}</span>}
          </div>
          {!!k.revisions.length && <div className="deal-block">
            <Eyebrow>VERSION HISTORY</Eyebrow>
            {k.revisions.map(r => <p key={r.id}><b>{r.when}</b> {r.note}</p>)}
          </div>}
          <footer className="opp-foot">
            {author && author.id !== 'me' && <Btn kind="secondary" onClick={() => nav.messageMember(author.id)}>Ask the author</Btn>}
            {k.authorId === 'me' && <div className="deal-answer-form">
              <input value={revision[k.id] ?? ''} onChange={e => setRevision({ ...revision, [k.id]: e.target.value })} placeholder="What changed in this revision" />
              <Btn kind="quiet" disabled={(revision[k.id] ?? '').trim().length < 6} onClick={() => { pro.reviseKnowledge(k.id, (revision[k.id] ?? '').trim()); setRevision({ ...revision, [k.id]: '' }) }}>Record revision</Btn>
            </div>}
          </footer>
        </article>
      })}
    </section>

    <section className="concierge-section">
      <Head
        label="HUMAN INTRODUCTION CONCIERGE"
        title="For the consequential ones, a person reads it first."
        copy="Acquisitions, capital, board seats and sensitive introductions can be escalated to human review. The reviewer sees only what is needed, never the whole file, and the wording is prepared before anyone is approached."
      />
      {pro.concierge.map(c => <article key={c.id} className="module concierge-card">
        <header>
          <div><Eyebrow>{c.kind.toUpperCase()} · {c.state.toUpperCase()}</Eyebrow><h3>{c.subject}</h3>
            <small>Reviewer: {c.reviewerRole} · updated {c.updatedAt}</small></div>
        </header>
        <p><b>Decision requested.</b> {c.decisionRequested}</p>
        <div className="concierge-scope">
          <div><Eyebrow>REVIEWER CAN SEE</Eyebrow><ul>{c.visibleToReviewer.map(v => <li key={v}>{v}</li>)}</ul></div>
          <div><Eyebrow>WITHHELD FROM REVIEWER</Eyebrow><ul>{c.withheldFromReviewer.map(v => <li key={v}>{v}</li>)}</ul></div>
        </div>
        <p className="concierge-wording"><b>Prepared wording.</b> {c.preparedWording}</p>
        {c.reviewerNote && <p className="why-intros"><span><b>Reviewer note.</b> {c.reviewerNote}</span></p>}
        <footer className="opp-foot">
          {c.state !== 'Approved to Introduce' && c.state !== 'Completed' && <>
            <Btn onClick={() => pro.setConciergeState(c.id, 'Approved to Introduce', 'Approved after reading the prepared wording.')}>Approve the introduction</Btn>
            <div className="deal-answer-form">
              <input value={note[c.id] ?? ''} onChange={e => setNote({ ...note, [c.id]: e.target.value })} placeholder="What context is still missing" />
              <Btn kind="secondary" disabled={(note[c.id] ?? '').trim().length < 6} onClick={() => { pro.setConciergeState(c.id, 'Needs More Context', (note[c.id] ?? '').trim()); setNote({ ...note, [c.id]: '' }) }}>Needs more context</Btn>
            </div>
            <Btn kind="quiet" onClick={() => pro.setConciergeState(c.id, 'Declined', 'Declined at review. No approach was made.')}>Decline</Btn>
          </>}
          {c.state === 'Approved to Introduce' && <Btn kind="secondary" onClick={() => pro.setConciergeState(c.id, 'Completed')}>Mark completed</Btn>}
        </footer>
      </article>)}
    </section>

    <section className="teach-block">
      <div><Eyebrow>WHY ATTRIBUTION IS NOT OPTIONAL</Eyebrow>
        <h2>Nothing here becomes anonymous content in someone else&rsquo;s feed.</h2>
        <p>Every asset keeps its author, its contributors, its provenance and its version history, and stays connected to the systems and outcomes it came from. Human review exists because the highest-stakes introductions deserve judgement, not automation — and the reviewer only ever sees the part of the file the decision needs.</p>
        <button className="text-action" onClick={() => nav.setPage('attribution')}>See outcome attribution <ArrowRight size={14} /></button></div>
    </section>
  </>
}
