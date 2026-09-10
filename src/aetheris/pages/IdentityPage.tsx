import { useState } from 'react'
import { Copy, Link2 } from 'lucide-react'
import { useMoat } from '../moat-store'
import { useNetwork } from '../store'
import { Btn, Eyebrow, Head } from '../ui'
import { AvailabilityWindows, PassportModule } from '../moat-ui'

const shareToggles = [
  ['shareIdentity', 'Identity', 'Name, headline and current role.'],
  ['sharePassport', 'Verified passport', 'Only claims already verified by evidence or references.'],
  ['shareIntents', 'What I am moving', 'Current intents, stated plainly.'],
  ['shareCanHelp', 'What I can help with', 'Where you are genuinely useful.'],
  ['shareSystems', 'Systems I share', 'Playbooks and systems you are willing to hand over.'],
  ['shareCircles', 'Circles I am part of', 'Rooms you belong to, not their private contents.'],
  ['shareAvailability', 'Introduction availability', 'Windows and the context you require.'],
] as const

export function IdentityPage() {
  const moat = useMoat()
  const net = useNetwork()
  const identity = moat.identity[0]
  const policy = moat.representative[0]
  const [copied, setCopied] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [context, setContext] = useState('')
  if (!identity) return <Head label="PORTABLE IDENTITY" title="No identity configured yet." copy="Complete your profile to publish a portable relationship identity." />
  const link = `intros.today/${identity.slug}`

  return <>
    <Head
      label="PORTABLE RELATIONSHIP IDENTITY"
      title="One link that explains you properly."
      copy="Your relationship identity travels: it works for people who are not members yet, shows only what you have chosen to share, and lets someone reach you with real context instead of a cold pitch."
      proof="You control every field · nothing is shared by default"
    />

    <div className="identity-grid">
      <section className="module identity-link">
        <header><div><Eyebrow>YOUR LINK</Eyebrow><h3>{identity.headline}</h3></div></header>
        <p className="identity-url"><Link2 size={14} /> {link}
          <button className="text-action" onClick={() => { navigator.clipboard?.writeText(`https://${link}`); setCopied(true) }}>
            <Copy size={13} /> {copied ? 'Copied' : 'Copy'}</button></p>
        <label className="identity-style">
          <span>How you prefer to be introduced</span>
          <textarea rows={3} value={identity.introStyle} onChange={e => moat.updateIdentity({ introStyle: e.target.value })} />
        </label>
        <div className="identity-visibility">
          <span>VISIBILITY</span>
          {(['private', 'network', 'public'] as const).map(v =>
            <button key={v} className={identity.visibility === v ? 'on' : ''} onClick={() => moat.updateIdentity({ visibility: v })}>{v}</button>)}
        </div>
        <label className="identity-requests">
          <input type="checkbox" checked={identity.requestsEnabled} onChange={e => moat.updateIdentity({ requestsEnabled: e.target.checked })} />
          <span>Allow non-members to request a connection or an introduction through this link</span>
        </label>
      </section>

      <section className="module identity-share">
        <header><div><Eyebrow>WHAT THE LINK SHOWS</Eyebrow><h3>Decide field by field.</h3></div></header>
        <ul className="identity-toggles">
          {shareToggles.map(([key, label, note]) => <li key={key}>
            <button className={`switch ${identity[key] ? 'on' : ''}`} onClick={() => moat.updateIdentity({ [key]: !identity[key] } as never)} aria-label={`Toggle ${label}`}><i /></button>
            <div><strong>{label}</strong><small>{note}</small></div>
          </li>)}
        </ul>
      </section>
    </div>

    <section className="module identity-requests-list">
      <header><div><Eyebrow signal>INBOUND FROM YOUR LINK</Eyebrow><h3>{identity.requests.filter(r => r.status === 'new').length} waiting</h3></div></header>
      <ul>
        {identity.requests.map(r => <li key={r.id} className={r.status}>
          <div><strong>{r.name}</strong><small>{r.email} · {r.kind} · {r.when}</small><p>{r.context}</p></div>
          {r.status === 'new'
            ? <div className="request-actions">
              <Btn kind="secondary" onClick={() => moat.setIdentityRequest(r.id, 'accepted')}>Accept</Btn>
              <Btn kind="quiet" onClick={() => moat.setIdentityRequest(r.id, 'declined')}>Decline</Btn></div>
            : <span className="request-state">{r.status}</span>}
        </li>)}
        {!identity.requests.length && <li className="quiet-empty">No requests yet.</li>}
      </ul>
      <div className="identity-simulate">
        <Eyebrow>SIMULATE AN INBOUND REQUEST</Eyebrow>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Their name" />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Their email" />
        <input value={context} onChange={e => setContext(e.target.value)} placeholder="Why they are reaching out" />
        <Btn kind="secondary" onClick={() => {
          if (name.trim() && context.trim()) { moat.addIdentityRequest({ name: name.trim(), email: email.trim(), context: context.trim(), kind: 'connect' }); setName(''); setEmail(''); setContext('') }
        }}>Add request</Btn>
      </div>
    </section>

    <PassportModule memberId={net.profile.id ?? 'me'} />
    <AvailabilityWindows memberId="me" />

    {policy && <section className="module rep-policy">
      <header><div><Eyebrow>DIGITAL REPRESENTATIVE</Eyebrow><h3>It speaks from approved context only.</h3></div>
        <button className={`switch ${policy.enabled ? 'on' : ''}`} onClick={() => moat.updateRepresentative({ enabled: !policy.enabled })} aria-label="Toggle representative"><i /></button></header>
      <p>{policy.handoffNote}</p>
      <div className="rep-columns">
        <div><Eyebrow>PERMITTED TOPICS</Eyebrow><ul>{policy.allowedTopics.map(t => <li key={t}>{t}</li>)}</ul></div>
        <div><Eyebrow signal>NEVER DISCUSSED</Eyebrow><ul>{policy.blockedTopics.map(t => <li key={t}>{t}</li>)}</ul></div>
        <div><Eyebrow>AUTHORITY LIMITS</Eyebrow><ul>{policy.authorityLimits.map(t => <li key={t}>{t}</li>)}</ul></div>
      </div>
      <p className="rep-note">It always identifies itself as a representative, never as you. It cannot commit, price, or book anything.</p>
      {!!policy.transcript.length && <ul className="rep-transcript">
        {policy.transcript.map(t => <li key={t.id}><b>{t.from}</b> asked “{t.question}”<em>{t.answer}</em>
          <small>{t.permitted ? 'Answered from approved context' : 'Refused'}{t.handedOff ? ' · handed to you' : ''}</small></li>)}
      </ul>}
    </section>}
  </>
}
