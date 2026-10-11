/**
 * Warm Referral Engine: lets members refer someone they know to someone else in the network.
 * Triggered after a deal closes ("Who else needs what X needed?") or standalone from nav.
 * Referrals are tracked with status from pending → sent → connected → closed.
 */
import { ArrowRight, CheckCircle, Clock, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createReferral, getMyReferrals, markReferralConnected } from '@/lib/referrals.functions'
import { Btn, Eyebrow } from './ui'

type Referral = {
  id: string
  referred_name: string
  referred_to_name: string
  personal_note: string
  status: string
  created_at: string
  connected_at: string | null
}

/* ── Status badge ─────────────────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`referral-status ${status === 'connected' || status === 'closed' ? 'connected' : 'pending'}`}>
      {status}
    </span>
  )
}

/* ── Single referral card ─────────────────────────────────────────────────────────────── */
export function ReferralCard({ referral, onMarkConnected }: { referral: Referral; onMarkConnected: (id: string) => void }) {
  const [busy, setBusy] = useState(false)
  const canConnect = referral.status === 'sent' || referral.status === 'pending'

  const handleConnect = async () => {
    setBusy(true)
    try {
      await markReferralConnected({ data: { referralId: referral.id } })
      onMarkConnected(referral.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="referral-card">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.25rem' }}>
          <strong style={{ fontSize: '.9rem' }}>{referral.referred_name}</strong>
          <ArrowRight size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
          <strong style={{ fontSize: '.9rem' }}>{referral.referred_to_name}</strong>
          <StatusBadge status={referral.status} />
        </div>
        {referral.personal_note && (
          <p style={{ margin: 0, fontSize: '.85rem', opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {referral.personal_note}
          </p>
        )}
        <small style={{ opacity: 0.5, fontSize: '.75rem' }}>
          {new Date(referral.created_at).toLocaleDateString()}
          {referral.connected_at && ` · connected ${new Date(referral.connected_at).toLocaleDateString()}`}
        </small>
      </div>
      {canConnect && (
        <Btn kind="quiet" disabled={busy} onClick={() => void handleConnect()}>
          <CheckCircle size={14} /> Mark Connected
        </Btn>
      )}
    </div>
  )
}

/* ── Referral composer form ───────────────────────────────────────────────────────────── */
export function ReferralComposer({
  defaultReferredName = '',
  defaultReferredToName = '',
  sourceDealRoomId,
  promptText,
  onDone,
}: {
  defaultReferredName?: string
  defaultReferredToName?: string
  sourceDealRoomId?: string
  promptText?: string
  onDone?: () => void
}) {
  const [referredName, setReferredName] = useState(defaultReferredName)
  const [referredToName, setReferredToName] = useState(defaultReferredToName)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!referredName.trim() || !referredToName.trim()) return
    setBusy(true)
    setError('')
    try {
      // Names are passed as UUIDs here via a lookup; for now we store the name as a placeholder
      // In production these would be resolved to real profile UUIDs via a people picker
      await createReferral({
        data: {
          referredId: referredName.trim(),
          referredToId: referredToName.trim(),
          personalNote: note.trim(),
          sourceDealRoomId,
        }
      })
      setSent(true)
      onDone?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save referral.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="referral-composer" style={{ textAlign: 'center', padding: '2rem' }}>
        <CheckCircle size={28} style={{ color: '#22c55e', marginBottom: '.5rem' }} />
        <p style={{ margin: 0, fontWeight: 600 }}>Referral noted — thank you.</p>
      </div>
    )
  }

  return (
    <form className="referral-composer" onSubmit={e => void handleSubmit(e)}>
      {promptText && <p style={{ marginTop: 0, fontWeight: 600 }}>{promptText}</p>}
      <div style={{ display: 'grid', gap: '.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
          <label style={{ display: 'grid', gap: '.25rem', fontSize: '.85rem' }}>
            <span style={{ opacity: 0.6, fontWeight: 600, textTransform: 'uppercase', fontSize: '.7rem', letterSpacing: '.05em' }}>Referring</span>
            <input
              className="deals-input"
              placeholder="Name or email"
              value={referredName}
              onChange={e => setReferredName(e.target.value)}
              required
            />
          </label>
          <label style={{ display: 'grid', gap: '.25rem', fontSize: '.85rem' }}>
            <span style={{ opacity: 0.6, fontWeight: 600, textTransform: 'uppercase', fontSize: '.7rem', letterSpacing: '.05em' }}>To</span>
            <input
              className="deals-input"
              placeholder="Name or email"
              value={referredToName}
              onChange={e => setReferredToName(e.target.value)}
              required
            />
          </label>
        </div>
        <label style={{ display: 'grid', gap: '.25rem', fontSize: '.85rem' }}>
          <span style={{ opacity: 0.6, fontWeight: 600, textTransform: 'uppercase', fontSize: '.7rem', letterSpacing: '.05em' }}>Personal note</span>
          <textarea
            className="deals-input"
            placeholder="Why these two should meet..."
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </label>
        {error && <p style={{ margin: 0, color: '#ef4444', fontSize: '.85rem' }}>{error}</p>}
        <Btn disabled={busy || !referredName.trim() || !referredToName.trim()}>
          <Users size={14} /> Send Referral
        </Btn>
      </div>
    </form>
  )
}

/* ── Post-deal referral prompt (modal-style) ─────────────────────────────────────────── */
export function PostDealReferralPrompt({
  dealTitle,
  dealRoomId,
  onClose,
}: {
  dealTitle: string
  dealRoomId: string
  onClose: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: 'var(--bg-1, #fff)', borderRadius: 12, padding: '1.5rem',
        maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <Eyebrow>DEAL CLOSED</Eyebrow>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Who else needs what {dealTitle} needed?</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: '1.2rem', lineHeight: 1 }}
            aria-label="Dismiss"
          >×</button>
        </div>
        <ReferralComposer
          sourceDealRoomId={dealRoomId}
          promptText={undefined}
          onDone={onClose}
        />
        <button
          onClick={onClose}
          style={{ marginTop: '.75rem', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: '.85rem', width: '100%' }}
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

/* ── Referrals page ───────────────────────────────────────────────────────────────────── */
export function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const rows = await getMyReferrals()
      setReferrals(rows as Referral[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load referrals.')
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => { void load() }, [])

  const handleMarkConnected = (id: string) => {
    setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: 'connected', connected_at: new Date().toISOString() } : r))
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1.5rem' }}>
        <Users size={20} />
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Referrals</h1>
      </div>

      <ReferralComposer />

      {!loaded && <p style={{ opacity: 0.5, fontSize: '.9rem' }}>Loading…</p>}
      {loaded && error && <p style={{ color: '#ef4444', fontSize: '.9rem' }}>{error}</p>}
      {loaded && !error && referrals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.5 }}>
          <Clock size={32} style={{ marginBottom: '.75rem' }} />
          <p style={{ margin: 0 }}>No referrals yet. Use the form above to refer someone to someone else.</p>
        </div>
      )}
      {loaded && referrals.length > 0 && (
        <div>
          <Eyebrow style={{ marginBottom: '.75rem' }}>YOUR REFERRALS · {referrals.length}</Eyebrow>
          {referrals.map(r => (
            <ReferralCard key={r.id} referral={r} onMarkConnected={handleMarkConnected} />
          ))}
        </div>
      )}
    </div>
  )
}
