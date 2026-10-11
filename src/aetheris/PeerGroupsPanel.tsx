/**
 * PeerGroupsPanel — AI-facilitated peer cohort management.
 *
 * Shows the groups the signed-in member belongs to. Inside a group:
 * - AI-generated discussion agenda (facilitators can regenerate)
 * - Commitment tracker: add, check off and track between sessions
 * - Member roster
 *
 * Existing group creation and join-request flows are in peer-groups-ui.tsx.
 * This panel focuses on the agenda + commitment features added in 0046.
 */
import {
  BookOpen, CheckSquare, ChevronLeft, Clipboard, Loader2, Plus, RefreshCw, Square, Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import {
  addCommitment,
  generateGroupAgenda,
  getGroupAgenda,
  getGroupCommitments,
  updateCommitmentStatus,
  type PeerGroupAgenda,
  type PeerGroupCommitment,
} from '@/lib/peerGroups.functions'
import { Btn, Eyebrow } from './ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

interface Group {
  id: string
  name: string
  description: string
  cadence: string
  facilitator_id: string | null
  max_size: number
}

interface Membership {
  group_id: string
  user_id: string
  agreement_accepted_at: string | null
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

// ── Top-level panel ───────────────────────────────────────────────────────────

export function PeerGroupsPanel() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<Group[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const reload = useCallback(async () => {
    const uid = await currentUserId()
    setUserId(uid)
    if (!uid) { setLoading(false); return }
    const { data: memRows } = await db
      .from('peer_group_members')
      .select('group_id, user_id, agreement_accepted_at')
      .eq('user_id', uid)
    const rows: Membership[] = memRows ?? []
    setMemberships(rows)
    const ids = rows.map(r => r.group_id)
    if (ids.length) {
      const [groupRes, allMembers] = await Promise.all([
        db.from('peer_groups')
          .select('id, name, description, cadence, facilitator_id, max_size')
          .in('id', ids)
          .order('name'),
        db.from('peer_group_members').select('group_id').in('group_id', ids),
      ])
      setGroups(groupRes.data ?? [])
      const counts: Record<string, number> = {}
      for (const r of allMembers.data ?? []) counts[r.group_id] = (counts[r.group_id] ?? 0) + 1
      setMemberCounts(counts)
    } else {
      setGroups([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void reload() }, [reload])

  const selectedGroup = selectedGroupId ? groups.find(g => g.id === selectedGroupId) ?? null : null

  if (selectedGroup && userId) {
    const isFacilitator = selectedGroup.facilitator_id === userId
    const accepted = !!memberships.find(m => m.group_id === selectedGroup.id)?.agreement_accepted_at
    return (
      <GroupDetail
        group={selectedGroup}
        userId={userId}
        isFacilitator={isFacilitator}
        accepted={accepted}
        onBack={() => setSelectedGroupId(null)}
      />
    )
  }

  return (
    <section className="meetings peer-groups">
      <header className="meetings-head">
        <div>
          <Eyebrow><Users size={12} /> PEER GROUPS</Eyebrow>
          <h1>AI-facilitated peer cohorts.</h1>
          <p className="og-note">
            Each session gets an AI-prepared agenda with discussion questions tailored to your group.
            Members track commitments between sessions.
          </p>
        </div>
        <div className="og-inline" style={{ marginTop: 16 }}>
          <Btn onClick={() => setShowCreate(v => !v)}>
            <Plus size={13} /> {showCreate ? 'Cancel' : 'Create group'}
          </Btn>
        </div>
      </header>

      {showCreate && (
        <CreateGroupForm
          onCreated={() => { setShowCreate(false); void reload() }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {loading ? (
        <p className="og-note"><Loader2 size={14} style={{ display: 'inline', animation: 'reader-spin 1s linear infinite' }} /> Loading your groups…</p>
      ) : !userId ? (
        <p className="og-note">Sign in to see your peer groups.</p>
      ) : groups.length === 0 ? (
        <p className="og-note">You are not in a peer group yet. Create one above or ask your admin to add you.</p>
      ) : (
        <div className="meetings-list">
          {groups.map(g => {
            const accepted = !!memberships.find(m => m.group_id === g.id)?.agreement_accepted_at
            const count = memberCounts[g.id] ?? 1
            const isFacilitator = g.facilitator_id === userId
            return (
              <article key={g.id} className="meetings-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedGroupId(g.id)}>
                <div>
                  <span className="meetings-status" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                    <Users size={11} />
                    {count} of {g.max_size} members
                    {isFacilitator && ' · you facilitate'}
                    {!accepted && ' · agreement needed'}
                  </span>
                  <h3 style={{ margin: '4px 0 6px' }}>{g.name}</h3>
                  {g.description && <p className="og-note" style={{ marginBottom: 4 }}>{g.description}</p>}
                  {g.cadence && <p className="og-note">{g.cadence}</p>}
                </div>
                <div className="og-inline" style={{ marginTop: 8 }}>
                  <Btn>Open group</Btn>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ── Create group form ─────────────────────────────────────────────────────────

function CreateGroupForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cadence, setCadence] = useState('First Tuesday, monthly')
  const [maxSize, setMaxSize] = useState(8)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    if (name.trim().length < 2) { setErr('Give the group a name of at least 2 characters.'); return }
    setBusy(true); setErr('')
    const uid = await currentUserId()
    if (!uid) { setErr('Sign in first.'); setBusy(false); return }
    const { error } = await db.from('peer_groups').insert({
      name: name.trim(),
      description: description.trim(),
      cadence: cadence.trim(),
      facilitator_id: uid,
      max_size: maxSize,
    })
    setBusy(false)
    if (error) { setErr(error.message); return }
    onCreated()
  }

  return (
    <section className="executive-section peer-form" style={{ marginBottom: 24 }}>
      <Eyebrow>NEW PEER GROUP</Eyebrow>
      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        <label style={{ fontSize: 11, color: 'var(--muted)' }}>
          Group name
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Founders past $5M ARR" maxLength={80} style={{ marginTop: 4, display: 'block', width: '100%' }} />
        </label>
        <label style={{ fontSize: 11, color: 'var(--muted)' }}>
          Description
          <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Who is this group for?" maxLength={1000} style={{ marginTop: 4, display: 'block', width: '100%' }} />
        </label>
        <label style={{ fontSize: 11, color: 'var(--muted)' }}>
          Cadence
          <input value={cadence} onChange={e => setCadence(e.target.value)} maxLength={160} style={{ marginTop: 4, display: 'block', width: '100%' }} />
        </label>
        <label style={{ fontSize: 11, color: 'var(--muted)' }}>
          Max members (4–16)
          <input type="number" min={4} max={16} value={maxSize} onChange={e => setMaxSize(Number(e.target.value))} style={{ marginTop: 4, display: 'block', width: 80 }} />
        </label>
        {err && <p className="og-note" style={{ color: 'var(--danger)' }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn disabled={busy} onClick={() => void submit()}>{busy ? 'Creating…' : 'Create group'}</Btn>
          <Btn kind="quiet" onClick={onCancel}>Cancel</Btn>
        </div>
      </div>
    </section>
  )
}

// ── Group detail ──────────────────────────────────────────────────────────────

interface GroupDetailProps {
  group: Group
  userId: string
  isFacilitator: boolean
  accepted: boolean
  onBack: () => void
}

function GroupDetail({ group, userId, isFacilitator, accepted, onBack }: GroupDetailProps) {
  const [tab, setTab] = useState<'agenda' | 'commitments' | 'members'>('agenda')
  const [members, setMembers] = useState<Array<{ user_id: string; name: string; is_facilitator: boolean }>>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await db
        .from('peer_group_members')
        .select('user_id')
        .eq('group_id', group.id)
      const ids = (data ?? []).map((r: any) => r.user_id)
      if (!ids.length) { setMembers([]); return }
      const { data: profiles } = await db.from('profiles').select('id, name').in('id', ids)
      setMembers(
        (profiles ?? []).map((p: any) => ({
          user_id: p.id,
          name: p.name?.trim() || 'A member',
          is_facilitator: p.id === group.facilitator_id,
        }))
      )
    }
    void load()
  }, [group.id, group.facilitator_id])

  return (
    <section className="meetings peer-groups">
      <header className="meetings-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="icon-btn"
            onClick={onBack}
            aria-label="Back to groups"
            title="Back to groups"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <Eyebrow><Users size={12} /> PEER GROUP</Eyebrow>
            <h2 style={{ margin: '2px 0 0', fontSize: 22 }}>{group.name}</h2>
            {group.cadence && <p className="og-note" style={{ marginTop: 2 }}>{group.cadence}</p>}
          </div>
        </div>
      </header>

      {!accepted ? (
        <AgreementGate groupId={group.id} onAccepted={() => window.location.reload()} />
      ) : (
        <>
          <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line-dark)', marginBottom: 20 }}>
            {(['agenda', 'commitments', 'members'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '10px 14px', fontSize: 11, fontWeight: 700,
                  letterSpacing: '.1em', textTransform: 'uppercase',
                  color: tab === t ? 'var(--soft)' : 'var(--muted)',
                  borderBottom: tab === t ? '2px solid var(--cobalt)' : '2px solid transparent',
                }}
              >
                {t === 'agenda' && <><BookOpen size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />Agenda</>}
                {t === 'commitments' && <><CheckSquare size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />Commitments</>}
                {t === 'members' && <><Users size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />Members</>}
              </button>
            ))}
          </nav>

          {tab === 'agenda' && (
            <AgendaTab groupId={group.id} isFacilitator={isFacilitator} groupDescription={group.description} />
          )}
          {tab === 'commitments' && (
            <CommitmentsTab groupId={group.id} userId={userId} />
          )}
          {tab === 'members' && (
            <MembersTab members={members} />
          )}
        </>
      )}
    </section>
  )
}

// ── Agreement gate ────────────────────────────────────────────────────────────

function AgreementGate({ groupId, onAccepted }: { groupId: string; onAccepted: () => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const accept = async () => {
    setBusy(true); setErr('')
    const { error } = await db.rpc('accept_peer_group_agreement', { p_group: groupId })
    setBusy(false)
    if (error) { setErr(error.message); return }
    onAccepted()
  }

  return (
    <section className="executive-section">
      <Eyebrow>CONFIDENTIALITY AGREEMENT</Eyebrow>
      <p className="og-note" style={{ marginTop: 8 }}>
        Before you can see this group's agenda, sessions, and commitments, please accept the confidentiality agreement.
      </p>
      <ul style={{ paddingLeft: 18, margin: '12px 0', fontSize: 13, lineHeight: 1.7, color: 'var(--muted)' }}>
        <li>What is said in this group stays in this group. I will not repeat it, record it, or share screenshots.</li>
        <li>I will not use what I learn here for business advantage against another member.</li>
        <li>I speak from my own experience, and I keep other members' names and companies to myself.</li>
        <li>If I leave the group, these commitments stay with me.</li>
      </ul>
      {err && <p className="og-note" style={{ color: 'var(--danger)' }}>{err}</p>}
      <Btn disabled={busy} onClick={() => void accept()}>
        {busy ? 'Accepting…' : 'I agree — open the group'}
      </Btn>
    </section>
  )
}

// ── Agenda tab ────────────────────────────────────────────────────────────────

function AgendaTab({
  groupId, isFacilitator, groupDescription,
}: {
  groupId: string; isFacilitator: boolean; groupDescription: string
}) {
  const [agenda, setAgenda] = useState<PeerGroupAgenda | null | undefined>(undefined)
  const [generating, setGenerating] = useState(false)
  const [focusHint, setFocusHint] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      const a = await getGroupAgenda({ data: { groupId } })
      setAgenda(a)
    } catch (e) {
      setAgenda(null)
      setErr(e instanceof Error ? e.message : 'Could not load agenda.')
    }
  }, [groupId])

  useEffect(() => { void load() }, [load])

  const generate = async () => {
    setGenerating(true); setErr('')
    try {
      const a = await generateGroupAgenda({ data: { groupId, focusHint: focusHint.trim() || undefined } })
      setAgenda(a)
      setFocusHint('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not generate agenda.')
    }
    setGenerating(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Eyebrow><BookOpen size={12} /> SESSION AGENDA</Eyebrow>
        {isFacilitator && (
          <Btn kind="secondary" disabled={generating} onClick={() => void generate()}>
            {generating ? <Loader2 size={13} style={{ animation: 'reader-spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
            {generating ? 'Generating…' : agenda ? 'Regenerate' : 'Generate agenda'}
          </Btn>
        )}
      </div>

      {isFacilitator && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            Focus hint (optional) — steer the AI toward a theme
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={focusHint}
              onChange={e => setFocusHint(e.target.value)}
              placeholder={`e.g. "Hiring for the next stage" or "${groupDescription?.slice(0, 40) || 'leadership transitions'}"`}
              style={{ flex: 1, background: 'rgba(0,0,0,.28)', border: '1px solid var(--line-dark)', borderRadius: 6, color: 'var(--soft)', font: '400 13px var(--sans)', padding: '7px 9px' }}
            />
          </div>
        </div>
      )}

      {err && <p className="og-note" style={{ color: 'var(--danger)' }}>{err}</p>}

      {agenda === undefined && (
        <p className="og-note"><Loader2 size={13} style={{ display: 'inline', animation: 'reader-spin 1s linear infinite' }} /> Loading agenda…</p>
      )}

      {agenda === null && !err && (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <Clipboard size={28} style={{ color: 'var(--muted)', marginBottom: 8 }} />
          <p className="og-note">No agenda yet for this group.</p>
          {isFacilitator && <p className="og-note">Click "Generate agenda" to have the AI prepare discussion questions for your next session.</p>}
          {!isFacilitator && <p className="og-note">The facilitator will generate the agenda before your next session.</p>}
        </div>
      )}

      {agenda && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <span className="og-note" style={{ display: 'block', marginBottom: 4 }}>
              Session {agenda.session_number} · {new Date(agenda.generated_at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
              {agenda.prepared_by_ai && ' · AI-facilitated'}
            </span>
            {agenda.focus_theme && (
              <h3 style={{ margin: '8px 0 4px', fontSize: 17 }}>{agenda.focus_theme}</h3>
            )}
          </div>

          {Array.isArray(agenda.discussion_questions) && agenda.discussion_questions.length > 0 && (
            <ol style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 12 }}>
              {agenda.discussion_questions.map((q: string, i: number) => (
                <li key={i} style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--soft)' }}>{q}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}

// ── Commitments tab ───────────────────────────────────────────────────────────

function CommitmentsTab({ groupId, userId }: { groupId: string; userId: string }) {
  const [commitments, setCommitments] = useState<PeerGroupCommitment[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await getGroupCommitments({ data: { groupId } })
      setCommitments(rows)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load commitments.')
    }
    setLoading(false)
  }, [groupId])

  useEffect(() => { void load() }, [load])

  const add = async () => {
    if (!newText.trim()) return
    setBusy(true); setErr('')
    try {
      await addCommitment({ data: { groupId, commitment: newText.trim(), dueDate: dueDate || undefined } })
      setNewText(''); setDueDate(''); setAdding(false)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not add commitment.')
    }
    setBusy(false)
  }

  const toggle = async (c: PeerGroupCommitment) => {
    if (c.user_id !== userId) return
    const next = c.status === 'completed' ? 'active' : 'completed'
    try {
      await updateCommitmentStatus({ data: { commitmentId: c.id, status: next } })
      setCommitments(prev => prev.map(x => x.id === c.id ? { ...x, status: next } : x))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update commitment.')
    }
  }

  const mine = commitments.filter(c => c.user_id === userId)
  const peers = commitments.filter(c => c.user_id !== userId)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Eyebrow><CheckSquare size={12} /> COMMITMENTS</Eyebrow>
        <Btn kind="secondary" onClick={() => setAdding(v => !v)}>
          <Plus size={13} /> {adding ? 'Cancel' : 'Add commitment'}
        </Btn>
      </div>

      {adding && (
        <div style={{ background: 'rgba(0,0,0,.2)', border: '1px solid var(--line-dark)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <textarea
            rows={2}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="What do you commit to doing before the next session?"
            maxLength={1000}
            style={{ width: '100%', background: 'rgba(0,0,0,.28)', border: '1px solid var(--line-dark)', borderRadius: 6, color: 'var(--soft)', font: '400 13px var(--sans)', padding: '7px 9px', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              Due by
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                style={{ background: 'rgba(0,0,0,.28)', border: '1px solid var(--line-dark)', borderRadius: 6, color: 'var(--soft)', font: '400 13px var(--sans)', padding: '4px 8px' }} />
            </label>
            <Btn disabled={busy || !newText.trim()} onClick={() => void add()}>
              {busy ? 'Saving…' : 'Save commitment'}
            </Btn>
          </div>
          {err && <p className="og-note" style={{ color: 'var(--danger)', marginTop: 8 }}>{err}</p>}
        </div>
      )}

      {loading && <p className="og-note"><Loader2 size={13} style={{ display: 'inline', animation: 'reader-spin 1s linear infinite' }} /> Loading commitments…</p>}

      {!loading && commitments.length === 0 && (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <CheckSquare size={28} style={{ color: 'var(--muted)', marginBottom: 8 }} />
          <p className="og-note">No commitments yet. Add one above to track what you'll do before the next session.</p>
        </div>
      )}

      {mine.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 10px' }}>
            Your commitments
          </p>
          <CommitmentList items={mine} currentUserId={userId} onToggle={toggle} />
        </div>
      )}

      {peers.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 10px' }}>
            Group commitments
          </p>
          <CommitmentList items={peers} currentUserId={userId} onToggle={toggle} />
        </div>
      )}
    </div>
  )
}

function CommitmentList({
  items, currentUserId, onToggle,
}: {
  items: PeerGroupCommitment[]
  currentUserId: string
  onToggle: (c: PeerGroupCommitment) => void
}) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
      {items.map(c => {
        const isOwn = c.user_id === currentUserId
        const done = c.status === 'completed'
        return (
          <li
            key={c.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px', borderRadius: 8,
              background: done ? 'rgba(0,0,0,.12)' : 'rgba(0,0,0,.2)',
              border: '1px solid var(--line-dark)',
              opacity: done ? 0.6 : 1,
            }}
          >
            <button
              type="button"
              onClick={() => isOwn && onToggle(c)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: isOwn ? 'pointer' : 'default', color: done ? 'var(--cobalt)' : 'var(--muted)', marginTop: 2, flexShrink: 0 }}
              title={isOwn ? (done ? 'Mark as active' : 'Mark as completed') : undefined}
              aria-label={isOwn ? (done ? 'Mark as active' : 'Mark as completed') : 'Peer commitment'}
            >
              {done ? <CheckSquare size={16} /> : <Square size={16} />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--muted)' : 'var(--soft)' }}>{c.commitment}</p>
              <p className="og-note" style={{ marginTop: 3 }}>
                {c.due_date && <>Due {new Date(c.due_date + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · </>}
                {c.status === 'completed' && c.completed_at && <>Completed {new Date(c.completed_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · </>}
                Session {c.session_number}
              </p>
            </div>
            {c.status === 'missed' && (
              <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 700, letterSpacing: '.08em', marginTop: 3, flexShrink: 0 }}>MISSED</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// ── Members tab ───────────────────────────────────────────────────────────────

function MembersTab({ members }: { members: Array<{ user_id: string; name: string; is_facilitator: boolean }> }) {
  return (
    <div>
      <Eyebrow><Users size={12} /> MEMBERS ({members.length})</Eyebrow>
      {members.length === 0 ? (
        <p className="og-note">Loading member list…</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          {members.map(m => (
            <li key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(0,0,0,.2)', border: '1px solid var(--line-dark)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--graphite)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {m.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{m.name}</p>
                {m.is_facilitator && <p className="og-note" style={{ marginTop: 1 }}>Facilitator</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
