import { useState, useEffect, useCallback } from 'react'
import {
  getStorefront,
  upsertStorefront,
  getProposals,
  respondToProposal,
  type Storefront,
  type Proposal,
  type StorefrontService,
  type IntakeQuestion,
} from '@/lib/storefront.functions'
import { supabase } from '@/integrations/supabase/client'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<Proposal['status'], string> = {
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  declined: 'Declined',
  countered: 'Countered',
}

const STATUS_CLASS: Record<Proposal['status'], string> = {
  sent: 'proposal-status--sent',
  viewed: 'proposal-status--viewed',
  accepted: 'proposal-status--accepted',
  declined: 'proposal-status--declined',
  countered: 'proposal-status--countered',
}

// ---------------------------------------------------------------------------
// My Storefront tab
// ---------------------------------------------------------------------------

interface StorefrontEditorProps {
  userId: string
  readOnly?: boolean
}

function StorefrontEditor({ userId, readOnly }: StorefrontEditorProps) {
  const [storefront, setStorefront] = useState<Storefront | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // editable fields
  const [headline, setHeadline] = useState('')
  const [idealClient, setIdealClient] = useState('')
  const [services, setServices] = useState<StorefrontService[]>([])
  const [seeking, setSeeking] = useState<string[]>([])
  const [seekingInput, setSeekingInput] = useState('')
  const [questions, setQuestions] = useState<IntakeQuestion[]>([])
  const [isPublic, setIsPublic] = useState(true)

  useEffect(() => {
    setLoading(true)
    getStorefront({ data: { userId } })
      .then((sf) => {
        if (sf) {
          setStorefront(sf)
          setHeadline(sf.headline ?? '')
          setIdealClient(sf.ideal_client ?? '')
          setServices(sf.services ?? [])
          setSeeking(sf.seeking ?? [])
          setQuestions(sf.intake_questions ?? [])
          setIsPublic(sf.is_public ?? true)
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load storefront'))
      .finally(() => setLoading(false))
  }, [userId])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const updated = await upsertStorefront({
        data: { headline, ideal_client: idealClient, services, seeking, intake_questions: questions, is_public: isPublic },
      })
      setStorefront(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [headline, idealClient, services, seeking, questions, isPublic])

  // service helpers
  const addService = () => setServices((s) => [...s, { title: '', price: undefined, scope: '' }])
  const updateService = (i: number, field: keyof StorefrontService, value: string | number) =>
    setServices((s) => s.map((svc, idx) => (idx === i ? { ...svc, [field]: value } : svc)))
  const removeService = (i: number) => setServices((s) => s.filter((_, idx) => idx !== i))

  // seeking helpers
  const addSeeking = () => {
    const v = seekingInput.trim()
    if (v) { setSeeking((s) => [...s, v]); setSeekingInput('') }
  }
  const removeSeeking = (i: number) => setSeeking((s) => s.filter((_, idx) => idx !== i))

  // question helpers
  const addQuestion = () =>
    setQuestions((q) => [...q, { id: crypto.randomUUID(), label: '', required: false }])
  const updateQuestion = (i: number, field: keyof IntakeQuestion, value: string | boolean) =>
    setQuestions((q) => q.map((qu, idx) => (idx === i ? { ...qu, [field]: value } : qu)))
  const removeQuestion = (i: number) => setQuestions((q) => q.filter((_, idx) => idx !== i))

  if (loading) return <p className="storefront-panel__loading">Loading…</p>

  if (readOnly && storefront) {
    return (
      <div className="storefront-panel__readonly">
        <h2>{storefront.headline ?? 'No headline yet'}</h2>
        {storefront.ideal_client && <p className="storefront-panel__ideal">{storefront.ideal_client}</p>}
        {storefront.services.length > 0 && (
          <section>
            <h3>Services</h3>
            <ul className="storefront-panel__services">
              {storefront.services.map((svc, i) => (
                <li key={i}>
                  <strong>{svc.title}</strong>
                  {svc.price ? ` — $${svc.price.toLocaleString()}` : ''}
                  {svc.scope ? ` (${svc.scope})` : ''}
                </li>
              ))}
            </ul>
          </section>
        )}
        {storefront.seeking.length > 0 && (
          <section>
            <h3>Actively seeking</h3>
            <ul className="storefront-panel__seeking">
              {storefront.seeking.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </section>
        )}
      </div>
    )
  }

  if (readOnly) return <p className="storefront-panel__empty">This member hasn't published a storefront yet.</p>

  return (
    <div className="storefront-panel__editor">
      {error && <p className="storefront-panel__error">{error}</p>}
      {success && <p className="storefront-panel__success">Saved.</p>}

      <label className="storefront-panel__field">
        <span>Headline</span>
        <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Fractional CFO for Series A founders" />
      </label>

      <label className="storefront-panel__field">
        <span>Ideal client</span>
        <textarea value={idealClient} onChange={(e) => setIdealClient(e.target.value)} rows={2} placeholder="Describe who you work best with" />
      </label>

      <section className="storefront-panel__section">
        <div className="storefront-panel__section-header">
          <h3>Services offered</h3>
          <button className="storefront-panel__add-btn" onClick={addService}>+ Add service</button>
        </div>
        {services.map((svc, i) => (
          <div key={i} className="storefront-panel__service-row">
            <input
              placeholder="Service title"
              value={svc.title}
              onChange={(e) => updateService(i, 'title', e.target.value)}
            />
            <input
              type="number"
              placeholder="Price ($)"
              value={svc.price ?? ''}
              onChange={(e) => updateService(i, 'price', Number(e.target.value))}
            />
            <input
              placeholder="Scope / duration"
              value={svc.scope ?? ''}
              onChange={(e) => updateService(i, 'scope', e.target.value)}
            />
            <button className="storefront-panel__remove-btn" onClick={() => removeService(i)} aria-label="Remove service">×</button>
          </div>
        ))}
      </section>

      <section className="storefront-panel__section">
        <div className="storefront-panel__section-header">
          <h3>Actively seeking</h3>
        </div>
        <ul className="storefront-panel__tag-list">
          {seeking.map((s, i) => (
            <li key={i} className="storefront-panel__tag">
              {s}
              <button onClick={() => removeSeeking(i)} aria-label={`Remove ${s}`}>×</button>
            </li>
          ))}
        </ul>
        <div className="storefront-panel__tag-input">
          <input
            value={seekingInput}
            onChange={(e) => setSeekingInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSeeking() } }}
            placeholder="e.g. Board-ready finance"
          />
          <button onClick={addSeeking}>Add</button>
        </div>
      </section>

      <section className="storefront-panel__section">
        <div className="storefront-panel__section-header">
          <h3>Intake questions</h3>
          <button className="storefront-panel__add-btn" onClick={addQuestion}>+ Add question</button>
        </div>
        {questions.map((q, i) => (
          <div key={q.id} className="storefront-panel__question-row">
            <input
              placeholder="Question label"
              value={q.label}
              onChange={(e) => updateQuestion(i, 'label', e.target.value)}
            />
            <label className="storefront-panel__check">
              <input
                type="checkbox"
                checked={q.required ?? false}
                onChange={(e) => updateQuestion(i, 'required', e.target.checked)}
              />
              Required
            </label>
            <button className="storefront-panel__remove-btn" onClick={() => removeQuestion(i)} aria-label="Remove question">×</button>
          </div>
        ))}
      </section>

      <label className="storefront-panel__field storefront-panel__field--row">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        <span>Make storefront public</span>
      </label>

      <button className="storefront-panel__save-btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save storefront'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Proposals tab
// ---------------------------------------------------------------------------

interface CounterDialogProps {
  proposalId: string
  onDone: () => void
  onCancel: () => void
}

function CounterDialog({ proposalId, onDone, onCancel }: CounterDialogProps) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    if (!msg.trim()) return
    setBusy(true)
    try {
      await respondToProposal({ data: { proposalId, status: 'countered', counterMessage: msg } })
      onDone()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="proposal-counter-dialog">
      {err && <p className="storefront-panel__error">{err}</p>}
      <textarea
        rows={3}
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="Your counter-proposal or terms…"
      />
      <div className="proposal-counter-dialog__actions">
        <button onClick={submit} disabled={busy || !msg.trim()}>{busy ? 'Sending…' : 'Send counter'}</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function ProposalsPanel() {
  const [sent, setSent] = useState<Proposal[]>([])
  const [received, setReceived] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [countering, setCountering] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getProposals({})
      .then(({ sent: s, received: r }) => { setSent(s); setReceived(r) })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load proposals'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const respond = async (proposalId: string, status: 'accepted' | 'declined') => {
    try {
      await respondToProposal({ data: { proposalId, status } })
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed')
    }
  }

  if (loading) return <p className="storefront-panel__loading">Loading proposals…</p>
  if (error) return <p className="storefront-panel__error">{error}</p>

  return (
    <div className="storefront-panel__proposals">
      <section>
        <h3>Received ({received.length})</h3>
        {received.length === 0 && <p className="storefront-panel__empty">No proposals received yet.</p>}
        {received.map((p) => (
          <div key={p.id} className="proposal-card">
            <div className="proposal-card__header">
              <strong className="proposal-card__subject">{p.subject}</strong>
              <span className={`proposal-status ${STATUS_CLASS[p.status]}`}>{STATUS_LABEL[p.status]}</span>
            </div>
            <p className="proposal-card__message">{p.message}</p>
            {p.counter_message && (
              <p className="proposal-card__counter"><em>Counter:</em> {p.counter_message}</p>
            )}
            <p className="proposal-card__meta">Received {new Date(p.created_at).toLocaleDateString()}</p>
            {countering === p.id ? (
              <CounterDialog
                proposalId={p.id}
                onDone={() => { setCountering(null); load() }}
                onCancel={() => setCountering(null)}
              />
            ) : (
              (p.status === 'sent' || p.status === 'viewed') && (
                <div className="proposal-card__actions">
                  <button onClick={() => respond(p.id, 'accepted')}>Accept</button>
                  <button onClick={() => respond(p.id, 'declined')}>Decline</button>
                  <button onClick={() => setCountering(p.id)}>Counter</button>
                </div>
              )
            )}
          </div>
        ))}
      </section>

      <section>
        <h3>Sent ({sent.length})</h3>
        {sent.length === 0 && <p className="storefront-panel__empty">No proposals sent yet.</p>}
        {sent.map((p) => (
          <div key={p.id} className="proposal-card proposal-card--sent">
            <div className="proposal-card__header">
              <strong className="proposal-card__subject">{p.subject}</strong>
              <span className={`proposal-status ${STATUS_CLASS[p.status]}`}>{STATUS_LABEL[p.status]}</span>
            </div>
            <p className="proposal-card__message">{p.message}</p>
            {p.counter_message && (
              <p className="proposal-card__counter"><em>Counter from recipient:</em> {p.counter_message}</p>
            )}
            <p className="proposal-card__meta">Sent {new Date(p.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

interface StorefrontPanelProps {
  /** The user whose storefront to display. Defaults to the logged-in user. */
  userId?: string
}

export function StorefrontPanel({ userId: propUserId }: StorefrontPanelProps) {
  const [tab, setTab] = useState<'storefront' | 'proposals'>('storefront')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any).auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      setCurrentUserId(data?.user?.id ?? null)
    })
  }, [])

  const targetUserId = propUserId ?? currentUserId ?? ''
  const isOwn = !propUserId || propUserId === currentUserId

  if (!targetUserId) return <p className="storefront-panel__loading">Loading…</p>

  return (
    <div className="storefront-panel">
      <nav className="storefront-panel__tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'storefront'}
          className={tab === 'storefront' ? 'storefront-panel__tab storefront-panel__tab--active' : 'storefront-panel__tab'}
          onClick={() => setTab('storefront')}
        >
          {isOwn ? 'My Storefront' : 'Storefront'}
        </button>
        {isOwn && (
          <button
            role="tab"
            aria-selected={tab === 'proposals'}
            className={tab === 'proposals' ? 'storefront-panel__tab storefront-panel__tab--active' : 'storefront-panel__tab'}
            onClick={() => setTab('proposals')}
          >
            Proposals
          </button>
        )}
      </nav>

      <div className="storefront-panel__body">
        {tab === 'storefront' && (
          <StorefrontEditor userId={targetUserId} readOnly={!isOwn} />
        )}
        {tab === 'proposals' && isOwn && <ProposalsPanel />}
      </div>
    </div>
  )
}
