/** Professional info module for a CRM person: canonical values, confirmed LinkedIn link, freshness, history. */
import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { Btn, Eyebrow } from '../ui'
import { getProfessionalInfo, type ProfessionalInfo as Info } from '@/lib/enrichment.functions'
import { ENRICH_CAPABILITY_ID, contextualLabel, diffFields, isStale } from './enrichment'
import { openCapability } from './store'

export function ProfessionalInfo({ person }: { person: { id: string; fullName: string; title: string; companyName: string; location: string; linkedinUrl?: string } }) {
  const [info, setInfo] = useState<Info | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  useEffect(() => {
    let live = true
    const load = () => getProfessionalInfo({ data: { personId: person.id } }).then(i => live && setInfo(i)).catch(() => live && setUnavailable(true))
    load()
    const on = () => load()
    window.addEventListener('aetheris:findings-changed', on)
    return () => { live = false; window.removeEventListener('aetheris:findings-changed', on) }
  }, [person.id])

  const latest = info?.snapshots[0]
  const differs = latest ? diffFields({ title: person.title, companyName: person.companyName, location: person.location, linkedinUrl: person.linkedinUrl ?? '' }, latest.normalized).length > 0 : false
  const label = contextualLabel({ confirmed: Boolean(info?.profile), lastCheckedAt: info?.profile?.last_checked_at ?? null, differs })
  const stale = info?.profile ? isStale(info.profile.last_checked_at) : false
  const open = () => openCapability({ capabilityId: ENRICH_CAPABILITY_ID, subject: { type: 'person', id: person.id }, subjectLabel: person.fullName })

  return <section className="ops-panel prof-info">
    <div className="prof-info-head">
      <Eyebrow>PROFESSIONAL INFO</Eyebrow>
      <Btn kind="secondary" onClick={open}><RefreshCw size={13} /> {label}</Btn>
    </div>
    <dl>
      <div><dt>Title</dt><dd>{person.title || '—'}</dd></div>
      <div><dt>Company</dt><dd>{person.companyName || '—'}</dd></div>
      <div><dt>Location</dt><dd>{person.location || '—'}</dd></div>
    </dl>
    {unavailable && <small className="capws-muted">Sign in to see LinkedIn checks for this person.</small>}
    {info && !info.profile && <small className="capws-muted">Not checked on LinkedIn yet. Values above are from your CRM.</small>}
    {info?.profile && <p className="prof-info-line">
      <a href={info.profile.external_url} target="_blank" rel="noreferrer noopener">LinkedIn <ExternalLink size={11} /></a>
      <span> · verified {new Date(info.profile.last_checked_at).toLocaleDateString()}</span>
      {stale && <span className="prof-stale"> · over 90 days old</span>}
      {differs && <span className="prof-dot" title="LinkedIn shows a difference" />}
    </p>}
    {info && info.conflicts.length > 0 && <small className="capws-error">A LinkedIn profile here is also linked to another contact — review before merging.</small>}
    {info && info.openProposals.length > 0 && <small className="capws-muted">{info.openProposals.length} suggested change{info.openProposals.length > 1 ? 's' : ''} waiting for you.</small>}
    {info && info.snapshots.length > 0 && <details className="prof-history">
      <summary>Change history · {info.snapshots.length}</summary>
      <ul>{info.snapshots.map(s => <li key={s.id}>
        <time>{new Date(s.checked_at).toLocaleDateString()}</time>
        <span>{[s.normalized.title, s.normalized.company, s.normalized.location].filter(Boolean).join(' · ') || '—'}</span>
        <small>{s.source_channel === 'manual' ? 'Manual' : s.source_channel === 'direct_api' ? 'Direct' : 'Assistant lookup'}</small>
      </li>)}</ul>
    </details>}
  </section>
}
