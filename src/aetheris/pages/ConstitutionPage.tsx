import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useMoat } from '../moat-store'
import { Btn, Eyebrow, Head } from '../ui'
import { useOutreachGate } from '../moat-ui'

export function ConstitutionPage() {
  const moat = useMoat()
  const { gate, modal } = useOutreachGate()
  const [test, setTest] = useState('Hi there, hope this finds you well — I wanted to reach out to see if you would be open to a quick call about our platform. Exciting opportunity, guaranteed results.')
  const strikes = moat.strikes[0]

  return <>
    <Head
      label="NETWORK CONSTITUTION"
      title="The rules that keep this network worth answering."
      copy="Aetheris protects members from promotional noise the way a good room does: by making relevance, consent and specificity the price of entry. These principles are enforced on outbound contact, not on conversation."
      proof="No paid placement · no promoted profiles · no purchased introductions"
    />

    <section className="constitution-grid">
      {moat.constitution.map(rule => <article key={rule.id} className={`module constitution-card ${rule.active ? '' : 'off'}`}>
        <header>
          <div><Eyebrow>{rule.principle.toUpperCase()}</Eyebrow><h3>{rule.title}</h3></div>
          <button className={`switch ${rule.active ? 'on' : ''}`} onClick={() => moat.toggleRule(rule.id)} aria-label={`Toggle ${rule.title}`}><i /></button>
        </header>
        <p>{rule.rule}</p>
        <p className="constitution-why"><b>Why.</b> {rule.why}</p>
        <footer><span>{rule.enforcement === 'block' ? 'Blocked before sending' : rule.enforcement === 'review' ? 'Held for review' : 'Coached before sending'}</span></footer>
      </article>)}
    </section>

    <section className="module constitution-test">
      <header><div><Eyebrow signal>ANTI-SPAM ENGINE</Eyebrow><h3>Try it on a bad message.</h3></div></header>
      <textarea rows={4} value={test} onChange={e => setTest(e.target.value)} />
      <Btn onClick={() => gate(test, { channel: 'message', authorId: 'me' }, () => undefined)}>Run the quality review</Btn>
      <p className="constitution-note">Normal professional conversation passes untouched. The engine looks for vague pitch language, copy-paste outreach, unsolicited selling, irrelevant asks, excessive frequency, missing mutual value and contact after a decline.</p>
    </section>

    <section className="module constitution-private">
      <header><div><Eyebrow>PRIVATE ENFORCEMENT</Eyebrow><h3>No public reputation scores. Ever.</h3></div></header>
      <p><ShieldCheck size={14} /> {strikes ? `${strikes.strikes} flagged attempt${strikes.strikes === 1 ? '' : 's'} on record. ${strikes.privateNote}` : 'Nothing on record.'}</p>
      <p className="constitution-note">Aetheris tracks flagged outreach privately so the system can protect members. It is never shown to another member, never ranked, and never sold.</p>
    </section>
    {modal}
  </>
}
