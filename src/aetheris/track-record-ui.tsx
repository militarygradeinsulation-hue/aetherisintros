/**
 * Verified Track Record — public proof points on member profiles showing
 * closed deals, delivered milestones, and real outcomes.
 */
import { useState } from 'react'
import { Briefcase, CheckCircle, Handshake, Wrench, ShieldCheck, Plus, X } from 'lucide-react'
import { getTrackRecord, addTrackRecordEntry, type TrackRecordEntry } from '@/lib/trackRecord.functions'
import { Btn, Eyebrow } from './ui'

const KIND_LABELS: Record<TrackRecordEntry['kind'], string> = {
  deal_closed: 'Deal Closed',
  milestone_delivered: 'Milestone Delivered',
  intro_led_to_deal: 'Intro Led to Deal',
  service_delivered: 'Service Delivered',
}

const KIND_ICONS: Record<TrackRecordEntry['kind'], React.ReactNode> = {
  deal_closed: <Briefcase size={14} />,
  milestone_delivered: <CheckCircle size={14} />,
  intro_led_to_deal: <Handshake size={14} />,
  service_delivered: <Wrench size={14} />,
}

export function TrackRecordPanel({ userId, editable = false }: { userId: string; editable?: boolean }) {
  const [entries, setEntries] = useState<TrackRecordEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const load = async () => {
    if (loading || entries !== null) return
    setLoading(true)
    try {
      const rows = await getTrackRecord({ data: { userId } })
      setEntries(rows)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  // Load on first render
  if (entries === null && !loading) void load()

  const onAdded = (entry: TrackRecordEntry) => {
    setEntries(prev => prev ? [entry, ...prev] : [entry])
    setShowModal(false)
  }

  return (
    <div className="track-record">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <Eyebrow>TRACK RECORD</Eyebrow>
        {editable && (
          <Btn kind="secondary" onClick={() => setShowModal(true)}>
            <Plus size={12} /> Add outcome
          </Btn>
        )}
      </div>

      {loading && <p style={{ fontSize: '.8rem', color: 'var(--muted)' }}>Loading…</p>}

      {!loading && entries !== null && entries.length === 0 && (
        <p style={{ fontSize: '.85rem', color: 'var(--muted)' }}>No track record yet.</p>
      )}

      {entries && entries.map(entry => (
        <div key={entry.id} className="track-record-card">
          <div className="track-record-kind">
            {KIND_ICONS[entry.kind]} {KIND_LABELS[entry.kind]}
            {entry.verified && (
              <span className="track-record-verified">
                <ShieldCheck size={11} /> Verified
              </span>
            )}
          </div>
          <strong style={{ fontSize: '.95rem' }}>{entry.title}</strong>
          {entry.counterparty_name && (
            <p style={{ fontSize: '.8rem', color: 'var(--muted)', margin: '.25rem 0 0' }}>
              with {entry.counterparty_name}
            </p>
          )}
          {entry.description && (
            <p style={{ fontSize: '.82rem', color: 'var(--muted)', marginTop: '.4rem', lineHeight: 1.5 }}>
              {entry.description}
            </p>
          )}
        </div>
      ))}

      {showModal && (
        <AddTrackRecordModal onClose={() => setShowModal(false)} onAdded={onAdded} />
      )}
    </div>
  )
}

const KINDS: TrackRecordEntry['kind'][] = ['deal_closed', 'milestone_delivered', 'intro_led_to_deal', 'service_delivered']

export function AddTrackRecordModal({ onClose, onAdded }: { onClose: () => void; onAdded: (entry: TrackRecordEntry) => void }) {
  const [form, setForm] = useState({
    kind: 'deal_closed' as TrackRecordEntry['kind'],
    title: '',
    counterpartyName: '',
    description: '',
    isPublic: true,
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    if (!form.title.trim()) { setErr('Title is required.'); return }
    setBusy(true)
    setErr('')
    try {
      const row = await addTrackRecordEntry({
        data: {
          kind: form.kind,
          title: form.title.trim(),
          counterpartyName: form.counterpartyName.trim() || undefined,
          description: form.description.trim() || undefined,
          isPublic: form.isPublic,
        },
      })
      onAdded(row)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-wrap" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <header>
          <div>
            <Eyebrow>ADD OUTCOME</Eyebrow>
            <h2>Record a real result</h2>
            <p>Deals closed, milestones hit, services delivered — not claims, outcomes.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={18} />
          </button>
        </header>

        <div className="need-form" style={{ marginTop: '1.5rem' }}>
          <label>
            <span>Type</span>
            <select value={form.kind} onChange={e => setForm(v => ({ ...v, kind: e.target.value as TrackRecordEntry['kind'] }))}>
              {KINDS.map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
            </select>
          </label>

          <label>
            <span>Title *</span>
            <input
              type="text"
              value={form.title}
              maxLength={200}
              placeholder="e.g. Closed Series A financing"
              onChange={e => setForm(v => ({ ...v, title: e.target.value }))}
              style={{ background: 'var(--night)', color: 'var(--soft)', border: '1px solid var(--line-dark)', padding: '8px 10px', width: '100%', borderRadius: '4px' }}
            />
          </label>

          <label>
            <span>Counterparty (optional)</span>
            <input
              type="text"
              value={form.counterpartyName}
              maxLength={120}
              placeholder="Company or person name"
              onChange={e => setForm(v => ({ ...v, counterpartyName: e.target.value }))}
              style={{ background: 'var(--night)', color: 'var(--soft)', border: '1px solid var(--line-dark)', padding: '8px 10px', width: '100%', borderRadius: '4px' }}
            />
          </label>

          <label>
            <span>Description (optional)</span>
            <textarea
              rows={3}
              maxLength={800}
              value={form.description}
              placeholder="Brief context — what happened, why it matters"
              onChange={e => setForm(v => ({ ...v, description: e.target.value }))}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.75rem' }}>
            <input type="checkbox" checked={form.isPublic} onChange={e => setForm(v => ({ ...v, isPublic: e.target.checked }))} />
            <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>Visible on your public profile</span>
          </label>
        </div>

        {err && <p style={{ color: 'var(--danger, #e05252)', fontSize: '.8rem', marginTop: '.5rem' }}>{err}</p>}

        <footer>
          <Btn kind="quiet" disabled={busy} onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" disabled={busy} onClick={() => void submit()}>
            {busy ? 'Saving…' : 'Save outcome'}
          </Btn>
        </footer>
      </div>
    </div>
  )
}
