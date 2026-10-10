import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNetwork } from '../store'
import { usePro } from '../pro-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Head, memberById } from '../ui'
import type { SearchCorpusItem } from '../domain/pro-engine'
import type { Page } from '../nav'

const routable = new Set<string>(['opportunities', 'dealrooms', 'deals', 'expertise', 'talent', 'capital', 'intelrooms', 'presence', 'permission', 'knowledgeassets', 'discover', 'companies', 'systems', 'circles'])

/** Real browser download of the generated export. */
function download(fileName: string, content: string, format: 'json' | 'csv') {
  if (typeof document === 'undefined') return
  const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function VaultPage() {
  const net = useNetwork()
  const pro = usePro()
  const nav = useNav()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'everything' | 'relationships' | 'memory' | 'opportunities' | 'proof'>('everything')
  const [format, setFormat] = useState<'json' | 'csv'>('json')
  const [preview, setPreview] = useState<string | null>(null)

  const corpus = useMemo<SearchCorpusItem[]>(() => [
    ...net.members.map(m => ({
      id: m.id, kind: 'Person' as const, label: m.name, sub: `${m.title} · ${m.company}`,
      text: `${m.industry} ${m.expertise.join(' ')} ${m.offers.join(' ')} ${m.needs.join(' ')} ${m.location}`,
      memberId: m.id, scope: 'shareable' as const,
    })),
    ...pro.opportunities.map(o => ({
      id: o.id, kind: 'Opportunity' as const, label: o.title, sub: o.kind,
      text: `${o.objective} ${o.whoItIsFor} ${o.qualification.join(' ')}`,
      targetPage: 'opportunities', targetId: o.id,
      scope: o.confidential ? ('private' as const) : ('shareable' as const),
      ...(o.confidential ? { blockedBy: 'details stay hidden until both sides agree to proceed' } : {}),
    })),
    ...pro.expertise.map(e => ({
      id: e.id, kind: 'Expertise' as const, label: e.topic, sub: `${e.format} · ${e.terms}`,
      text: `${e.offer} ${e.industries.join(' ')} ${e.audience}`, targetPage: 'expertise', targetId: e.id, scope: 'shareable' as const,
    })),
    ...pro.proofNodes.map(n => ({
      id: n.id, kind: 'Proof of work' as const, label: n.label, sub: `${n.kind} · ${n.role}`,
      text: `${n.contribution} ${n.evidence}`, scope: n.provenance.scope,
    })),
    ...pro.knowledgeAssets.map(k => ({
      id: k.id, kind: 'Knowledge' as const, label: k.title, sub: k.kind,
      text: `${k.summary} ${k.body} ${k.industries.join(' ')}`, targetPage: 'knowledgeassets', targetId: k.id, scope: 'shareable' as const,
    })),
    ...pro.problems.map(p => ({
      id: p.id, kind: 'Talent problem' as const, label: p.title, sub: p.kind,
      text: `${p.problem} ${p.industries.join(' ')}`, targetPage: 'talent', targetId: p.id, scope: 'shareable' as const,
    })),
    ...pro.boardIntents.map(b => ({
      id: b.id, kind: 'Board seat' as const, label: b.side === 'company' ? `${b.sector} board seat` : 'Board experience offered',
      sub: b.cadence, text: `${b.expertiseNeeded.join(' ')} ${b.expertiseOffered.join(' ')} ${b.sector}`,
      targetPage: 'capital', targetId: b.id, scope: 'shareable' as const,
    })),
    ...pro.industryRooms.map(r => ({
      id: r.id, kind: 'Room' as const, label: r.name, sub: r.industry,
      text: `${r.premise} ${r.charter}`, targetPage: 'intelrooms', targetId: r.id, scope: 'shareable' as const,
    })),
  ], [net.members, pro.opportunities, pro.expertise, pro.proofNodes, pro.knowledgeAssets, pro.problems, pro.boardIntents, pro.industryRooms])

  const results = pro.search(query, corpus)

  const rowsFor = (s: typeof scope): Array<Record<string, unknown>> => {
    if (s === 'relationships') return net.connections.map(id => {
      const m = memberById(net.members, id)
      return { id, name: m?.name ?? id, title: m?.title ?? '', company: m?.company ?? '', relationship: 'connection' }
    })
    if (s === 'memory') return net.notes.map(n => ({ id: n.id, person: n.personId, text: n.text, scope: n.scope }))
    if (s === 'opportunities') return pro.opportunities.map(o => ({ id: o.id, title: o.title, kind: o.kind, status: o.status, expiresOn: o.expiresOn }))
    if (s === 'proof') return pro.proofNodes.map(n => ({ id: n.id, label: n.label, kind: n.kind, role: n.role, evidence: n.evidence, state: n.state }))
    return [
      ...net.connections.map(id => ({ type: 'relationship', id, name: memberById(net.members, id)?.name ?? id })),
      ...net.notes.map(n => ({ type: 'memory', id: n.id, text: n.text, scope: n.scope })),
      ...pro.opportunities.map(o => ({ type: 'opportunity', id: o.id, title: o.title, status: o.status })),
      ...pro.proofNodes.map(n => ({ type: 'proof', id: n.id, label: n.label, evidence: n.evidence })),
    ]
  }

  return <>
    <Head
      label="SEARCH, IMPORT AND YOUR VAULT"
      title="One search across everything you are permissioned to see."
      copy="People, companies, systems, opportunities, proof of work, expertise, board seats, knowledge and rooms — one query, ranked by relevance and relationship path, with the reason attached. Where something is withheld, Aetheris says that it exists and why you cannot see it."
      proof={`${corpus.length} permissioned objects searchable · ${pro.imports.filter(i => i.connected).length} sources connected · export is always available`}
      action={<Btn kind="secondary" onClick={() => nav.setPage('consent')}>Consent ledger <ArrowRight size={13} /></Btn>}
    />

    <section className="module universal-search">
      <Eyebrow>UNIVERSAL PROFESSIONAL SEARCH</Eyebrow>
      <input className="universal-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Try: manufacturing operations, second shift, distribution partner, board seat" />
      <div className="search-results">
        {results.map(r => <div key={`${r.kind}-${r.id}`} className="search-result">
          <div>
            <Eyebrow>{r.kind.toUpperCase()}</Eyebrow>
            <strong>{r.label}</strong><small>{r.sub}</small>
            <em>{r.why}</em>
          </div>
          <div className="team-role-actions">
            {r.memberId && <button className="text-action" onClick={() => { const m = memberById(net.members, r.memberId!); if (m) nav.openMember(m) }}>Open profile</button>}
            {r.targetPage && routable.has(r.targetPage) && <button className="text-action" onClick={() => nav.setPage(r.targetPage as Page)}>Open</button>}
          </div>
        </div>)}
        {!!query.trim() && !results.length && <p className="empty-state">Nothing you are permissioned to see matches that. Try the words a practitioner would use.</p>}
      </div>
    </section>

    <section className="vault-grid">
      <article className="module import-block">
        <Eyebrow>IMPORT WITHOUT LOCK-IN</Eyebrow>
        <h3>Bring your relationships in. Take them out whenever you like.</h3>
        <p className="availability-copy">Nothing is imported silently. Every source produces proposals you review one by one, with a default privacy scope and where the information came from. Only what you approve is committed, and removing a source withdraws everything that arrived with it.</p>
        {pro.imports.map(b => {
          const proposals = pro.importProposals.filter(p => p.batchId === b.id)
          const approved = proposals.filter(p => p.accepted === true).length
          return <div key={b.id} className={`import-row ${b.state}`}>
            <div>
              <strong>{b.source}</strong>
              <small>{b.fileName ? `${b.fileName} · ` : ''}{b.rowCount} record{b.rowCount === 1 ? '' : 's'} · {b.state.replace('-', ' ')}</small>
              <em>{b.note}</em>
              {b.state === 'reviewing' && <div className="import-proposals">
                <Eyebrow>PROPOSED RECORDS · {approved} of {proposals.length} approved</Eyebrow>
                {proposals.map(p => <div key={p.id} className={`import-proposal ${p.accepted === true ? 'on' : p.accepted === false ? 'off' : ''}`}>
                  <div>
                    <span className="scope-tag">{p.kind} · {p.action}</span>
                    <strong>{p.label}</strong>
                    <small>{p.detail}</small>
                    <em>From {p.provenance} · default privacy {p.defaultScope}</em>
                  </div>
                  <div className="team-role-actions">
                    <button className="text-action" onClick={() => pro.setProposalAccepted(p.id, true)}>Approve</button>
                    <button className="text-action" onClick={() => pro.setProposalAccepted(p.id, false)}>Reject</button>
                    {p.accepted !== undefined && <span className="req-state">{p.accepted ? 'approved' : 'rejected'}</span>}
                  </div>
                </div>)}
                {!proposals.length && <p className="empty-state">This source produced no proposals.</p>}
              </div>}
            </div>
            <div className="team-role-actions">
              {b.state === 'available' && <Btn kind="secondary" onClick={() => pro.setImportState(b.id, 'reviewing')}>Review proposals</Btn>}
              {b.state === 'reviewing' && <Btn disabled={!approved} onClick={() => pro.commitImport(b.id)}>Commit {approved} approved</Btn>}
              {b.state === 'committed' && <Btn kind="quiet" onClick={() => pro.removeImportSource(b.id)}>Remove this source</Btn>}
              {b.state === 'not-connected' && <span className="scope-tag">Not connected</span>}
              {b.state === 'removed' && <Btn kind="quiet" onClick={() => pro.setImportState(b.id, 'available')}>Reconnect</Btn>}
            </div>
          </div>
        })}
      </article>

      <article className="module vault-block">
        <Eyebrow>YOUR RELATIONSHIP VAULT</Eyebrow>
        <h3>Your relationships are yours. Leaving is not a punishment.</h3>
        <div className="vault-controls">
          <label>What to export
            <select value={scope} onChange={e => setScope(e.target.value as typeof scope)}>
              {(['everything', 'relationships', 'memory', 'opportunities', 'proof'] as const).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>Format
            <select value={format} onChange={e => setFormat(e.target.value as 'json' | 'csv')}>
              <option value="json">JSON</option><option value="csv">CSV</option>
            </select>
          </label>
          <Btn kind="secondary" onClick={() => {
            const rows = rowsFor(scope)
            const { content } = pro.exportVault({ scope, format, includes: [scope], rows })
            setPreview(content.slice(0, 4000))
          }}>Preview export</Btn>
          <Btn onClick={() => {
            const rows = rowsFor(scope)
            const { record, content } = pro.exportVault({ scope, format, includes: [scope], rows })
            setPreview(content.slice(0, 4000))
            download(record.fileName, content, format)
          }}>Download {format.toUpperCase()}</Btn>
        </div>
        {preview !== null && <pre className="vault-preview">{preview || 'Nothing recorded in this scope yet.'}</pre>}
        {!!pro.vaultExports.length && <div className="deal-block">
          <Eyebrow>EXPORT HISTORY</Eyebrow>
          {pro.vaultExports.map(v => <p key={v.id}>{v.requestedAt} · {v.fileName} · {v.rowCount} record{v.rowCount === 1 ? '' : 's'}</p>)}
        </div>}
      </article>
    </section>

    <section className="teach-block">
      <div><Eyebrow>WHY LOCK-IN WOULD BREAK THE PROMISE</Eyebrow>
        <h2>A network you cannot leave is not a network you can trust.</h2>
        <p>Search only ever returns what you are permissioned to see, and says plainly when something exists but is withheld. Imports are reviewed, not absorbed. Export is one click and includes the memory and reasoning you contributed — because that work belongs to you.</p>
        <button className="text-action" onClick={() => nav.setPage('identity')}>Portable professional identity <ArrowRight size={14} /></button></div>
    </section>
  </>
}
