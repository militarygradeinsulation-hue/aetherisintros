import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

import { useAccess, type LaunchMode } from '@/aetheris/access'
import { NetworkProofPanel } from '@/aetheris/outcomes-ui'
import { AdminNetworkHealthPanel } from '@/aetheris/admin-health-ui'
import { FoundingCohortsPanel } from '@/aetheris/cohorts-ui'
import { supabase } from '@/integrations/supabase/client'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/_authenticated/admin/early-access')({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: 'Launch control — Ask Intros' },
      { name: 'description', content: 'Admin launch control for the Ask Intros founding cohort: mode, capacity, invitations and waitlist.' },
      { property: 'og:title', content: 'Launch control — Ask Intros' },
      { property: 'og:description', content: 'Control who may join the founding network.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: AdminRoute,
})

interface MemberRow { user_id: string; email: string | null; status: string; founding_member_number: number | null }

function AdminRoute() {
  const { access } = useAccess()
  const navigate = useNavigate()
  const [mode, setMode] = useState<LaunchMode>('first_1000')
  const [capacity, setCapacity] = useState(1000)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [waitlist, setWaitlist] = useState<Array<{ email: string; requested_at: string; status: string }>>([])
  const [whitelist, setWhitelist] = useState<Array<{ email: string; status: string }>>([])
  const [invites, setInvites] = useState<Array<{ code: string; uses: number; max_uses: number; revoked: boolean }>>([])
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState('')

  const reload = useCallback(async () => {
    const [settings, memberRows, waitRows, whiteRows, inviteRows] = await Promise.all([
      supabase.from('launch_settings').select('mode, capacity').eq('id', 1).maybeSingle(),
      supabase.from('early_access_members').select('user_id, email, status, founding_member_number').order('founding_member_number', { nullsFirst: false }).limit(200),
      supabase.from('waitlist_entries').select('email, requested_at, status').order('requested_at').limit(200),
      supabase.from('whitelist_entries').select('email, status').order('created_at').limit(200),
      supabase.from('invitations').select('code, uses, max_uses, revoked').order('created_at').limit(200),
    ])
    if (settings.data) { setMode(settings.data.mode as LaunchMode); setCapacity(settings.data.capacity) }
    setMembers((memberRows.data ?? []) as MemberRow[])
    setWaitlist(waitRows.data ?? [])
    setWhitelist(whiteRows.data ?? [])
    setInvites(inviteRows.data ?? [])
  }, [])

  useEffect(() => {
    if (access.loading) return
    if (!access.isAdmin) { void navigate({ to: '/app', replace: true }); return }
    void reload()
  }, [access, navigate, reload])

  const saveSettings = async () => {
    await supabase.from('launch_settings').update({ mode, capacity, updated_by: access.userId, updated_at: new Date().toISOString() }).eq('id', 1)
    setNotice('Launch settings saved.')
    void reload()
  }

  const addWhitelist = async () => {
    if (!email.trim()) return
    await supabase.from('whitelist_entries').insert({ email: email.trim().toLowerCase(), added_by: access.userId })
    setEmail(''); setNotice('Email whitelisted.'); void reload()
  }

  const createInvite = async () => {
    const value = code.trim() || Math.random().toString(36).slice(2, 10).toUpperCase()
    await supabase.from('invitations').insert({ code: value, created_by: access.userId, max_uses: 1 })
    setCode(''); setNotice(`Invitation ${value} created.`); void reload()
  }

  const setStatus = async (userId: string, status: string) => {
    await supabase.from('early_access_members').update({ status, updated_at: new Date().toISOString() }).eq('user_id', userId)
    void reload()
  }

  if (access.loading || !access.isAdmin) return null

  const approved = members.filter(m => m.status === 'approved').length

  return <main className="admin-page">
    <header className="admin-head">
      <span className="folio">LAUNCH CONTROL / FOUNDING 1,000</span>
      <h1>Who may <em>join.</em></h1>
      <p>{approved.toLocaleString()} of {capacity.toLocaleString()} founding places claimed.</p>
      {notice && <p className="auth-notice">{notice}</p>}
    </header>

    <NetworkProofPanel />
    <AdminNetworkHealthPanel />

    <FoundingCohortsPanel />

    <section className="admin-panel">
      <h2>Launch mode</h2>
      <div className="admin-modes">
        {(['first_1000', 'invite_only', 'closed'] as LaunchMode[]).map(value => <button
          key={value} type="button" className={mode === value ? 'chip on' : 'chip'} onClick={() => setMode(value)}>
          {value === 'first_1000' ? 'First 1,000' : value === 'invite_only' ? 'Invitation only' : 'Closed'}
        </button>)}
      </div>
      <label className="access-field">
        <span>CAPACITY</span>
        <input type="number" min={1} value={capacity} onChange={e => setCapacity(Number(e.target.value) || 1)} />
      </label>
      <button className="btn primary" type="button" onClick={() => void saveSettings()}>Save launch settings</button>
    </section>

    <section className="admin-panel">
      <h2>Whitelist an email</h2>
      <label className="access-field">
        <span>EMAIL</span>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="member@company.com" />
      </label>
      <button className="btn ghost" type="button" onClick={() => void addWhitelist()}>Add to whitelist</button>
      <ul className="admin-list">{whitelist.map(w => <li key={w.email}><span>{w.email}</span><small>{w.status}</small></li>)}</ul>
    </section>

    <section className="admin-panel">
      <h2>Invitations</h2>
      <label className="access-field">
        <span>CODE (BLANK GENERATES ONE)</span>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="AETHERIS-01" />
      </label>
      <button className="btn ghost" type="button" onClick={() => void createInvite()}>Create invitation</button>
      <ul className="admin-list">{invites.map(i => <li key={i.code}><span>{i.code}</span><small>{i.uses}/{i.max_uses}{i.revoked ? ' · revoked' : ''}</small></li>)}</ul>
    </section>

    <section className="admin-panel">
      <h2>Members</h2>
      <ul className="admin-list">{members.map(m => <li key={m.user_id}>
        <span>{m.founding_member_number ? `#${String(m.founding_member_number).padStart(3, '0')} · ` : ''}{m.email ?? m.user_id}</span>
        <small>{m.status}</small>
        <span className="admin-actions">
          {m.status !== 'approved' && <button type="button" className="chip" onClick={() => void setStatus(m.user_id, 'approved')}>Approve</button>}
          {m.status !== 'suspended' && <button type="button" className="chip" onClick={() => void setStatus(m.user_id, 'suspended')}>Suspend</button>}
        </span>
      </li>)}</ul>
    </section>

    <section className="admin-panel">
      <h2>Waitlist</h2>
      <ul className="admin-list">{waitlist.map(w => <li key={w.email}><span>{w.email}</span><small>{new Date(w.requested_at).toLocaleDateString()} · {w.status}</small></li>)}</ul>
      {!waitlist.length && <p className="empty-note">Nobody is waiting yet.</p>}
    </section>
  </main>
}
