import { useEffect, useMemo, useRef, useState } from 'react'
import { Send, Search, MessageSquare } from 'lucide-react'
import { useNetwork } from '@/aetheris/store'
import { AttachButton, MessageBody, attachmentPreview } from '@/aetheris/MessageAttachments'
import { loadReadReceiptsSetting, markThreadRead, saveReadReceiptsSetting, useUnreadCounts } from '@/aetheris/read-receipts'
import { badgeLabel, seenUnderMessageId, shouldMarkRead } from '@/aetheris/messaging-state'
import { OpenDealRoomButton } from '@/aetheris/deals-ui'
import { draftTitle } from '@/aetheris/deals-core'
import { MeetingBriefPanel } from '@/aetheris/meeting-brief-ui'
import { StartWorkspaceButton } from '@/aetheris/workspaces/StartWorkspace'

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
const pageVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible'

/** Native editorial-noir messaging, wired to the live member threads and file attachments. */
function Inner({ onOpenWorkspaces }: { onOpenWorkspaces?: () => void }) {
  const net = useNetwork()
  const [activeId, setActiveId] = useState<string>(() => (typeof window === 'undefined' ? '' : localStorage.getItem('aetheris-intros-thread') ?? ''))
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [briefThreadId, setBriefThreadId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [readError, setReadError] = useState('')
  const [failed, setFailed] = useState<{ id: string; threadId: string; text: string; reason: string } | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const byId = useMemo(() => new Map(net.members.map(m => [m.id, m])), [net.members])
  const threads = net.threads.filter(t => {
    const m = byId.get(t.memberId)
    return !query || (m?.name ?? '').toLowerCase().includes(query.toLowerCase())
  })
  const active = net.threads.find(t => t.id === activeId) ?? threads[0]
  const person = active ? byId.get(active.memberId) : undefined
  useEffect(() => { if (active) localStorage.setItem('aetheris-intros-thread', active.id) }, [active?.id])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [active?.id, active?.messages.length])

  const reads = useUnreadCounts()
  const activeState = active ? reads.threads[active.id] : undefined
  const activeUnread = activeState?.unread ?? 0
  const lastMessageId = active?.messages[active.messages.length - 1]?.id
  // Mark the open conversation read while it is on screen, and again when you come back to the tab.
  useEffect(() => {
    if (!active) return
    const check = () => {
      if (shouldMarkRead({ threadId: active.id, pageVisible: pageVisible(), unread: activeUnread, fallbackUnread: !reads.loaded && active.unread })) void markThreadRead(active.id).then(() => setReadError('')).catch(error => setReadError(error instanceof Error ? error.message : 'Unread state could not be saved.'))
    }
    check()
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => { document.removeEventListener('visibilitychange', check); window.removeEventListener('focus', check) }
  }, [active?.id, activeUnread, lastMessageId, reads.loaded])
  const seenId = active ? seenUnderMessageId(active.messages, activeState?.seenMessageId) : null

  const [receipts, setReceipts] = useState<boolean | null>(null)
  const [receiptsNote, setReceiptsNote] = useState('')
  useEffect(() => { void loadReadReceiptsSetting().then(setReceipts) }, [])
  const toggleReceipts = async () => {
    if (receipts === null) return
    const next = !receipts
    setReceipts(next)
    try { await saveReadReceiptsSetting(next); setReceiptsNote('') }
    catch { setReceipts(!next); setReceiptsNote('Could not save that. Try again.') }
  }

  const sendText = async (threadId: string, text: string, messageId?: string) => {
    if (!text.trim() || sending) return
    const id = messageId ?? crypto.randomUUID()
    setSending(true)
    setFailed(null)
    try {
      const confirmedThreadId = await net.sendMessage(threadId, text, id)
      if (confirmedThreadId && confirmedThreadId !== threadId) setActiveId(confirmedThreadId)
      if (active?.id === threadId) setDraft(current => current.trim() === text.trim() ? '' : current)
    } catch (cause) {
      setFailed({ id, threadId, text, reason: cause instanceof Error ? cause.message : 'Not sent. Retry this message.' })
      setDraft(current => current.trim() ? current : text)
    } finally {
      setSending(false)
    }
  }
  const send = () => { if (active && draft.trim()) void sendText(active.id, draft.trim(), failed?.threadId === active.id && failed.text === draft.trim() ? failed.id : undefined) }

  return (
    <div className="max-w-[1400px] mx-auto px-3 md:px-6 py-4 ix-live-messages">
      <div className="mb-3">
        <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-[var(--msg-muted)]">Private communication</p>
        <h1 className="font-serif-editorial text-2xl md:text-3xl text-[var(--msg-ink)]">Conversations with <em className="text-[var(--msg-copper)]">relationship context.</em></h1>
      </div>
      {readError && <div role="alert" className="mb-2 p-2 border border-red-400/40 bg-[#fff0ed] text-xs text-[#8e302b] rounded">{readError} <button type="button" className="underline font-semibold" onClick={() => { if (active) void markThreadRead(active.id).then(() => setReadError('')).catch(() => {}) }}>Retry</button></div>}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[300px_1fr_260px] gap-3 h-[calc(100vh-210px)] min-h-[480px]">
        <aside className={`rounded-xl border border-[var(--msg-border)] bg-[var(--msg-panel)] flex flex-col min-h-0 ${active ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b border-[var(--msg-border)] relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--msg-muted)]" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search conversations"
              className="w-full bg-[var(--msg-panel-inset)] text-xs text-[var(--msg-ink)] rounded-lg pl-8 pr-3 py-2 border border-[var(--msg-border)] focus:outline-none focus:border-[var(--msg-accent)]" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 && <p className="p-4 text-xs text-[var(--msg-muted)]">No conversations yet. Open a member's profile and choose Message to start one.</p>}
            {threads.map(t => {
              const m = byId.get(t.memberId)
              const last = t.messages[t.messages.length - 1]
              const on = active?.id === t.id
              const count = reads.loaded ? (reads.threads[t.id]?.unread ?? 0) : (t.unread ? 1 : 0)
              const label = reads.loaded ? badgeLabel(count) : ''
              return (
                <button key={t.id} type="button" data-selected={on} aria-current={on ? 'true' : undefined} onClick={() => setActiveId(t.id)}
                  className={`msg-thread-tile w-full text-left px-3 py-3 border-b border-[var(--msg-border)] flex gap-3 cursor-pointer ${on ? 'bg-[var(--msg-selected)]' : 'hover:bg-[var(--msg-selected)]'}`}>
                  <div className="w-9 h-9 shrink-0 rounded-full bg-[var(--msg-incoming)] border border-[var(--msg-border)] flex items-center justify-center text-[11px] text-[var(--msg-ink)]">
                    {(m?.name ?? '?').split(' ').map(s => s[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${count > 0 ? 'text-[var(--msg-ink)] font-semibold' : 'text-[var(--msg-ink)]'}`}>{m?.name ?? 'Member'}</span>
                      {count > 0 && (label
                        ? <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--msg-accent)] text-[10px] font-semibold text-[var(--msg-accent-ink)] flex items-center justify-center shrink-0" aria-label={`${count} unread`}>{label}</span>
                        : <span className="w-2 h-2 rounded-full bg-[var(--msg-accent)] shrink-0" aria-label="Unread" />)}
                    </div>
                    <p className="text-[11px] text-[var(--msg-muted)] truncate">{last ? attachmentPreview(last.text) : t.introContext}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="p-3 border-t border-[var(--msg-border)] space-y-1">
            <label className="flex items-center justify-between gap-2 text-xs text-[var(--msg-body)] cursor-pointer">
              <span>Read receipts</span>
              <input type="checkbox" checked={receipts ?? true} disabled={receipts === null} onChange={() => void toggleReceipts()} className="accent-[#F5B027]" />
            </label>
            <p className="text-[11px] text-[var(--msg-muted)]">{receipts === false
              ? 'Off: nobody sees when you have read their messages, and you do not see when they read yours.'
              : 'On: the people you message see "Seen" once you have read their message. Turn off to hide it both ways.'}</p>
            {receiptsNote && <p className="text-[11px] text-[var(--msg-copper)]" role="alert">{receiptsNote}</p>}
          </div>
        </aside>

        <section className={`rounded-xl border border-[var(--msg-border)] bg-[var(--msg-panel)] flex-col min-h-0 ${active ? 'flex' : 'hidden md:flex'}`}>
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[var(--msg-muted)]">
              <MessageSquare className="w-6 h-6 mb-2 text-[var(--msg-copper)]" />
              <p className="text-sm">Select a conversation.</p>
            </div>
          ) : (<>
            <header className="px-4 py-3 border-b border-[var(--msg-border)] flex items-center gap-3">
              <button onClick={() => setActiveId('')} className="md:hidden text-xs text-[var(--msg-copper)] cursor-pointer">← Back</button>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--msg-ink)] truncate">{person?.name ?? 'Member'}</p>
                <p className="text-[11px] text-[var(--msg-muted)] truncate">{[person?.title, person?.company].filter(Boolean).join(' · ')}</p>
              </div>
              {person && <div className="ml-auto min-w-0 flex flex-wrap items-center justify-end gap-2">
                {isUuid(person.id) && isUuid(active.id) && <button type="button"
                  onClick={() => setBriefThreadId(id => id === active.id ? null : active.id)}
                  aria-expanded={briefThreadId === active.id}
                  aria-controls="active-member-meeting-brief"
                  className="msg-meeting-brief-trigger inline-flex min-h-10 items-center justify-center px-3 text-xs border border-[var(--msg-border)] bg-[var(--msg-panel-inset)] text-[var(--msg-ink)] hover:bg-[var(--msg-selected)] cursor-pointer">
                  {briefThreadId === active.id ? 'Hide brief' : 'Pre-meeting brief'}
                </button>}
                {onOpenWorkspaces && isUuid(active.id) && <StartWorkspaceButton source="dm_thread" sourceId={active.id} withName={person.name} onOpen={onOpenWorkspaces} label="Workspace" />}
                <OpenDealRoomButton kind="quiet" label="Deal room" draft={{ sourceKind: 'thread', sourceId: active.id, title: draftTitle('thread', person.name), need: active.introContext ?? '', counterpartId: person.id, counterpartName: person.name }} />
              </div>}
            </header>
            {briefThreadId === active.id && person && isUuid(person.id) && isUuid(active.id) && <div id="active-member-meeting-brief" className="msg-meeting-brief-panel overflow-y-auto px-4 py-3 border-b border-[var(--msg-border)]" style={{ maxHeight: 'min(44vh, 420px)' }}>
              <MeetingBriefPanel key={person.id} otherUserId={person.id} otherName={person.name} />
            </div>}
            <div className="msg-live-chat-body flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
              {active.messages.length === 0 && <p className="text-xs text-[var(--msg-muted)] text-center">Say hello — this is the start of your conversation.</p>}
              {active.messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.from === 'me' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[82%] rounded-xl px-3.5 py-2 text-sm break-words ${msg.from === 'me' ? 'msg-outgoing bg-[var(--msg-outgoing)] text-[var(--msg-ink)]' : 'msg-incoming bg-[var(--msg-incoming)] text-[var(--msg-ink)] border border-[var(--msg-border)]'}`}>
                    <MessageBody text={msg.text} />
                    <div className={`text-[10px] mt-1 ${msg.from === 'me' ? 'text-[var(--msg-muted)]' : 'text-[var(--msg-muted)]'}`}>{msg.at}</div>
                  </div>
                  {msg.id === seenId && <span className="text-[10px] text-[var(--msg-muted)] mt-0.5 mr-1">Seen</span>}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {failed && failed.threadId === active.id && <div role="alert" className="mx-3 mt-2 p-3 rounded-lg border border-red-400/50 bg-[#fff0ed] text-[#8e302b] text-xs flex items-center justify-between gap-3">
              <span>{failed.reason} This message has not been delivered.</span>
              <button type="button" className="underline font-semibold shrink-0" disabled={sending} onClick={() => void sendText(failed.threadId, failed.text, failed.id)}>Retry</button>
            </div>}
            <footer className="p-3 border-t border-[var(--msg-border)] flex items-end gap-2">
              <AttachButton threadId={active.id} onSend={text => sendText(active.id, text)} />
              <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={1} placeholder="Write a message…"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                className="flex-1 resize-none bg-[var(--msg-panel-inset)] text-sm text-[var(--msg-ink)] placeholder:text-[var(--msg-muted)] rounded-lg px-3 py-2 border border-[var(--msg-border)] focus:outline-none focus:border-[var(--msg-accent)] max-h-32" />
              <button onClick={send} disabled={!draft.trim() || sending} aria-label="Send message"
                className="msg-primary-action p-2.5 rounded-lg bg-[var(--msg-accent)] hover:bg-[var(--msg-accent-hover)] disabled:opacity-40 text-[var(--msg-accent-ink)] cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </footer>
          </>)}
        </section>

        <aside className="hidden lg:flex flex-col rounded-xl border border-[var(--msg-border)] bg-[var(--msg-panel)] p-4 gap-4 min-h-0 overflow-y-auto">
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-[var(--msg-muted)]">Relationship context</p>
          {person ? (<>
            <div>
              <p className="font-serif-editorial text-xl text-[var(--msg-ink)]">{person.name}</p>
              <p className="text-xs text-[var(--msg-muted)]">{person.location}</p>
            </div>
            {active?.introContext && <div><p className="text-[10px] uppercase tracking-widest text-[var(--msg-muted)] mb-1">How you met</p><p className="text-xs text-[var(--msg-body)]">{active.introContext}</p></div>}
            {active?.commitment && <div><p className="text-[10px] uppercase tracking-widest text-[var(--msg-muted)] mb-1">Open loop</p><p className="text-xs text-[var(--msg-body)]">{active.commitment}</p></div>}
            <p className="text-[11px] text-[var(--msg-muted)] mt-auto">Files up to 50 MB — images, video, PDFs. Only the two of you can open them.</p>
          </>) : <p className="text-xs text-[var(--msg-muted)]">Context appears here when you open a conversation.</p>}
        </aside>
      </div>
    </div>
  )
}

export function LiveMessagesView({ onOpenWorkspaces }: { onOpenWorkspaces?: () => void } = {}) {
  return <Inner {...(onOpenWorkspaces ? { onOpenWorkspaces } : {})} />
}
