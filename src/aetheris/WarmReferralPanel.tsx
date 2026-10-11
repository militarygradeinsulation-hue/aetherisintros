import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw, X, Clock, ArrowRight, Zap } from 'lucide-react'
import {
  generateReferralSuggestions,
  getReferralSuggestions,
  dismissSuggestion,
  snoozeSuggestion,
  requestReferral,
  type ReferralSuggestion,
} from '../lib/warmReferral.functions'
import { Btn } from './ui'

interface IntroDialogProps {
  suggestion: ReferralSuggestion
  onClose: () => void
  onSend: (message: string) => void
  isSending: boolean
}

function IntroDialog({ suggestion, onClose, onSend, isSending }: IntroDialogProps) {
  const [message, setMessage] = useState(
    `Hi ${suggestion.connector_name}, I noticed you know ${suggestion.target_name}. ${suggestion.path_explanation} Would you be willing to make a brief introduction? Happy to do the same for you anytime.`
  )

  return (
    <div className="wr-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="wr-dialog">
        <div className="wr-dialog-head">
          <h3 className="wr-dialog-title">Ask {suggestion.connector_name} for an intro</h3>
          <button className="wr-icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <p className="wr-dialog-sub">
          Introducing you to <strong>{suggestion.target_name}</strong>
          {suggestion.target_title ? `, ${suggestion.target_title}` : ''}
        </p>
        <textarea
          className="wr-msg-input"
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          placeholder="Your message to the connector…"
        />
        <div className="wr-dialog-actions">
          <Btn kind="quiet" onClick={onClose} disabled={isSending}>Cancel</Btn>
          <Btn kind="primary" onClick={() => onSend(message)} disabled={isSending || !message.trim()}>
            {isSending ? <><Loader2 size={13} className="spin" /> Sending…</> : 'Send request'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

function StrengthBadge({ score }: { score: number }) {
  const level = score >= 75 ? 'hot' : score >= 50 ? 'warm' : 'cool'
  return (
    <span className={`wr-badge wr-badge--${level}`}>
      <Zap size={10} />
      {score}
    </span>
  )
}

interface SuggestionCardProps {
  suggestion: ReferralSuggestion
  onAskIntro: (s: ReferralSuggestion) => void
  onDismiss: (id: string) => void
  onSnooze: (id: string) => void
  isActing: boolean
}

function SuggestionCard({ suggestion, onAskIntro, onDismiss, onSnooze, isActing }: SuggestionCardProps) {
  return (
    <div className="wr-card">
      <div className="wr-card-path">
        <span className="wr-you">You</span>
        <ArrowRight size={12} className="wr-arrow" />
        <span className="wr-connector">{suggestion.connector_name}</span>
        <ArrowRight size={12} className="wr-arrow" />
        <span className="wr-target">{suggestion.target_name}</span>
        {suggestion.target_title && <span className="wr-target-title">{suggestion.target_title}</span>}
        <StrengthBadge score={suggestion.strength_score} />
      </div>

      <p className="wr-explanation">{suggestion.path_explanation}</p>

      {suggestion.shared_context && (
        <p className="wr-context">Shared: {suggestion.shared_context}</p>
      )}

      <div className="wr-card-actions">
        <Btn
          kind="primary"
          onClick={() => onAskIntro(suggestion)}
          disabled={isActing}
          className="wr-ask-btn"
        >
          Ask {suggestion.connector_name} for intro
        </Btn>
        <button
          className="wr-icon-btn wr-dismiss"
          onClick={() => onSnooze(suggestion.id)}
          disabled={isActing}
          title="Snooze 7 days"
          aria-label="Snooze 7 days"
        >
          <Clock size={14} />
        </button>
        <button
          className="wr-icon-btn wr-dismiss"
          onClick={() => onDismiss(suggestion.id)}
          disabled={isActing}
          title="Dismiss"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

export function WarmReferralPanel() {
  const queryClient = useQueryClient()
  const [activeDialog, setActiveDialog] = useState<ReferralSuggestion | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  const getSuggestionsFn = useServerFn(getReferralSuggestions)
  const generateFn = useServerFn(generateReferralSuggestions)
  const dismissFn = useServerFn(dismissSuggestion)
  const snoozeFn = useServerFn(snoozeSuggestion)
  const requestFn = useServerFn(requestReferral)

  const { data: suggestions = [], isLoading, isError } = useQuery<ReferralSuggestion[]>({
    queryKey: ['warm-referrals'],
    queryFn: () => getSuggestionsFn({}),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const generateMutation = useMutation({
    mutationFn: () => generateFn({}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warm-referrals'] })
    },
  })

  async function handleDismiss(id: string) {
    setActingId(id)
    try {
      await dismissFn({ data: { suggestionId: id } })
      queryClient.setQueryData<ReferralSuggestion[]>(['warm-referrals'], prev =>
        (prev ?? []).filter(s => s.id !== id)
      )
    } finally {
      setActingId(null)
    }
  }

  async function handleSnooze(id: string) {
    setActingId(id)
    try {
      await snoozeFn({ data: { suggestionId: id, days: 7 } })
      queryClient.setQueryData<ReferralSuggestion[]>(['warm-referrals'], prev =>
        (prev ?? []).filter(s => s.id !== id)
      )
    } finally {
      setActingId(null)
    }
  }

  async function handleSendRequest(message: string) {
    if (!activeDialog) return
    const suggestion = activeDialog
    setActingId(suggestion.id)
    try {
      await requestFn({
        data: {
          suggestionId: suggestion.id,
          connectorId: suggestion.connector_user_id ?? '',
          targetId: suggestion.target_user_id ?? '',
          message,
        },
      })
      setActiveDialog(null)
      queryClient.setQueryData<ReferralSuggestion[]>(['warm-referrals'], prev =>
        (prev ?? []).filter(s => s.id !== suggestion.id)
      )
    } finally {
      setActingId(null)
    }
  }

  const isRefreshing = generateMutation.isPending

  return (
    <section className="wr-panel">
      <style>{STYLES}</style>

      <div className="wr-header">
        <div>
          <h2 className="wr-title">Warm Paths to New Connections</h2>
          <p className="wr-subtitle">AI-surfaced intros through people you already trust</p>
        </div>
        <button
          className="wr-refresh-btn"
          onClick={() => generateMutation.mutate()}
          disabled={isRefreshing}
          aria-label="Refresh suggestions"
        >
          <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="wr-body">
        {(isLoading || isRefreshing) && (
          <div className="wr-empty">
            <Loader2 size={18} className="spin" />
            <p>Generating your warm paths…</p>
          </div>
        )}

        {!isLoading && !isRefreshing && isError && (
          <div className="wr-empty">
            <p>Could not load suggestions. Try refreshing.</p>
          </div>
        )}

        {!isLoading && !isRefreshing && !isError && suggestions.length === 0 && (
          <div className="wr-empty">
            <p>No suggestions right now — check back tomorrow, or hit Refresh to generate new paths.</p>
          </div>
        )}

        {!isLoading && !isRefreshing && suggestions.map(s => (
          <SuggestionCard
            key={s.id}
            suggestion={s}
            onAskIntro={setActiveDialog}
            onDismiss={handleDismiss}
            onSnooze={handleSnooze}
            isActing={actingId === s.id}
          />
        ))}
      </div>

      {activeDialog && (
        <IntroDialog
          suggestion={activeDialog}
          onClose={() => setActiveDialog(null)}
          onSend={handleSendRequest}
          isSending={actingId === activeDialog.id}
        />
      )}
    </section>
  )
}

const STYLES = `
.wr-panel {
  --wr-bg: #0e0f11;
  --wr-surface: #16181c;
  --wr-border: rgba(255,255,255,.08);
  --wr-text: #e8eaed;
  --wr-muted: #8b909a;
  --wr-accent: #6c63ff;
  --wr-hot: #f59e0b;
  --wr-warm: #10b981;
  --wr-cool: #6b7280;
  --wr-radius: 10px;
  padding: 24px 16px;
  max-width: 680px;
  margin: 0 auto;
  font-family: inherit;
  color: var(--wr-text);
}

@media (prefers-color-scheme: light) {
  .wr-panel {
    --wr-bg: #f9fafb;
    --wr-surface: #ffffff;
    --wr-border: rgba(0,0,0,.08);
    --wr-text: #111827;
    --wr-muted: #6b7280;
  }
}

.wr-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.wr-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
  letter-spacing: -.01em;
}

.wr-subtitle {
  font-size: 13px;
  color: var(--wr-muted);
  margin: 0;
}

.wr-refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 7px;
  border: 1px solid var(--wr-border);
  background: var(--wr-surface);
  color: var(--wr-text);
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity .15s;
}

.wr-refresh-btn:disabled { opacity: .5; cursor: default; }
.wr-refresh-btn:not(:disabled):hover { opacity: .8; }

.wr-body { display: flex; flex-direction: column; gap: 12px; }

.wr-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 16px;
  color: var(--wr-muted);
  font-size: 14px;
  text-align: center;
}

.wr-card {
  background: var(--wr-surface);
  border: 1px solid var(--wr-border);
  border-radius: var(--wr-radius);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wr-card-path {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
}

.wr-you { color: var(--wr-muted); }
.wr-arrow { color: var(--wr-muted); flex-shrink: 0; }
.wr-connector { color: var(--wr-accent); }
.wr-target { color: var(--wr-text); }
.wr-target-title { font-size: 12px; color: var(--wr-muted); font-weight: 400; }

.wr-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 600;
}

.wr-badge--hot { background: rgba(245,158,11,.15); color: var(--wr-hot); }
.wr-badge--warm { background: rgba(16,185,129,.15); color: var(--wr-warm); }
.wr-badge--cool { background: rgba(107,114,128,.15); color: var(--wr-cool); }

.wr-explanation {
  font-size: 13px;
  color: var(--wr-text);
  margin: 0;
  line-height: 1.5;
}

.wr-context {
  font-size: 12px;
  color: var(--wr-muted);
  margin: 0;
  font-style: italic;
}

.wr-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.wr-ask-btn { flex: 1; justify-content: center; }

.wr-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 7px;
  border: 1px solid var(--wr-border);
  background: transparent;
  color: var(--wr-muted);
  cursor: pointer;
  transition: color .15s, background .15s;
  flex-shrink: 0;
}

.wr-icon-btn:not(:disabled):hover {
  color: var(--wr-text);
  background: var(--wr-border);
}

.wr-icon-btn:disabled { opacity: .4; cursor: default; }

/* Dialog overlay */
.wr-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.wr-dialog {
  background: var(--wr-surface);
  border: 1px solid var(--wr-border);
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wr-dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.wr-dialog-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
}

.wr-dialog-sub {
  font-size: 13px;
  color: var(--wr-muted);
  margin: 0;
}

.wr-msg-input {
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--wr-border);
  background: var(--wr-bg);
  color: var(--wr-text);
  font-size: 13px;
  padding: 10px 12px;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
  box-sizing: border-box;
}

.wr-msg-input:focus {
  outline: none;
  border-color: var(--wr-accent);
}

.wr-dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`
