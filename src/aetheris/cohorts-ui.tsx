/**
 * Admin: founding cohorts. Paste a client list, get one email-locked link per person to
 * send personally, and watch each invitee move from invitation to a reported outcome.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAccess } from './access'
import {
  cohortFunnel, createCohort, createCohortInvites, inviteLink, linksCsv, loadActivation, loadCohorts, parseInviteList,
  revokeCohortInvite, stageLabel, type ActivationRow, type Cohort, type CreateResult,
} from './cohorts'
import { rate } from './outcomes'

const outcomeLabel: Record<CreateResult['outcome'], string> = {
  created: 'Invite created', already_member: 'Already a member', already_invited: 'Already invited (existing link kept)', invalid_email: 'Invalid email',
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

export function FoundingCohortsPanel() {
  const { access } = useAccess()
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [cohortId, setCohortId] = useState('')
  const [rows, setRows] = useState<ActivationRow[]>([])
  const [newName, setNewName] = useState('')
  const [newSource, setNewSource] = useState('aetheris_client')
  const [list, setList] = useState('')
  const [results, setResults] = useState<CreateResult[]>([])
  const [notice, setNotice] = useState('')
  const parsed = useMemo(() => parseInviteList(list), [list])
  const origin = typeof window === 'undefined' ? '' : window.location.origin

  const reloadCohorts = useCallback(async (prefer?: string) => {
    const r = await loadCohorts()
    setCohorts(r.data)
    setCohortId(cur => prefer ?? (r.data.some(c => c.id === cur) ? cur : r.data[0]?.id ?? ''))
    if (r.error) setNotice(r.error)
  }, [])
  useEffect(() => { void reloadCohorts() }, [reloadCohorts])

  const reload = useCallback(async () => {
    if (!cohortId) { setRows([]); return }
    const r = await loadActivation(cohortId)
    setRows(r.data)
    if (r.error) setNotice(r.error)
  }, [cohortId])
  useEffect(() => { void reload() }, [reload])

  const funnel = useMemo(() => cohortFunnel(rows), [rows])
  const cohort = cohorts.find(c => c.id === cohortId)

  const create = async () => {
    if (!newName.trim() || !access.userId) return
    const r = await createCohort(newName, newSource, access.userId)
    if (r.error || !r.id) { setNotice(r.error || 'Could not create the cohort.'); return }
    setNewName('')
    await reloadCohorts(r.id)
  }

  const invite = async () => {
    if (!cohortId || !parsed.rows.length) return
    const r = await createCohortInvites(cohortId, parsed.rows)
    if (r.error) { setNotice(r.error); return }
    setResults(r.data)
    const made = r.data.filter(x => x.outcome === 'created').length
    setNotice(`${made} invite${made === 1 ? '' : 's'} created. Download the links and send them yourself — nothing is emailed automatically.`)
    setList('')
    await reload()
  }

  return <section className="admin-panel cohort">
    <h2>Founding cohorts</h2>
    <p className="empty-note">Invite a known group — for example existing Aetheris clients — with one single-use link per person, locked to their email. You send the links yourself. Each person is tracked from invitation to an outcome reported by the other side of an introduction.</p>

    <div className="admin-modes">
      {cohorts.map(c => <button key={c.id} type="button" className={c.id === cohortId ? 'chip on' : 'chip'} onClick={() => setCohortId(c.id)}>{c.name}</button>)}
    </div>
    <div className="cohort-new">
      <label className="access-field"><span>NEW COHORT</span><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Aetheris clients — Q4" /></label>
      <label className="access-field"><span>SOURCE</span><input value={newSource} onChange={e => setNewSource(e.target.value)} /></label>
      <button className="btn ghost" type="button" onClick={() => void create()}>Create cohort</button>
    </div>

    {cohort && <>
      <dl className="oc-funnel">{funnel.map(f => <div key={f.stage}>
        <dt>{stageLabel[f.stage]}</dt>
        <dd>{f.reached} {f.stage !== 'invited' && <small>{(() => { const p = rate(f.reached, funnel[0]!.reached); return p === null ? '' : `${p}%` })()}</small>}</dd>
      </div>)}</dl>

      <label className="access-field"><span>PASTE PEOPLE — ONE PER LINE: NAME, EMAIL, COMPANY</span>
        <textarea rows={5} value={list} onChange={e => setList(e.target.value)} placeholder={'Dana Ortiz, dana@northwind.com, Northwind\nSam Lee, sam@contoso.com, Contoso'} /></label>
      {list && <p className="empty-note">{parsed.rows.length} ready{parsed.skipped.length ? ` · ${parsed.skipped.length} line${parsed.skipped.length === 1 ? '' : 's'} skipped: ${parsed.skipped.slice(0, 3).join(' | ')}` : ''}</p>}
      <button className="btn primary" type="button" disabled={!parsed.rows.length} onClick={() => void invite()}>Create {parsed.rows.length || ''} invite links</button>

      {results.length > 0 && <ul className="admin-list">{results.filter(r => r.outcome !== 'created').map(r => <li key={r.email}><span>{r.email}</span><small>{outcomeLabel[r.outcome]}</small></li>)}</ul>}

      {rows.length > 0 && <>
        <button className="btn ghost" type="button" onClick={() => download(`${cohort.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-invites.csv`, linksCsv(origin, rows))}>Download links (CSV)</button>
        <ul className="admin-list">{rows.map(r => <li key={r.inviteId}>
          <span>{r.name || r.email}{r.company ? ` · ${r.company}` : ''}<br /><small>{r.email}</small></span>
          <small>{stageLabel[r.stage]}</small>
          <span className="admin-actions">
            {(r.stage === 'invited' || r.stage === 'expired') && <>
              <button type="button" className="chip" onClick={() => { void navigator.clipboard?.writeText(inviteLink(origin, r.code)); setNotice(`Link for ${r.email} copied.`) }}>Copy link</button>
              <button type="button" className="chip" onClick={() => void revokeCohortInvite(r.inviteId).then(x => { setNotice(x.error || 'Invite revoked.'); void reload() })}>Revoke</button>
            </>}
          </span>
        </li>)}</ul>
      </>}
    </>}
    {notice && <p className="auth-notice">{notice}</p>}
  </section>
}
