import { RotateCcw, X } from 'lucide-react'
import { useMoat } from '../moat-store'
import { Eyebrow, Head } from '../ui'
import type { PrivacyScope } from '../types'

const scopes: PrivacyScope[] = ['private', 'team', 'organization', 'shareable', 'public']

export function ConsentLedgerPage() {
  const moat = useMoat()
  const live = moat.consent.filter(e => !e.revoked)
  const revoked = moat.consent.filter(e => e.revoked)

  return <>
    <Head
      label="RELATIONSHIP CONSENT LEDGER"
      title="Every piece of context, and exactly who has it."
      copy="Aetheris only works if you can see what it knows and take it back. This ledger lists what has been shared, with whom, why, and when — and every entry can be narrowed or revoked."
      proof={`${live.length} active entries · ${revoked.length} revoked · nothing sold, ever`}
    />

    <section className="module ledger">
      <header><div><Eyebrow>ACTIVE CONTEXT</Eyebrow><h3>What is shared right now.</h3></div></header>
      <ul className="ledger-list">
        {live.map(entry => <li key={entry.id}>
          <div className="ledger-main">
            <strong>{entry.item}</strong>
            <p>{entry.detail}</p>
            <small>Source: {entry.sourceType.replace('-', ' ')} · updated {entry.updatedAt}</small>
          </div>
          <div className="ledger-scope">
            {scopes.map(s => <button key={s} className={entry.scope === s ? 'on' : ''} onClick={() => moat.setConsentScope(entry.id, s)}>{s}</button>)}
          </div>
          <ul className="ledger-shares">
            {entry.sharedWith.map(share => <li key={share.id}>
              <span><b>{share.label}</b> <em>{share.kind}</em> — {share.reason} <small>{share.when}</small></span>
              <button className="text-action" onClick={() => moat.revokeShare(entry.id, share.id)}>Revoke access</button>
            </li>)}
            {!entry.sharedWith.length && <li className="quiet-empty">Not shared with anyone.</li>}
          </ul>
          {entry.revocable && <button className="ledger-revoke" onClick={() => moat.revokeConsent(entry.id)}><X size={13} /> Revoke this context entirely</button>}
        </li>)}
      </ul>
    </section>

    {!!revoked.length && <section className="module ledger revoked">
      <header><div><Eyebrow signal>REVOKED</Eyebrow><h3>No longer used by Aetheris.</h3></div></header>
      <ul className="ledger-list">
        {revoked.map(entry => <li key={entry.id}>
          <div className="ledger-main"><strong>{entry.item}</strong><p>{entry.detail}</p></div>
          <button className="text-action" onClick={() => moat.restoreConsent(entry.id)}><RotateCcw size={13} /> Restore</button>
        </li>)}
      </ul>
    </section>}

    <section className="teach-block">
      <div><Eyebrow>THE RULE BEHIND THE PRODUCT</Eyebrow>
        <h2>Context is borrowed, never owned.</h2>
        <p>Introductions here are double opt-in, private notes stay private unless you widen them, and revoking context removes it from matching, capsules, representative answers and future recommendations. Aetheris has no advertising model, so your relationships are never inventory.</p></div>
    </section>
  </>
}
