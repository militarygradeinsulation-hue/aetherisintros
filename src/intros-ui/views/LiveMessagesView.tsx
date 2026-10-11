import { useEffect, useMemo, useRef, useState } from 'react'
import { Send, Search, MessageSquare } from 'lucide-react'
import { NetworkProvider, useNetwork } from '@/aetheris/store'
import { AttachButton, MessageBody, attachmentPreview } from '@/aetheris/MessageAttachments'
import { loadReadReceiptsSetting, markThreadRead, saveReadReceiptsSetting, useUnreadCounts } from '@/aetheris/read-receipts'
import { badgeLabel, seenUnderMessageId, shouldMarkRead } from '@/aetheris/messaging-state'
import { OpenDealRoomButton } from '@/aetheris/deals-ui'
import { draftTitle } from '@/aetheris/deals-core'
import { MeetingBriefPanel } from '@/aetheris/meeting-brief-ui'

const pageVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible'

/** Native editorial-noir messaging, wired to the live member threads and file attachments. */
function Inner() {
  const net = useNetwork()
  const [activeId, setActiveId] = useState<string>(() => (typeof window === 'undefined' ? '' : localStorage.getItem('aetheris-intros-thread') ?? ''))
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [showBrief, setShowBrief] = useState(false)
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
      if (shouldMarkRead({ threadId: active.id, pageVisible: pageVisible(), unread: activeUnread, fallbackUnread: !reads.loaded && active.unread })) void markThreadRead(active.id)
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

  const send = () => {
    const text = draft.trim()
    if (!text || !active) return
    net.sendMessage(active.id, text)
    setDraft('')
  }

  return (
    <div className="max-w-[1400px] mx-auto px-3 md:px-6 py-4">
      <div className="mb-3">
        <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#9CA3AF]">Private communication</p>
        <h1 className="font-serif-editorial text-2xl md:text-3xl text-[#F2EEE6]">Conversations with <em className="text-[#F5B027]">relationship context.</em></h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[300px_1fr_260px] gap-3 h-[calc(100vh-210px)] min-h-[480px]">
        <aside className={`rounded-xl border border-white/10 bg-[#0D1117]/90 flex flex-col min-h-0 ${active ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b border-white/10 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search conversations"
              className="w-full bg-[#0F131A] text-xs text-[#F2EEE6] rounded-lg pl-8 pr-3 py-2 border border-white/10 focus:outline-none focus:border-[#F5B027]" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 && <p className="p-4 text-xs text-[#9CA3AF]">No conversations yet. Open a member's profile and choose Message to start one.</p>}
            {threads.map(t => {
              const m = byId.get(t.memberId)
              const last = t.messages[t.messages.length - 1]
              const on = active?.id === t.id
              const count = reads.loaded ? (reads.threads[t.id]?.unread ?? 0) : (t.unread ? 1 : 0)
              const label = reads.loaded ? badgeLabel(count) : ''
              return (
                <button key={t.id} onClick={() => setActiveId(t.id)}
                  className={`w-full text-left px-3 py-3 border-b border-white/5 flex gap-3 cursor-pointer ${on ? 'bg-[#F5B027]/10' : 'hover:bg-white/5'}`}>
                  <div className="w-9 h-9 shrink-0 rounded-full bg-[#1A1F25] border border-white/10 flex items-center justify-center text-[11px] text-[#F2EEE6]">
                    {(m?.name ?? '?').split(' ').map(s => s[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${count > 0 ? 'text-white font-semibold' : 'text-[#F2EEE6]'}`}>{m?.name ?? 'Member'}</span>
                      {count > 0 && (label
                        ? <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#F5B027] text-[10px] font-semibold text-[#07090C] flex items-center justify-center shrink-0" aria-label={`${count} unread`}>{label}</span>
                        : <span className="w-2 h-2 rounded-full bg-[#F5B027] shrink-0" aria-label="Unread" />)}
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] truncate">{last ? attachmentPreview(last.text) : t.introContext}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="p-3 border-t border-white/10 space-y-1">
            <label className="flex items-center justify-between gap-2 text-xs text-[#CBD5E1] cursor-pointer">
              <span>Read receipts</span>
              <input type="checkbox" checked={receipts ?? true} disabled={receipts === null} onChange={() => void toggleReceipts()} className="accent-[#F5B027]" />
            </label>
            <p className="text-[11px] text-[#9CA3AF]">{receipts === false
              ? 'Off: nobody sees when you have read their messages, and you do not see when they read yours.'
              : 'On: the people you message see "Seen" once you have read their message. Turn off to hide it both ways.'}</p>
            {receiptsNote && <p className="text-[11px] text-[#F5B027]" role="alert">{receiptsNote}</p>}
          </div>
        </aside>

        <section className={`rounded-xl border border-white/10 bg-[#0B0D0F]/90 flex-col min-h-0 ${active ? 'flex' : 'hidden md:flex'}`}>
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#9CA3AF]">
              <MessageSquare className="w-6 h-6 mb-2 text-[#F5B027]" />
              <p className="text-sm">Select a conversation.</p>
            </div>
          ) : (<>
            <header className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
              <button onClick={() => setActiveId('')} className="md:hidden text-xs text-[#FFC85C] cursor-pointer">← Back</button>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#F2EEE6] truncate">{person?.name ?? 'Member'}</p>
                <p className="text-[11px] text-[#9CA3AF] truncate">{[person?.title, person?.company].filter(Boolean).join(' · ')}</p>
              </div>
              {person && <div className="ml-auto shrink-0 flex items-center gap-2">
                <button
                  onClick={() => setShowBrief(v => !v)}
                  className="text-[11px] px-2 py-1 rounded-md border border-white/20 text-[#9CA3AF] hover:text-[#F2EEE6] hover:border-white/40 transition-colors cursor-pointer"
                >
                  {showBrief ? 'Hide brief' : 'Pre-meeting brief'}
                </button>
                <OpenDealRoomButton kind="quiet" label="Deal room" draft={{ sourceKind: 'thread', sourceId: active.id, title: draftTitle('thread', person.name), need: active.introContext ?? '', counterpartId: person.id, counterpartName: person.name }} />
              </div>}
            </header>
            {showBrief && person && (
              <MeetingBriefPanel otherUserId={person.id} otherName={person.name} />
            )}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
              {active.messages.length === 0 && <p className="text-xs text-[#9CA3AF] text-center">Say hello — this is the start of your conversation.</p>}
              {active.messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.from === 'me' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[82%] rounded-xl px-3.5 py-2 text-sm break-words ${msg.from === 'me' ? 'bg-[#C78522] text-white' : 'bg-[#1A1F25] text-[#F1EFE9] border border-white/10'}`}>
                    <MessageBody text={msg.text} />
                    <div className={`text-[10px] mt-1 ${msg.from === 'me' ? 'text-white/70' : 'text-[#9CA3AF]'}`}>{msg.at}</div>
                  </div>
                  {msg.id === seenId && <span className="text-[10px] text-[#9CA3AF] mt-0.5 mr-1">Seen</span>}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <footer className="p-3 border-t border-white/10 flex items-end gap-2">
              <AttachButton threadId={active.id} onSend={text => net.sendMessage(active.id, text)} />
              <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={1} placeholder="Write a message…"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                className="flex-1 resize-none bg-[#0F131A] text-sm text-[#F2EEE6] rounded-lg px-3 py-2 border border-white/10 focus:outline-none focus:border-[#F5B027] max-h-32" />
              <button onClick={send} disabled={!draft.trim()} aria-label="Send message"
                className="p-2.5 rounded-lg bg-[#C78522] hover:bg-[#A96F1B] disabled:opacity-40 text-white cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </footer>
          </>)}
        </section>

        <aside className="hidden lg:flex flex-col rounded-xl border border-white/10 bg-[#0D1117]/90 p-4 gap-4 min-h-0 overflow-y-auto">
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#9CA3AF]">Relationship context</p>
          {person ? (<>
            <div>
              <p className="font-serif-editorial text-xl text-[#F2EEE6]">{person.name}</p>
              <p className="text-xs text-[#9CA3AF]">{person.location}</p>
            </div>
            {active?.introContext && <div><p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] mb-1">How you met</p><p className="text-xs text-[#CBD5E1]">{active.introContext}</p></div>}
            {active?.commitment && <div><p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] mb-1">Open loop</p><p className="text-xs text-[#CBD5E1]">{active.commitment}</p></div>}
            <p className="text-[11px] text-[#9CA3AF] mt-auto">Files up to 50 MB — images, video, PDFs. Only the two of you can open them.</p>
          </>) : <p className="text-xs text-[#9CA3AF]">Context appears here when you open a conversation.</p>}
        </aside>
      </div>
    </div>
  )
}

export function LiveMessagesView() {
  return <NetworkProvider mode="live"><Inner /></NetworkProvider>
}
