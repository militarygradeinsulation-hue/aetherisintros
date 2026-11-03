import { MemberThumbnail } from '../components/shared/MemberThumbnail';
import { useEffect, useMemo, useRef, useState } from 'react'
import { Send, Search, MessageSquare, Plus, ArrowLeft } from 'lucide-react'
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
function Inner({ onOpenWorkspaces, social = false, initialRecipientId, onRecipientOpened }: { onOpenWorkspaces?: () => void; social?: boolean; initialRecipientId?: string; onRecipientOpened?: () => void }) {
  const net = useNetwork()
  const [activeId, setActiveId] = useState<string>(() => (typeof window === 'undefined' ? '' : localStorage.getItem('aetheris-intros-thread') ?? ''))
  const [query, setQuery] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [pickingRecipient, setPickingRecipient] = useState(false)
  const [recipientQuery, setRecipientQuery] = useState('')
  const [recipientError, setRecipientError] = useState('')
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
  // An empty selection means the inbox, never an automatic first conversation.
  const active = net.threads.find(t => t.id === activeId)
  const selectedId = useRef(activeId)
  selectedId.current = activeId
  const draft = active ? drafts[active.memberId] ?? '' : ''
  const setDraft = (value: string) => {
    if (active) setDrafts(current => ({ ...current, [active.memberId]: value }))
  }
  const showInbox = pickingRecipient || !active
  const backToInbox = () => { setActiveId(''); setPickingRecipient(false); setBriefThreadId(null) }
  const startConversation = (memberId: string) => {
    try {
      const threadId = net.openThreadWith(memberId)
      setActiveId(threadId); setPickingRecipient(false); setQuery(''); setRecipientError('')
    } catch (error) { setRecipientError(error instanceof Error ? error.message : 'Could not open this conversation. Try again.') }
  }
  // One tap from a real directory match opens the existing draft conversation.
  // It never sends a message or bypasses member permissions.
  useEffect(() => {
    if (!initialRecipientId || !isUuid(initialRecipientId)) return
    if (!byId.has(initialRecipientId)) {
      if (!net.synced) return
      setRecipientError('This person is not available in your messaging directory. You can request an introduction or choose another member.')
      setPickingRecipient(true)
      onRecipientOpened?.()
      return
    }
    try {
      const threadId = net.openThreadWith(initialRecipientId)
      setActiveId(threadId)
      setPickingRecipient(false)
      setRecipientError('')
      onRecipientOpened?.()
    } catch (cause) {
      setRecipientError(cause instanceof Error ? cause.message : 'Could not open this conversation.')
      onRecipientOpened?.()
    }
  }, [initialRecipientId, byId, onRecipientOpened])
  const recipientSearch = recipientQuery.trim().toLowerCase()
  const recipients = net.members.filter(member => [member.name, member.company, member.title].some(value => value?.toLowerCase().includes(recipientSearch)))
  const person = active ? byId.get(active.memberId) : undefined
  useEffect(() => {
    if (!activeId) localStorage.removeItem('aetheris-intros-thread')
    else if (active) localStorage.setItem('aetheris-intros-thread', active.id)
  }, [activeId, active?.id])
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
    const memberId = net.threads.find(thread => thread.id === threadId)?.memberId
    if (!memberId) return
    const id = messageId ?? crypto.randomUUID()
    setSending(true)
    setFailed(null)
    try {
      const confirmedThreadId = await net.sendMessage(threadId, text, id)
      if (confirmedThreadId && confirmedThreadId !== threadId && selectedId.current === threadId) setActiveId(confirmedThreadId)
      setDrafts(current => ({ ...current, [memberId]: current[memberId]?.trim() === text.trim() ? '' : current[memberId] ?? '' }))
    } catch (cause) {
      setFailed({ id, threadId, text, reason: cause instanceof Error ? cause.message : 'Not sent. Retry this message.' })
      setDrafts(current => ({ ...current, [memberId]: current[memberId]?.trim() ? current[memberId]! : text }))
    } finally {
      setSending(false)
    }
  }
  const send = () => { if (active && draft.trim()) void sendText(active.id, draft.trim(), failed?.threadId === active.id && failed.text === draft.trim() ? failed.id : undefined) }

  const newMessageButton = <button type="button" onClick={() => { setActiveId(''); setPickingRecipient(true); setRecipientQuery(''); setRecipientError('') }}
    className="msg-primary-action inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm bg-[var(--msg-accent)] text-[var(--msg-accent-ink)]">
    <Plus size={18} aria-hidden="true"/>New message
  </button>
  const inbox = (<aside aria-label="Conversations" className={`rounded-xl border border-[var(--msg-border)] bg-[var(--msg-panel)] flex flex-col min-h-0 ${showInbox ? 'flex' : 'hidden md:flex'}`}>
          {pickingRecipient ? <div className="flex flex-col min-h-0 flex-1">
            <div className="p-3 border-b border-[var(--msg-border)] space-y-3">
              <button type="button" onClick={backToInbox} className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--msg-ink)]"><ArrowLeft size={18} aria-hidden="true"/>Conversations</button>
              <label className="block text-sm text-[var(--msg-ink)]">Search members
                <input autoFocus value={recipientQuery} onChange={event => setRecipientQuery(event.target.value)} placeholder="Name, company or role"
                  className="mt-2 w-full min-w-0 min-h-11 rounded-lg px-3 text-base border border-[var(--msg-border)] bg-[var(--msg-panel-inset)] text-[var(--msg-ink)]"/>
              </label>
            </div>
            {recipientError && <p role="alert" className="p-3 text-sm text-[var(--msg-ink)]">{recipientError}</p>}
            <div className="flex-1 overflow-y-auto">
              {recipients.map(member =>
                <button key={member.id} type="button" aria-label={`Message ${member.name}`} onClick={() => startConversation(member.id)}
                  className="msg-recipient-tile w-full min-h-14 text-left p-3 flex items-center gap-3 border-b border-[var(--msg-border)] hover:bg-[var(--msg-selected)]">
                  <MemberThumbnail name={member.name} source={member.avatarUrl}/>
                  <span className="min-w-0"><strong className="block text-sm text-[var(--msg-ink)] truncate">{member.name}</strong><span className="block text-xs text-[var(--msg-muted)] truncate">{[member.title, member.company].filter(Boolean).join(' · ')}</span></span>
                </button>)}
              {recipients.length === 0 &&
                <p role="status" className="p-4 text-sm text-[var(--msg-muted)]">{net.networkLoadError ? 'Members could not be loaded. Refresh to try again.' : !net.synced ? 'Loading members…' : recipientQuery.trim() ? 'No members match your search.' : 'No members are available yet.'}</p>}
            </div>
          </div> : <>
          <div className="p-3 border-b border-[var(--msg-border)] relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--msg-muted)]" />
            <input value={query} onChange={e => setQuery(e.target.value)} aria-label="Search conversations" placeholder="Search conversations"
              className="w-full min-h-11 bg-[var(--msg-panel-inset)] text-base text-[var(--msg-ink)] rounded-lg pl-8 pr-3 py-2 border border-[var(--msg-border)] focus:outline-none focus:border-[var(--msg-accent)]" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 && <p className="p-4 text-xs text-[var(--msg-muted)]">{query.trim() ? 'No conversations match your search.' : 'No conversations yet. Choose New message to find someone.'}</p>}
            {threads.map(t => {
              const m = byId.get(t.memberId)
              const last = t.messages[t.messages.length - 1]
              const on = active?.id === t.id
              const count = reads.loaded ? (reads.threads[t.id]?.unread ?? 0) : (t.unread ? 1 : 0)
              const label = reads.loaded ? badgeLabel(count) : ''
              return (
                <button key={t.id} type="button" data-selected={on} aria-current={on ? 'true' : undefined} onClick={() => { setActiveId(t.id); setBriefThreadId(null) }}
                  className={`msg-thread-tile w-full text-left px-3 py-3 border-b border-[var(--msg-border)] flex gap-3 cursor-pointer ${on ? 'bg-[var(--msg-selected)]' : 'hover:bg-[var(--msg-selected)]'}`}>
                  <MemberThumbnail name={m?.name || 'Member'} source={m?.avatarUrl}/>

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
              <input type="checkbox" checked={receipts ?? true} disabled={receipts === null} onChange={() => void toggleReceipts()} className="accent-[#EF4444]" />
            </label>
            <p className="text-[11px] text-[var(--msg-muted)]">{receipts === false
              ? 'Off: nobody sees when you have read their messages, and you do not see when they read yours.'
              : 'On: the people you message see "Seen" once you have read their message. Turn off to hide it both ways.'}</p>
            {receiptsNote && <p className="text-[11px] text-[var(--msg-copper)]" role="alert">{receiptsNote}</p>}
          </div>
          </>}
        </aside>)

  if (social) return (
    <div className="max-w-[1400px] mx-auto px-3 md:px-6 py-4 ix-live-messages">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div>
        <p className="text-[13px] text-[var(--msg-muted)]">Private communication</p>
        <h1 className="msg-heading text-[22px] text-[var(--msg-ink)]">Conversations with <em className="text-[var(--msg-copper)]">relationship context.</em></h1>
      </div>{newMessageButton}</div>
      {readError && <div role="alert" className="mb-2 p-2 border border-red-400/40 bg-[#fff0ed] text-sm text-[#8e302b] rounded">{readError} <button type="button" className="underline font-medium" onClick={() => { if (active) void markThreadRead(active.id).then(() => setReadError('')).catch(() => {}) }}>Retry</button></div>}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[300px_1fr_260px] gap-3 h-[calc(100vh-210px)] min-h-[480px]">
        {inbox}

        <section className={`rounded-xl border border-[var(--msg-border)] bg-[var(--msg-panel)] flex-col min-h-0 ${showInbox ? 'hidden md:flex' : 'flex'}`}>
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[var(--msg-muted)]">
              <MessageSquare className="w-6 h-6 mb-2 text-[var(--msg-copper)]" />
              <p className="text-sm">Select a conversation.</p>
            </div>
          ) : (<>
            <header className="msg-thread-header px-4 py-3 border-b border-[var(--msg-border)] flex flex-wrap items-center gap-3">
              <button type="button" onClick={backToInbox} aria-label="Back to conversations" className="md:hidden shrink-0 min-h-11 min-w-11 inline-flex items-center justify-center text-[var(--msg-copper)] cursor-pointer"><ArrowLeft size={20} aria-hidden="true"/></button>
              <div className="min-w-0 flex-1">
                <p className="msg-heading text-[18px] font-medium text-[var(--msg-ink)] truncate">{person?.name ?? 'Member'}</p>
                <p className="text-[13px] text-[var(--msg-muted)] truncate">{[person?.title, person?.company].filter(Boolean).join(' · ')}</p>
              </div>
              {person && <div className="ml-auto min-w-0 basis-full md:basis-auto flex flex-wrap items-center justify-end gap-2">
                {onOpenWorkspaces && isUuid(active.id) && <StartWorkspaceButton source="dm_thread" sourceId={active.id} withName={person.name} onOpen={onOpenWorkspaces} label="Workspace" />}
                <OpenDealRoomButton kind="quiet" label="Deal room" draft={{ sourceKind: 'thread', sourceId: active.id, title: draftTitle('thread', person.name), need: active.introContext ?? '', counterpartId: person.id, counterpartName: person.name }} />
              </div>}
            </header>
            <div className="msg-live-chat-body flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
              {active.messages.length === 0 && <p className="text-sm text-[var(--msg-muted)] text-center">Say hello — this is the start of your conversation.</p>}
              {active.messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.from === 'me' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[82%] rounded-xl msg-body-text px-3.5 py-2 text-base break-words ${msg.from === 'me' ? 'msg-outgoing bg-[var(--msg-outgoing)] text-[var(--msg-ink)]' : 'msg-incoming bg-[var(--msg-incoming)] text-[var(--msg-ink)] border border-[var(--msg-border)]'}`}>
                    <MessageBody text={msg.text} />
                    <div className={`text-[13px] mt-1 ${msg.from === 'me' ? 'text-[var(--msg-muted)]' : 'text-[var(--msg-muted)]'}`}>{msg.at}</div>
                  </div>
                  {msg.id === seenId && <span className="text-[13px] text-[var(--msg-muted)] mt-0.5 mr-1">Seen</span>}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {failed && failed.threadId === active.id && <div role="alert" className="mx-3 mt-2 p-3 rounded-lg border border-red-400/50 bg-[#fff0ed] text-[#8e302b] text-sm flex items-center justify-between gap-3">
              <span>{failed.reason} This message has not been delivered.</span>
              <button type="button" className="underline font-medium shrink-0" disabled={sending} onClick={() => void sendText(failed.threadId, failed.text, failed.id)}>Retry</button>
            </div>}
            <footer className="p-3 border-t border-[var(--msg-border)] flex items-end gap-2">
              <AttachButton threadId={active.id} onSend={text => sendText(active.id, text)} />
              <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={1} placeholder="Write a message…"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                className="msg-composer min-w-0 flex-1 resize-none bg-[var(--msg-panel-inset)] text-base text-[var(--msg-ink)] placeholder:text-[var(--msg-muted)] rounded-lg px-3 py-2 border border-[var(--msg-border)] focus:outline-none focus:border-[var(--msg-accent)] max-h-32" />
              <button onClick={send} disabled={!draft.trim() || sending} aria-label="Send message"
                className="msg-primary-action p-2.5 rounded-lg bg-[var(--msg-accent)] hover:bg-[var(--msg-accent-hover)] disabled:opacity-40 text-[var(--msg-accent-ink)] cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </footer>
          </>)}
        </section>

        <aside className="hidden lg:flex flex-col rounded-xl border border-[var(--msg-border)] bg-[var(--msg-panel)] p-4 gap-4 min-h-0 overflow-y-auto">
          <p className="msg-section-heading text-[18px] text-[var(--msg-muted)]">Relationship context</p>
          {person ? (<>
            <div>
              <p className="msg-heading text-xl text-[var(--msg-ink)]">{person.name}</p>
              <p className="text-sm text-[var(--msg-muted)]">{person.location}</p>
            </div>
            {active?.introContext && <div><p className="text-[13px] text-[var(--msg-muted)] mb-1">How you met</p><p className="msg-body-text text-base text-[var(--msg-body)]">{active.introContext}</p></div>}
            {active?.commitment && <div><p className="text-[13px] text-[var(--msg-muted)] mb-1">Open loop</p><p className="msg-body-text text-base text-[var(--msg-body)]">{active.commitment}</p></div>}
            <p className="text-[13px] text-[var(--msg-muted)] mt-auto">Files up to 50 MB — images, video, PDFs. Only the two of you can open them.</p>
          </>) : <p className="text-sm text-[var(--msg-muted)]">Context appears here when you open a conversation.</p>}
        </aside>
      </div>
    </div>
  )
  return (
    <div className="max-w-[1400px] mx-auto px-3 md:px-6 py-4 ix-live-messages">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div>
        <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-[var(--msg-muted)]">Private communication</p>
        <h1 className="font-serif-editorial text-2xl md:text-3xl text-[var(--msg-ink)]">Your <em className="text-[var(--msg-copper)]">conversations.</em></h1>
      </div>{newMessageButton}</div>
      {readError && <div role="alert" className="mb-2 p-2 border border-red-400/40 bg-[#fff0ed] text-xs text-[#8e302b] rounded">{readError} <button type="button" className="underline font-semibold" onClick={() => { if (active) void markThreadRead(active.id).then(() => setReadError('')).catch(() => {}) }}>Retry</button></div>}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[300px_1fr_260px] gap-3 h-[calc(100vh-210px)] min-h-[480px]">
        {inbox}

        <section className={`rounded-xl border border-[var(--msg-border)] bg-[var(--msg-panel)] flex-col min-h-0 ${showInbox ? 'hidden md:flex' : 'flex'}`}>
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[var(--msg-muted)]">
              <MessageSquare className="w-6 h-6 mb-2 text-[var(--msg-copper)]" />
              <p className="text-sm">Select a conversation.</p>
            </div>
          ) : (<>
            <header className="msg-thread-header px-4 py-3 border-b border-[var(--msg-border)] flex flex-wrap items-center gap-3">
              <button type="button" onClick={backToInbox} aria-label="Back to conversations" className="md:hidden shrink-0 min-h-11 min-w-11 inline-flex items-center justify-center text-[var(--msg-copper)] cursor-pointer"><ArrowLeft size={20} aria-hidden="true"/></button>
              <MemberThumbnail name={person?.name || 'Member'} source={person?.avatarUrl}/>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--msg-ink)] truncate">{person?.name ?? 'Member'}</p>
                <p className="text-[11px] text-[var(--msg-muted)] truncate">{[person?.title, person?.company].filter(Boolean).join(' · ')}</p>
              </div>
              {person && <div className="ml-auto min-w-0 basis-full md:basis-auto flex flex-wrap items-center justify-end gap-2">
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
          </>) : <p className="text-xs text-[var(--msg-muted)]">Select a conversation to see its context.</p>}
        </aside>
      </div>
    </div>
  )
}

export function LiveMessagesView({ onOpenWorkspaces, social = false, initialRecipientId, onRecipientOpened }: { onOpenWorkspaces?: () => void; social?: boolean; initialRecipientId?: string; onRecipientOpened?: () => void } = {}) {
  return <Inner social={social} {...(onOpenWorkspaces ? { onOpenWorkspaces } : {})} {...(initialRecipientId ? { initialRecipientId } : {})} {...(onRecipientOpened ? { onRecipientOpened } : {})} />
}
