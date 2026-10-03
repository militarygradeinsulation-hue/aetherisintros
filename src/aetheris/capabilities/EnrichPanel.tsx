/** Professional info check inside the Capability Workspace. Shows only real, handed-in results. */
import { useState } from 'react'
import { AlertTriangle, Check, ExternalLink, Link2, X } from 'lucide-react'
import { Btn, Eyebrow } from '../ui'
import { confirmProfessionalCandidate, rejectProfessionalCandidate, submitProfessionalCandidates } from '@/lib/enrichment.functions'
import { decideProposal } from '@/lib/capabilities.functions'
import { CandidateSchema, FIELD_LABEL, parseCandidateBlock, withFullName, type EnrichField, type LookupQuery, type NormalizedCandidate, type ScoredCandidate } from './enrichment'
import type { RunDetail } from './types'

type Act = (fn: () => Promise<unknown>, done?: string) => Promise<void>

export function EnrichPanel({ detail, act }: { detail: RunDetail; act: Act }) {
  const out = (detail.run.result?.output ?? {}) as {
    query?: LookupQuery; candidates?: ScoredCandidate[]; preselect?: number; channel?: string; checkedAt?: string
    cachedUntilNextLookup?: boolean; lastCheckedAt?: string | null; providers?: { id: string; available: boolean; reason: string | null }[]
  }
  const runId = detail.run.id
  const candidates = out.candidates ?? []
  const [pick, setPick] = useState<number>(out.preselect ?? -1)
  const [mode, setMode] = useState<'form' | 'paste'>('form')
  const [paste, setPaste] = useState('')
  const [form, setForm] = useState<NormalizedCandidate>({})
  const [localErr, setLocalErr] = useState<string | null>(null)
  const waiting = detail.run.status === 'needs_input'
  const direct = out.providers?.find(p => p.id === 'direct_api')

  const submit = (list: NormalizedCandidate[], channel: 'assistant_connector' | 'manual') =>
    act(() => submitProfessionalCandidates({ data: { runId, channel, candidates: list } }), 'Results checked against this record.')

  const handIn = () => {
    setLocalErr(null)
    try {
      if (mode === 'paste') { const { candidates: c } = parseCandidateBlock(paste); void submit(c, 'assistant_connector') }
      else {
        const c = withFullName(CandidateSchema.parse(form))
        if (!c.full_name || !c.profile_url) throw new Error('Add at least the name and the linkedin.com/in/… link.')
        void submit([c], 'manual')
      }
    } catch (e) { setLocalErr(e instanceof Error ? e.message : 'That could not be read.') }
  }

  const fieldProposals = detail.proposals.filter(p => (p.action as Record<string, unknown>)['kind'] === 'update_person_field')
  const mergeReview = detail.proposals.find(p => (p.action as Record<string, unknown>)['kind'] === 'merge_review')

  return <>
    <section className="capws-sec">
      <Eyebrow>LOOKUP</Eyebrow>
      {out.query && <p className="enr-query">
        <b>{out.query.full_name}</b>{out.query.company && <> · {out.query.company}</>}{out.query.title && <> · {out.query.title}</>}{out.query.location && <> · {out.query.location}</>}
      </p>}
      <small className="capws-muted">Only name, company, title and location are used. Email, phone and private notes never leave your account.</small>
      {out.cachedUntilNextLookup && out.lastCheckedAt && <p className="capws-note"><Check size={14} />Checked {new Date(out.lastCheckedAt).toLocaleString()}. A new LinkedIn lookup opens again 24 hours after that.</p>}
      {direct && !direct.available && <p className="capws-muted">One-click search inside Intros is not connected yet. Run the lookup in your assistant’s LinkedIn search, then hand the result in below.</p>}
    </section>

    {waiting && candidates.length === 0 && <section className="capws-sec">
      <Eyebrow>HAND IN THE RESULT</Eyebrow>
      <div className="enr-tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'form'} className={mode === 'form' ? 'on' : ''} onClick={() => setMode('form')}>One profile</button>
        <button role="tab" aria-selected={mode === 'paste'} className={mode === 'paste' ? 'on' : ''} onClick={() => setMode('paste')}>Paste lookup result</button>
      </div>
      {mode === 'form' ? <div className="enr-form">
        {(['full_name', 'title', 'company', 'location', 'profile_url'] as const).map(k =>
          <label key={k}><span>{k === 'full_name' ? 'Name' : k === 'profile_url' ? 'LinkedIn link' : k[0]!.toUpperCase() + k.slice(1)}</span>
            <input value={String(form[k] ?? '')} placeholder={k === 'profile_url' ? 'https://www.linkedin.com/in/…' : ''} onChange={e => setForm({ ...form, [k]: e.target.value })} /></label>)}
        <label><span>Followers (optional)</span><input inputMode="numeric" value={String(form.follower_count ?? '')} onChange={e => setForm({ ...form, follower_count: e.target.value as never })} /></label>
      </div> : <textarea className="enr-paste" rows={7} value={paste} onChange={e => setPaste(e.target.value)}
        placeholder='[{"full_name":"…","title":"…","company":"…","location":"…","follower_count":1200,"profile_url":"https://www.linkedin.com/in/…"}]' />}
      <small className="capws-muted">Up to 10 profiles. Anything other than name, title, company, location, followers and link is dropped.</small>
      {localErr && <p className="capws-error"><AlertTriangle size={14} />{localErr}</p>}
      <Btn onClick={handIn}>Check against this record</Btn>
    </section>}

    {candidates.length > 0 && !detail.proposals.length && waiting && <section className="capws-sec">
      <Eyebrow>{candidates.length > 1 ? `CHOOSE THE RIGHT PERSON · ${candidates.length}` : 'CONFIRM THE MATCH'}</Eyebrow>
      <ul className="enr-cands">{candidates.map((s, i) => <li key={i} className={pick === i ? 'on' : ''}>
        <label>
          <input type="radio" name="enr-pick" checked={pick === i} onChange={() => setPick(i)} />
          <span>
            <b>{s.candidate.full_name ?? '—'}</b>
            <small>{[s.candidate.title, s.candidate.company].filter(Boolean).join(' · ') || 'No title given'}</small>
            <small>{[s.candidate.location, s.candidate.follower_count != null ? `${s.candidate.follower_count.toLocaleString()} followers` : null].filter(Boolean).join(' · ')}</small>
            <em>{s.reasons.length ? s.reasons.join(' · ') : 'Weak match'} · {Math.round(s.confidence * 100)}%</em>
          </span>
        </label>
        {s.candidate.profile_url && <a href={s.candidate.profile_url} target="_blank" rel="noreferrer noopener" aria-label="Open profile"><ExternalLink size={13} /></a>}
        <button className="icon-btn" aria-label="Not this person" onClick={() => act(() => rejectProfessionalCandidate({ data: { runId, index: i } }), 'Marked as not this person.')}><X size={13} /></button>
      </li>)}</ul>
      <small className="capws-muted">Source: LinkedIn via {out.channel === 'manual' ? 'manual entry' : 'assistant lookup'} · checked {out.checkedAt ? new Date(out.checkedAt).toLocaleString() : '—'}</small>
      <Btn disabled={pick < 0} onClick={() => act(() => confirmProfessionalCandidate({ data: { runId, index: pick } }))}><Link2 size={13} /> This is the person</Btn>
    </section>}

    {mergeReview && <section className="capws-sec">
      <Eyebrow signal>POSSIBLE DUPLICATE</Eyebrow>
      <p className="capws-item layer-fact"><small>FACT</small>{mergeReview.summary}</p>
      <small className="capws-muted">Nothing was imported or merged. Open both contacts in Work → CRM to decide.</small>
    </section>}

    {fieldProposals.length > 0 && <section className="capws-sec">
      <Eyebrow>CURRENT INTROS VALUE · LINKEDIN VALUE</Eyebrow>
      <ul className="enr-diff">{fieldProposals.map(p => {
        const a = p.action as unknown as { field: EnrichField; from: string; to: string }
        return <li key={p.id} className={`st-${p.status}`}>
          <b>{FIELD_LABEL[a.field]}</b>
          <span className="enr-cur">{a.from || <em>empty</em>}</span>
          <span className="enr-new">{a.to}</span>
          <div>
            {p.status === 'proposed' && <>
              <Btn kind="quiet" onClick={() => act(() => decideProposal({ data: { id: p.id, decision: 'reject' } }), 'Kept your value. The LinkedIn snapshot is still saved.')}>Keep mine</Btn>
              <Btn onClick={() => act(() => decideProposal({ data: { id: p.id, decision: 'queue' } }), 'Sent for approval.')}>Use LinkedIn</Btn>
            </>}
            {p.status === 'queued' && <Btn onClick={() => act(() => decideProposal({ data: { id: p.id, decision: 'approve_apply' } }), 'Updated.')}>Approve change</Btn>}
            {p.status === 'applied' && <small><Check size={12} /> Updated</small>}
            {(p.status === 'rejected' || p.status === 'dismissed') && <small>Kept yours</small>}
          </div>
        </li>
      })}</ul>
      <small className="capws-muted">Changes to your record always need your approval. Relationship strength, notes, memory and membership status are never touched.</small>
    </section>}

    {detail.run.errorMessage && <p className="capws-error">{detail.run.errorMessage}</p>}
  </>
}
