import { useMemo } from 'react'
import { Eyebrow } from '../ui'
import { useOps } from '../crm/store'
import { formatMoney, normalizeExposure } from './finance'
import { openCapability, useFindings } from './store'
import { rankCapabilities } from './registry'

const DAY = 86_400_000

/** "What Intros sees" for one CRM company, from recorded data and open findings only. */
export function CompanyIntelligence({ companyId }: { companyId: string }) {
  const ops = useOps()
  const { findings } = useFindings()
  const c = ops.companies.find(x => x.id === companyId)
  const data = useMemo(() => {
    const people = ops.people.filter(p => p.companyId === companyId && !p.archived)
    const opps = ops.opportunities.filter(o => o.companyId === companyId && !o.archived && o.status === 'open')
    const acts = ops.activities.filter(a => a.companyId === companyId || opps.some(o => o.id === a.opportunityId)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    const mine = findings.filter(f => f.subject_type === 'company' && f.subject_id === companyId)
    const open = mine.filter(f => f.status === 'open')
    const recent = acts.filter(a => Date.now() - new Date(a.occurredAt).getTime() < 30 * DAY).length
    const coverage = people.length >= 3 ? 'Multi-threaded' : people.length === 2 ? 'Thin' : people.length === 1 ? 'Single-threaded' : 'No known contacts'
    return { people, opps, acts, open, exposure: normalizeExposure(mine), recent, coverage }
  }, [ops.people, ops.opportunities, ops.activities, findings, companyId])
  if (!c) return null
  const sees = data.open.length
    ? `${data.open.length} open finding${data.open.length === 1 ? '' : 's'}; the most serious: ${data.open[0]!.claim}`
    : data.opps.length ? `${data.opps.length} open opportunit${data.opps.length === 1 ? 'y' : 'ies'}, ${data.recent} touches in 30 days, coverage ${data.coverage.toLowerCase()}. Not yet diagnosed.`
      : 'No open opportunities and no findings. Diagnose to check the record.'
  const verbs = rankCapabilities('company', { openFindings: data.open.length, openOpportunities: data.opps.length }, 3)
  return <section className="ops-panel company-intel">
    <Eyebrow signal>WHAT INTROS SEES</Eyebrow>
    <p className="company-intel-sees">{sees}</p>
    <dl className="company-intel-grid">
      <div><dt>Open findings</dt><dd>{data.open.length}</dd></div>
      <div><dt>Exposure</dt><dd>{data.exposure.normalized != null ? formatMoney(data.exposure.normalized, data.exposure.currency) : 'Unknown'}</dd></div>
      <div><dt>Coverage</dt><dd>{data.coverage}</dd></div>
      <div><dt>Open opportunities</dt><dd>{data.opps.length}</dd></div>
      <div><dt>Touches · 30 days</dt><dd>{data.recent}</dd></div>
      <div><dt>Last change</dt><dd>{data.acts[0] ? new Date(data.acts[0].occurredAt).toLocaleDateString() : 'None recorded'}</dd></div>
    </dl>
    {data.open.length > 0 && <ul className="company-intel-findings">{data.open.slice(0, 3).map(f => <li key={f.id}><small>{f.kind}</small>{f.claim}</li>)}</ul>}
    <div className="company-intel-actions">{verbs.map(v => <button key={v.id} onClick={() => openCapability({ capabilityId: v.id, subject: { type: 'company', id: companyId }, subjectLabel: c.name })}>{v.label}</button>)}</div>
  </section>
}
