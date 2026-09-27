import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import { Btn, Eyebrow } from '../ui'
import { formatMoney, normalizeExposure } from './finance'
import { openCapability, useFindings } from './store'

const sev = { critical: 4, high: 3, medium: 2, low: 1 }
const WEEK = 7 * 86_400_000

/** One Business Pulse module, computed only from real findings. No totals without data. */
export function BusinessPulse() {
  const { findings, loaded } = useFindings()
  const p = useMemo(() => {
    const now = Date.now()
    const open = findings.filter(f => f.status === 'open')
    const exposure = normalizeExposure(findings)
    const fresh = open.filter(f => now - new Date(f.created_at).getTime() < WEEK).length
    const improving = findings.filter(f => f.status === 'resolved' || f.actual_outcome).length
    const assumptions = open.filter(f => f.provider === 'decision').length
    const verified = findings.filter(f => f.verified_at && f.recovered_value != null && f.currency)
    const recCurrencies = new Set(verified.map(f => f.currency))
    const recovered = verified.length && recCurrencies.size === 1 ? { v: verified.reduce((s, f) => s + (f.recovered_value ?? 0), 0), c: verified[0]!.currency } : null
    const top = [...open].filter(f => f.kind !== 'pattern').sort((a, b) => sev[b.severity] - sev[a.severity] || (b.financial_high ?? 0) - (a.financial_high ?? 0))[0]
    return { open, exposure, fresh, improving, assumptions, recovered, top }
  }, [findings])

  if (!loaded) return null
  if (!findings.length) return <section className="business-pulse empty" aria-label="Business Pulse">
    <div><Eyebrow signal>BUSINESS PULSE</Eyebrow><h2>Know where value leaks. Know why now.</h2>
      <p>Nothing has been diagnosed yet, so there is nothing to total. Diagnose a company and Intros will read your own records — opportunities, activity, tasks, decisions — and show only what the evidence supports.</p></div>
    <div className="bp-cta"><Btn onClick={() => openCapability({ capabilityId: 'company.diagnose' })}>Diagnose a company <ArrowRight size={14} /></Btn></div>
  </section>

  const { exposure, top } = p
  return <section className="business-pulse" aria-label="Business Pulse">
    <div className="bp-lead">
      <Eyebrow signal>BUSINESS PULSE</Eyebrow>
      <strong>{exposure.normalized != null ? formatMoney(exposure.normalized, exposure.currency) : '—'}</strong>
      <span>{exposure.normalized != null ? `normalized exposure across ${exposure.counted} finding${exposure.counted === 1 ? '' : 's'}${exposure.overlap ? ` · ${formatMoney(exposure.overlap, exposure.currency)} overlap removed` : ''}` : exposure.reason}</span>
    </div>
    <dl className="bp-stats">
      <div><dt>New this week</dt><dd>{p.fresh}</dd></div>
      <div><dt>Improving / resolved</dt><dd>{p.improving}</dd></div>
      <div><dt>Assumption alerts</dt><dd>{p.assumptions}</dd></div>
      <div><dt>Verified recovered</dt><dd>{p.recovered ? formatMoney(p.recovered.v, p.recovered.c) : 'None verified'}</dd></div>
    </dl>
    {top && <button className="bp-today" onClick={() => openCapability({ capabilityId: 'company.diagnose', subject: { type: top.subject_type as never, id: top.subject_id }, runId: top.run_id })}>
      <small>WHAT MATTERS TODAY</small><b>{top.claim}</b>
      <em>{top.severity} severity · {top.evidence.length} evidence reference{top.evidence.length === 1 ? '' : 's'}{top.financial_high != null ? ` · up to ${formatMoney(top.financial_high, top.currency)}` : ''}</em>
      <ArrowRight size={14} /></button>}
  </section>
}
