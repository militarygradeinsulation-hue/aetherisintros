import { useEffect, useRef, useState } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

type ChatMessage = { id: string; meeting_id: string; sender_id: string; body: string; created_at: string }

/** In-meeting text chat for participants; live updates via realtime, access enforced by the database. */
export function MeetingChat({ meetingId, userId, names }: { meetingId: string; userId: string; names?: Record<string, string> }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    let active = true
    supabase.from('meeting_chat_messages').select('*').eq('meeting_id', meetingId).order('created_at').limit(300)
      .then(({ data, error }) => { if (!active) return; if (error) setError('Chat is unavailable right now.'); else setMessages((data ?? []) as ChatMessage[]) })
    const channel = supabase.channel(`meeting-chat-${meetingId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meeting_chat_messages', filter: `meeting_id=eq.${meetingId}` }, (p) => {
        const m = p.new as ChatMessage
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m])
      }).subscribe()
    return () => { active = false; supabase.removeChannel(channel) }
  }, [meetingId])

  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight }, [messages.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true); setError(null)
    const { data, error } = await supabase.from('meeting_chat_messages').insert({ meeting_id: meetingId, sender_id: userId, body: body.slice(0, 2000) }).select().single()
    setSending(false)
    if (error) { setError('Message not sent. Try again.'); return }
    setDraft('')
    if (data) setMessages((prev) => prev.some((x) => x.id === data.id) ? prev : [...prev, data as ChatMessage])
  }

  return (
    <details className="meeting-brief-inline meeting-chat" open>
      <summary><MessageSquare size={14} /> Messages{messages.length ? ` (${messages.length})` : ''}</summary>
      <ol ref={listRef} className="meeting-chat-list" aria-live="polite">
        {messages.length === 0 && <li className="meeting-chat-empty">No messages yet. Share a link or a quick note with everyone here.</li>}
        {messages.map((m) => (
          <li key={m.id} className={m.sender_id === userId ? 'is-mine' : ''}>
            <span className="meeting-chat-meta">{m.sender_id === userId ? 'You' : (names?.[m.sender_id] ?? 'Participant')} · {new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            <p>{m.body}</p>
          </li>
        ))}
      </ol>
      {error && <p className="meeting-chat-error" role="alert">{error}</p>}
      <form className="meeting-chat-form" onSubmit={send}>
        <label className="sr-only" htmlFor={`meeting-chat-${meetingId}`}>Message everyone in this meeting</label>
        <input id={`meeting-chat-${meetingId}`} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} placeholder="Message everyone…" />
        <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message"><Send size={14} /></button>
      </form>
    </details>
  )
}
