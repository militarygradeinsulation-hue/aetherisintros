/**
 * The one Capability Workspace: every outcome verb (Diagnose, Trace cause, Model impact…)
 * opens here — right-side sheet on desktop, full-height sheet on mobile.
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, ChevronDown, CircleDot, Globe, Link2, RotateCcw, ShieldCheck, X } from 'lucide-react'

import { Btn, Eyebrow } from '../ui'
import { useOps } from '../crm/store'
import {
  decideProposal, getRunDetail, listSubjectRuns, rememberOutcome, resolveFinding, startCapabilityRun, verifyFindingOutcome,
} from '@/lib/capabilities.functions'
import { CAPABILITIES, describe } from './registry'
import { formatMoney, normalizeExposure } from './finance'
import { EnrichPanel } from './EnrichPanel'
import { RouteToNetwork } from './RouteToNetwork'
import { ENRICH_CAPABILITY_ID } from './enrichment'
import { findingsChanged, getActiveSubject, type OpenRequest } from './store'
import type { EntityRef, FindingRow, ProposalRow, ProviderReport, RunDetail, RunStatus, RunSummary } from './types'

const LIFECYCLE_BASE: RunStatus[] = ['requested', 'context_built', 'running', 'result_ready', 'proposals_ready', 'needs_approval', 'applied', 'closed']
const LIFECYCLE_ENRICH: RunStatus[] = ['requested', 'context_built', 'needs_input', 'result_ready', 'proposals_ready', 'needs_approval', 'applied']
const statusLabel: Record<RunStatus, string> = {
  requested: 'Requested', context_built: 'Context built', running: 'Running', needs_input: 'Needs input', result_ready: 'Result ready',
  proposals_ready: 'Actions ready', needs_approval: 'Needs approval', applied: 'Applied', closed: 'Closed',
  cancelled: 'Cancelled', failed: 'Failed', partial: 'Partial result', unavailable: 'Unavailable',
}
const classLabel: Record<string, string> = {
  verified_loss: 'Verified loss', attributed_loss: 'Attributed loss', estimated_exposure: 'Estimated exposure',
  opportunity_value: 'Opportunity value', risk_exposure: 'Risk exposure',
}
const kindLabel: Record<string, string> = { leak: 'Revenue leak', risk: 'Risk', gap: 'Gap', unknown: 'Unknown worth checking', pattern: 'Public signal', competitive: 'Competitive', opportunity: 'Opportunity' }
const tierCopy = { light: 'Light — reads your own records only.', medium: 'Medium — adds a few public web lookups.', heavy: 'Heavy — extended research.' }

function domainOf(website: string, domain: string) {
  const raw = (domain || website || '').trim().toLowerCase()
  const host = raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0] ?? ''
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null
}

export function CapabilityWorkspaceHost() {
  const [req, setReq] = useState<OpenRequest | null>(null)
  useEffect(() => {
    const open = (e: Event) => {
      const detail = (e as CustomEvent<OpenRequest>).detail
      const a = getActiveSubject()
      setReq({ ...detail, subject: detail.subject ?? a?.ref, subjectLabel: detail.subjectLabel ?? a?.label })
    }
    window.addEventListener('aetheris:capability', open)
    return () => window.removeEventListener('aetheris:capability', open)
  }, [])
  if (!req) return null
  return <CapabilityWorkspace key={`${req.capabilityId}:${req.subject?.id ?? ''}:${req.runId ?? ''}`} req={req} onClose={() => setReq(null)} onSwitch={setReq} />
}

function CapabilityWorkspace({ req, onClose, onSwitch }: { req: OpenRequest; onClose: () => void; onSwitch: (r: OpenRequest) => void }) {
  const ops = useOps()
  const cap = describe(req.capabilityId) ?? CAPABILITIES[0]!
  const [subject, setSubject] = useState<EntityRef | undefined>(req.subject)
  const [label, setLabel] = useState(req.subjectLabel ?? '')
  const [detail, setDetail] = useState<RunDetail | null>(null)
  const [history, setHistory] = useState<RunSummary[]>([])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [useWeb, setUseWeb] = useState(false)

  const company = subject?.type === 'company' ? ops.companies.find(c => c.id === subject.id) : undefined
  const domain = company ? domainOf(company.website, company.domain) : null
  const subjectName = label || company?.name || ops.opportunities.find(o => o.id === subject?.id)?.name || ops.people.find(p => p.id === subject?.id)?.fullName || ''

  useEffect(() => {
    if (!subject) return
    listSubjectRuns({ data: subject }).then(setHistory).catch(() => setHistory([]))
    if (req.runId) getRunDetail({ data: { runId: req.runId } }).then(setDetail).catch(() => {})
  }, [subject?.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const run = async (extra: Record<string, unknown> = {}, capabilityId = cap.id) => {
    if (!subject) return
    setBusy(true); setError(null); setNote(null)
    try {
      const d = await startCapabilityRun({ data: {
        capabilityId, subject, input: { focus: req.focus ?? null, ...extra },
        ...(useWeb && domain && describe(capabilityId)?.web ? { web: { domain, confirmed: true as const } } : {}),
      } })
      setDetail(d); findingsChanged()
      listSubjectRuns({ data: subject }).then(setHistory).catch(() => {})
    } catch (e) {
      const { isAuthRequiredError } = await import('@/lib/auth-contract')
      setError(isAuthRequiredError(e) ? 'Sign in to run this on your records.' : e instanceof Error ? e.message : 'The run failed.')
    } finally { setBusy(false) }
  }
  const reload = async () => { if (detail) setDetail(await getRunDetail({ data: { runId: detail.run.id } })); findingsChanged() }
  const act = async (fn: () => Promise<unknown>, done?: string) => {
    setError(null)
    try { const r = await fn() as { message?: string } | undefined; setNote(r?.message ?? done ?? null); await reload() }
    catch (e) { setError(e instanceof Error ? e.message : 'That did not work.') }
  }

  const isEnrich = cap.id === ENRICH_CAPABILITY_ID
  const LIFECYCLE = isEnrich ? LIFECYCLE_ENRICH : LIFECYCLE_BASE
  const status = detail?.run.status ?? (busy ? 'running' : 'requested')
  const providers = (detail?.run.result?.output as { providers?: ProviderReport[] } | undefined)?.providers ?? []
  const exposure = useMemo(() => normalizeExposure(detail?.findings ?? []), [detail])
  const openFindings = (detail?.findings ?? []).filter(f => f.status === 'open')
  const focusFirst = req.focus === 'prioritize' ? openFindings.slice(0, 1) : null

  return <div className="capws-wrap" onMouseDown={onClose}>
    <aside className="capws" role="dialog" aria-label={`${cap.label} workspace`} onMouseDown={e => e.stopPropagation()}>
      <header className="capws-head">
        <div>
          <Eyebrow signal>{cap.label.toUpperCase()}{subjectName ? ` · ${subjectName.toUpperCase()}` : ''}</Eyebrow>
          <h2>{cap.outcome}.</h2>
        </div>
        <button className="icon-btn" aria-label="Close workspace" onClick={onClose}><X size={17} /></button>
      </header>

      <ol className="capws-life" aria-label="Progress">
        {LIFECYCLE.map(s => {
          const i = LIFECYCLE.indexOf(status as RunStatus)
          const j = LIFECYCLE.indexOf(s)
          return <li key={s} className={s === status ? 'now' : i > j ? 'done' : ''}>{statusLabel[s]}</li>
        })}
        {['cancelled', 'failed', 'partial', 'unavailable'].includes(status) && <li className="now off">{statusLabel[status as RunStatus]}</li>}
      </ol>

      <div className="capws-body">
        {!subject && isEnrich && <section className="capws-sec">
          <Eyebrow>CHOOSE A PERSON</Eyebrow>
          {ops.people.length === 0 && <p className="capws-muted">Add a person in Work → CRM first.</p>}
          <div className="capws-pick">{ops.people.slice(0, 12).map(p =>
            <button key={p.id} onClick={() => { setSubject({ type: 'person', id: p.id }); setLabel(p.fullName) }}><b>{p.fullName}</b><small>{p.title || 'Contact'}</small><ArrowRight size={13} /></button>)}</div>
        </section>}
        {!subject && !isEnrich && <section className="capws-sec">
          <Eyebrow>CHOOSE A COMPANY</Eyebrow>
          {ops.companies.filter(c => !c.archived).length === 0 && <p className="capws-muted">Add a company in Work → CRM first. Diagnose only reads records you have entered.</p>}
          <div className="capws-pick">{ops.companies.filter(c => !c.archived).slice(0, 12).map(c =>
            <button key={c.id} onClick={() => { setSubject({ type: 'company', id: c.id }); setLabel(c.name) }}><b>{c.name}</b><small>{c.industry || 'Company'}</small><ArrowRight size={13} /></button>)}</div>
        </section>}

        {subject && !detail && isEnrich && <section className="capws-sec">
          <Eyebrow>WHAT THIS CHECKS</Eyebrow>
          <ul className="capws-context">
            <li><Check size={13} />Title, company and location against a real LinkedIn result</li>
            <li><Check size={13} />Only the name, company, title and location go into the lookup</li>
            <li><Check size={13} />Nothing on this record changes until you approve it</li>
          </ul>
          <p className="capws-cost"><b>Source:</b> LinkedIn · <b>Usage:</b> {tierCopy.light} One lookup per person per day.</p>
          <Btn disabled={busy} onClick={() => void run()}>{busy ? 'Preparing…' : 'Start the check'} <ArrowRight size={14} /></Btn>
        </section>}
        {subject && !detail && !isEnrich && <section className="capws-sec">
          <Eyebrow>CONTEXT THAT WILL BE USED</Eyebrow>
          <ul className="capws-context">
            <li><Check size={13} />This record, its opportunities, people, tasks and activity timeline</li>
            <li><Check size={13} />Linked decisions and Active Memory events</li>
            <li><Check size={13} />Nothing leaves your account unless you allow public research below</li>
          </ul>
          {cap.web && company && <div className="capws-web">
            <label><input type="checkbox" checked={useWeb} disabled={!domain} onChange={e => setUseWeb(e.target.checked)} />
              <span><Globe size={13} /> Include public research {domain ? <>on <b>{domain}</b></> : '— no public website recorded for this company'}</span></label>
            <small>Only the public domain is searched. Private notes, people and memory never become a web query.</small>
          </div>}
          <p className="capws-cost"><b>Usage:</b> {tierCopy[useWeb && domain ? 'medium' : 'light']}</p>
          <Btn disabled={busy} onClick={() => void run()}>{busy ? 'Reading evidence…' : `Run ${cap.label.toLowerCase()}`} <ArrowRight size={14} /></Btn>
        </section>}

        {error && <p className="capws-error"><AlertTriangle size={14} />{error}</p>}
        {note && <p className="capws-note"><Check size={14} />{note}</p>}

        {detail && isEnrich && <>
          <EnrichPanel detail={detail} act={act} />
          <section className="capws-sec capws-next">
            <Btn kind="quiet" onClick={() => setDetail(null)}><RotateCcw size={13} /> Start a new check</Btn>
          </section>
        </>}
        {detail && !isEnrich && <>
          <section className="capws-sec">
            <Eyebrow>RESULT</Eyebrow>
            {detail.run.result?.items.map((it, i) => <p key={i} className={`capws-item layer-${it.layer}`}><small>{it.layer === 'fact' ? 'FACT' : it.layer === 'recommendation' ? 'RECOMMENDATION' : 'STYLE'}</small>{it.text}</p>)}
            {detail.run.result?.unavailableReason && <p className="capws-muted">{detail.run.result.unavailableReason}</p>}
            {detail.run.errorMessage && <p className="capws-error">{detail.run.errorMessage}</p>}
          </section>

          <section className="capws-sec">
            <Eyebrow>EVIDENCE AREAS</Eyebrow>
            <ul className="capws-providers">{providers.map(p => <li key={p.id} className={`pv-${p.status}`}>
              <b>{p.id}</b><span>{p.status === 'ok' ? 'Read' : p.status === 'insufficient' ? 'Insufficient evidence' : 'Not connected'}</span><small>{p.note}</small></li>)}</ul>
            <small className="capws-muted">Sources: {detail.run.result?.provenance.sources.join(' · ')}{detail.webDomains.length ? ` · public domain queried: ${detail.webDomains.join(', ')}` : ''}</small>
          </section>

          <section className="capws-sec">
            <Eyebrow>FINANCIAL IMPACT</Eyebrow>
            {exposure.normalized == null ? <p className="capws-muted">{exposure.reason}</p> : <div className="capws-money">
              <div><small>Gross observed exposure</small><strong>{formatMoney(exposure.gross, exposure.currency)}</strong></div>
              <div><small>Identified overlap</small><strong>{formatMoney(exposure.overlap, exposure.currency)}</strong></div>
              <div className="lead"><small>Normalized exposure</small><strong>{formatMoney(exposure.normalized, exposure.currency)}</strong></div>
            </div>}
            {req.capabilityId === 'company.model_impact' && exposure.normalized != null && <p className="capws-item layer-recommendation"><small>IF NOTHING CHANGES</small>Up to {formatMoney(exposure.normalized, exposure.currency)} of recorded pipeline stays exposed. This is an upper bound from entered opportunity values, not a forecast.</p>}
          </section>

          <section className="capws-sec">
            <Eyebrow>{focusFirst ? 'FIX THIS FIRST' : `FINDINGS · ${openFindings.length} OPEN`}</Eyebrow>
            {!detail.findings.length && <p className="capws-muted">No findings. The recorded evidence does not show a problem — that is only as complete as your records.</p>}
            {(focusFirst ?? detail.findings).map(f => <FindingCard key={f.id} f={f} proposals={detail.proposals.filter(p => p.finding_id === f.id)}
              onResolve={s => act(() => resolveFinding({ data: { id: f.id, status: s, note: '' } }), s === 'dismissed' ? 'Dismissed.' : 'Marked resolved.')}
              onDecide={(id, d) => act(() => decideProposal({ data: { id, decision: d } }))}
              onVerify={() => act(() => verifyFindingOutcome({ data: { id: f.id } }))}
              onWhy={() => void run({ depth: 2, focusFindingId: f.id }, 'company.trace_cause')}
              onRemember={() => act(() => rememberOutcome({ data: { runId: detail.run.id, findingId: f.id, kind: 'finding', summary: f.claim.slice(0, 400), owner: '', expected: f.target_metric ? `${f.target_metric.metric} ≤ ${f.target_metric.value}` : '' } }), 'Saved to Active Memory.')} />)}
          </section>

          <section className="capws-sec capws-next">
            <Eyebrow>KEEP GOING</Eyebrow>
            <div>{CAPABILITIES.filter(c => subject && c.appliesTo.includes(subject.type) && c.id !== cap.id).slice(0, 3).map(c =>
              <button key={c.id} onClick={() => onSwitch({ capabilityId: c.id, subject, subjectLabel: subjectName })}><b>{c.label}</b><small>{c.outcome}</small></button>)}</div>
            <Btn kind="quiet" onClick={() => setDetail(null)}><RotateCcw size={13} /> Run again</Btn>
          </section>
        </>}

        {history.length > 0 && <section className="capws-sec">
          <Eyebrow>RUN HISTORY</Eyebrow>
          <ul className="capws-history">{history.map(h => <li key={h.id}><button onClick={() => void getRunDetail({ data: { runId: h.id } }).then(setDetail)}>
            <b>{describe(h.capabilityId)?.label ?? 'Run'}</b><small>{new Date(h.createdAt).toLocaleString()} · {statusLabel[h.status]}</small></button></li>)}</ul>
        </section>}
      </div>
    </aside>
  </div>
}

function FindingCard({ f, proposals, onResolve, onDecide, onVerify, onWhy, onRemember }: {
  f: FindingRow; proposals: ProposalRow[]
  onResolve: (s: 'resolved' | 'dismissed' | 'open') => void
  onDecide: (id: string, d: 'apply' | 'queue' | 'reject' | 'dismiss' | 'approve_apply') => void
  onVerify: () => void; onWhy: () => void; onRemember: () => void
}) {
  const [chain, setChain] = useState(false)
  const applied = proposals.some(p => p.status === 'applied')
  return <article className={`capws-finding sev-${f.severity} ${f.status !== 'open' ? 'closed' : ''}`}>
    <div className="capws-finding-head"><small>{kindLabel[f.kind] ?? f.kind}</small><small>{f.confidence}% confidence · {f.status}</small></div>
    <b>{f.claim}</b>
    {f.financial_high != null && <p className="capws-fin"><CircleDot size={12} />{classLabel[f.financial_classification ?? ''] ?? 'Value'}: {formatMoney(f.financial_low, f.currency)}–{formatMoney(f.financial_high, f.currency)}</p>}
    <ul className="capws-evidence">{f.evidence.map(e => <li key={e.ref}>{e.kind === 'url' ? <a href={e.ref} target="_blank" rel="noreferrer">{e.label || e.ref}</a> : <span>{e.label || e.ref}</span>}<small>{e.kind === 'url' ? 'public' : 'your record'}</small></li>)}</ul>
    {f.unknowns.length > 0 && <p className="capws-unknown"><AlertTriangle size={12} /> Unknown: {f.unknowns.join(' · ')}</p>}
    {f.cause_chain.length > 0 && <>
      <button className="capws-toggle" onClick={() => setChain(v => !v)}><ChevronDown size={13} /> Cause chain</button>
      {chain && <ol className="capws-chain">{f.cause_chain.map((s, i) => <li key={i} className={s.hypothesis ? 'hyp' : ''}>
        <b>{s.step}</b><span>{s.detail}</span><small>{s.hypothesis ? 'Hypothesis — not yet evidenced' : s.evidence.map(e => e.label).join(' · ')}</small></li>)}
        <li className="ask"><button onClick={onWhy}>Ask why again <ArrowRight size={12} /></button></li></ol>}
    </>}
    {proposals.length > 0 && <div className="capws-proposals">
      <small>RECOMMENDED NEXT ACTIONS</small>
      {proposals.map(p => <div key={p.id} className={`capws-proposal st-${p.status}`}>
        <span>{p.summary}<em>{p.impact === 'draft' ? 'Draft · you decide' : p.impact === 'write' ? 'Changes your records · needs approval' : p.impact === 'external' ? 'External · always asks' : 'Read'}</em></span>
        {p.action.kind === 'draft_note' && <blockquote>{p.action.text}</blockquote>}
        <div>
          {p.status === 'proposed' && (p.impact === 'draft' || p.impact === 'read') && p.created_by_kind === 'member' && <Btn kind="secondary" onClick={() => onDecide(p.id, 'apply')}>Save draft</Btn>}
          {p.status === 'proposed' && (p.impact === 'write' || p.impact === 'external' || p.created_by_kind === 'delegate') && <Btn kind="secondary" onClick={() => onDecide(p.id, 'queue')}><ShieldCheck size={13} /> Send for approval</Btn>}
          {p.status === 'queued' && <Btn onClick={() => onDecide(p.id, 'approve_apply')}><Check size={13} /> Approve & apply</Btn>}
          {p.status === 'proposed' && <Btn kind="quiet" onClick={() => onDecide(p.id, 'reject')}>Not now</Btn>}
          {p.status !== 'proposed' && p.status !== 'queued' && <small className="capws-state">{p.status}</small>}
        </div>
      </div>)}
    </div>}
    {f.baseline_metric && <p className="capws-muted">Baseline {f.baseline_metric.value} {f.baseline_metric.unit ?? ''} → target {f.target_metric?.value ?? '—'}{f.actual_outcome ? ` · actual ${f.actual_outcome.value ?? '—'}` : ''}{f.verified_at ? ' · verified' : ''}{f.recovered_value != null ? ` · recovered ${formatMoney(f.recovered_value, f.currency)}` : ''}</p>}
    <div className="capws-finding-actions">
      {f.status === 'open' && <><button onClick={() => onResolve('resolved')}>Resolve</button><button onClick={() => onResolve('dismissed')}>Dismiss</button></>}
      {f.status !== 'open' && <button onClick={() => onResolve('open')}>Reopen</button>}
      {applied && !f.verified_at && <button onClick={onVerify}>Check outcome</button>}
      <button onClick={onRemember}><Link2 size={12} /> Save to memory</button>
      {f.status === 'open' && f.kind !== 'pattern' && f.kind !== 'competitive' && <RouteToNetwork f={f} />}
    </div>
  </article>
}
