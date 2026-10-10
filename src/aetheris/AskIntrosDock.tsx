import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Mic, MicOff, Radio, Volume2, VolumeX, X } from 'lucide-react'
import { ThinkingOrb } from '@/components/ui/thinking-orbs'

import { askIntros, type AskIntrosAction } from '@/lib/askIntros.functions'
import { pageMeta } from './pageMeta'
import { readTextScale } from './textScale'
import { readCursorScale } from './cursorScale'
import { useGraphInputs } from './graph-store'
import { answerGraphQuestion } from './opportunity-graph'
import { ceoViewLabel } from './ceo-engine'
import { recognizeCommand, recognizeCapabilityIntent, recognizeDestination } from './capabilities/match'
import { describe as describeCapability } from './capabilities/registry'
import { getActiveSubject, openCapability } from './capabilities/store'
import { openCeo } from './ceo-store'
import { VOICE_PAGES, confirmation, parseVoiceCommand } from './voice-commands'
import { saveQuickNote } from './quick-note-ui'
import { noteFailedResult, noteSavedResult } from './quick-note'
import { placeMenu } from './quick-menu'
import {
  isStopPhrase, readAloud, readerSnapshot, stopReading, useDictation, useReader, useVoiceSettings, voiceOutputSupported,
  unlockAudio,
} from './voice'
function AetherisGlyph({ size = 18 }: { size?: number }) {
  return <span className="aetheris-glyph" style={{ width: size, height: size }} aria-hidden="true"><i /><b /></span>
}

export type { AskIntrosAction }

/** What can open the assistant: a question, a spot on screen (right-click), and/or voice mode. */
export interface OpenAssistantDetail { question?: string; x?: number; y?: number; voice?: boolean }

const POS_KEY = 'aetheris-dock-pos'
const FAB_KEY = 'aetheris-dock-fab-pos'
type Point = { left: number; top: number }
const readPoint = (key: string): Point | null => {
  try { const v = JSON.parse(localStorage.getItem(key) ?? 'null'); return v && typeof v.left === 'number' && typeof v.top === 'number' ? v : null } catch { return null }
}
const writePoint = (key: string, p: Point | null) => { try { if (p) localStorage.setItem(key, JSON.stringify(p)); else localStorage.removeItem(key) } catch { /* unavailable */ } }
const clampPoint = (p: Point, w: number, h: number): Point => ({
  left: Math.min(Math.max(8, p.left), Math.max(8, window.innerWidth - w - 8)),
  top: Math.min(Math.max(8, p.top), Math.max(8, window.innerHeight - h - 8)),
})

/** Pointer-drag for a fixed element; reports whether the pointer actually moved (so clicks still work). */
function useDrag(onMove: (p: Point) => void, onEnd: (p: Point) => void) {
  return (event: React.PointerEvent<HTMLElement>, el: HTMLElement | null) => {
    if (!el || event.button !== 0) return
    const r = el.getBoundingClientRect()
    const dx = event.clientX - r.left, dy = event.clientY - r.top
    const sx = event.clientX, sy = event.clientY
    let moved = false
    let last: Point = { left: r.left, top: r.top }
    const move = (e: PointerEvent) => {
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 5) return
      moved = true
      last = clampPoint({ left: e.clientX - dx, top: e.clientY - dy }, r.width, r.height)
      onMove(last)
    }
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up)
      if (moved) { onEnd(last); el.dataset['dragged'] = '1'; setTimeout(() => { delete el.dataset['dragged'] }, 0) }
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
}

interface Turn { role: 'user' | 'assistant'; content: string; did?: string[] }

const startingOpeners = [
  'Where are we losing money?',
  'What should I fix first?',
  'What changed?',
  'What am I missing?',
  'Who can I help?',
  'Where is my time going?',
  'Challenge this decision',
  'What am I forgetting?',
  'Who can change this?',
  'Show pending approvals',
  'Which customers need attention?',
  'Show my capital map',
  'Run a scenario',
  'What can I delegate?',
  'Read this page to me',
  'Make the text bigger',
  'Explain Active Memory',
  'Take me to my introductions',
  'Post a need for me',
]

export interface AskIntrosDockProps {
  page: string
  peopleNames: string[]
  memberName: string
  briefing: boolean
  contextPanel: boolean
  /** Runs one assistant action and returns a short human description of what happened. */
  run: (action: AskIntrosAction) => string | null
}

/** Hovering butler: teaches the system, operates it, and talks with the member. */
const dockOwners: symbol[] = []
const dockListeners = new Set<() => void>()
/** Only the first mounted dock renders, so the butler never appears twice. */
function useIsPrimaryDock() {
  const [id] = useState(() => Symbol('dock'))
  const [, bump] = useState(0)
  useEffect(() => {
    dockOwners.push(id)
    const l = () => bump(n => n + 1)
    dockListeners.add(l)
    dockListeners.forEach(f => f())
    return () => { dockOwners.splice(dockOwners.indexOf(id), 1); dockListeners.delete(l); dockListeners.forEach(f => f()) }
  }, [id])
  return dockOwners[0] === id
}

export function AskIntrosDock(props: AskIntrosDockProps) {
  return useIsPrimaryDock() ? <AskIntrosDockInner {...props} /> : null
}

/** When a command moves to another part of the app the dock remounts; this carries the open
 * conversation across so voice control keeps going on the new page. */
let handoff: { turns: Turn[]; at: number } | null = null
const takeHandoff = () => { const h = handoff && Date.now() - handoff.at < 5000 ? handoff : null; handoff = null; return h }

function AskIntrosDockInner({ page, peopleNames, memberName, briefing, contextPanel, run }: AskIntrosDockProps) {
  const [carried] = useState(takeHandoff)
  const [open, setOpen] = useState(!!carried)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [turns, setTurns] = useState<Turn[]>(() => carried?.turns ?? [{
    role: 'assistant',
    content: `I am Ask Intros. Ask me how anything here works, or tell me to do it — read this page to you, change your text size, open a page, post a need, find who matters this week.`,
  }])
  const [openers, setOpeners] = useState<string[]>(startingOpeners)
  const [voice, setVoice] = useVoiceSettings()
  const reader = useReader()
  const listRef = useRef<HTMLDivElement>(null)
  const sending = useRef(false)
  const graphInputs = useGraphInputs()

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [turns, open])
  // Where the panel and the floating button sit; members can drag both anywhere.
  const [pos, setPos] = useState<Point | null>(() => readPoint(POS_KEY))
  const [fabPos, setFabPos] = useState<Point | null>(() => readPoint(FAB_KEY))
  const dockRef = useRef<HTMLElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const dragDock = useDrag(setPos, p => writePoint(POS_KEY, p))
  const dragFab = useDrag(setFabPos, p => writePoint(FAB_KEY, p))
  const pendingVoice = useRef(false)
  const [voiceAsk, setVoiceAsk] = useState(0)
  const live = useRef({ open, turns })
  live.current = { open, turns }
  useEffect(() => () => { if (live.current.open) handoff = { turns: live.current.turns, at: Date.now() } }, [])

  useEffect(() => {
    const show = (event: Event) => {
      setOpen(true)
      const detail = (event as CustomEvent<string | OpenAssistantDetail | undefined>).detail
      const req: OpenAssistantDetail = typeof detail === 'string' ? { question: detail } : detail ?? {}
      if (req.question) setInput(req.question)
      if (typeof req.x === 'number' && typeof req.y === 'number') {
        // Open right where the member asked for it, kept on screen.
        const at = placeMenu(req.x, req.y, Math.min(390, window.innerWidth - 32), Math.min(window.innerHeight * 0.72, 600), window.innerWidth, window.innerHeight)
        setPos(at)
      }
      if (req.voice) { pendingVoice.current = true; setVoiceAsk(n => n + 1) }
    }
    window.addEventListener('aetheris:open-assistant', show)
    return () => window.removeEventListener('aetheris:open-assistant', show)
  }, [])

  const send = async (text: string) => {
    unlockAudio()
    const question = text.trim()
    if (!question || sending.current) return
    sending.current = true
    setInput('')
    const history = [...turns, { role: 'user' as const, content: question }]
    setTurns(history)
    const say = (text: string) => { if ((voice.speakReplies || voice.conversation) && voiceOutputSupported()) readAloud([text], 'Ask Intros') }
    // Commands that run instantly: go somewhere, find someone, message, intro, note, post an ask.
    const command = parseVoiceCommand(question, peopleNames)
    if (command) {
      let result: string | null
      if (command.kind === 'take-note') {
        try { result = noteSavedResult(await saveQuickNote(command.value ?? '')) }
        catch (e) { result = noteFailedResult(e) }
      } else result = run(command)
      const reply = confirmation(command, result)
      const answer: Turn = { role: 'assistant', content: reply, ...(result ? { did: [result] } : {}) }
      // If the command moved to another part of the app this dock unmounts before it re-renders;
      // keep the reply for the dock that takes over.
      live.current = { open: true, turns: [...history, answer] }
      setTurns(current => [...current, answer])
      say(reply)
      sending.current = false
      return
    }
    const destination = recognizeDestination(question)
    if (destination) {
      window.dispatchEvent(new CustomEvent('aetheris:navigate', { detail: destination }))
      const msg = destination === 'pocket' ? 'Opening your Pocket. Pick a starting shape and I will review it for you.' : 'Opening your company diagnostic. Press Explain this report and I will walk you through the top priorities.'
      setTurns(current => [...current, { role: 'assistant', content: msg, did: [destination === 'pocket' ? 'Pocket' : 'Diagnostic'] }])
      if ((voice.speakReplies || voice.conversation) && voiceOutputSupported()) readAloud([msg], 'Ask Intros')
      sending.current = false
      return
    }
    const intent = recognizeCapabilityIntent(question)
    if (intent) {
      openCapability({ capabilityId: intent.capabilityId, ...(intent.focus ? { focus: intent.focus } : {}) })
      const subject = getActiveSubject()
      const label = describeCapability(intent.capabilityId)?.label ?? 'Diagnose'
      setTurns(current => [...current, { role: 'assistant', content: subject ? `Opening ${label} for ${subject.label}. I will show the evidence I use before anything runs.` : `Opening ${label}. Choose the company — I only read records you have entered, and public research runs only if you allow it.`, did: [label] }])
      sending.current = false
      return
    }
    const ceoCommand = recognizeCommand(question)
    if (ceoCommand?.view) {
      openCeo(ceoCommand)
      setTurns(current => [...current, { role: 'assistant', content: `Opening ${ceoViewLabel[ceoCommand.view!]}${ceoCommand.arg && ceoCommand.view === 'who' ? ` for “${ceoCommand.arg}”` : ''}. Everything in it comes from your recorded data — no AI needed.`, did: [ceoViewLabel[ceoCommand.view!]] }])
      sending.current = false
      return
    }
    const speak = (text: string) => {
      if ((voice.speakReplies || voice.conversation) && voiceOutputSupported()) readAloud([text], 'Ask Intros')
    }
    const local = answerGraphQuestion(question, graphInputs)
    if (local) {
      setTurns(current => [...current, { role: 'assistant', content: local }])
      speak(local)
      sending.current = false
      return
    }
    const { supabase } = await import('@/integrations/supabase/client')
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      speak('Sign in to have a full conversation with Ask Intros. Until then I can open pages, read this page aloud and answer from recorded data.')
      setTurns(current => [...current, { role: 'assistant', content: 'Sign in to have a full conversation with Ask Intros. Until then I can still open pages, change text size, read this page aloud and answer from recorded data — try “What changed?” or “Show my capital map”.' }])
      sending.current = false
      return
    }
    setBusy(true)
    try {
      const answer = await askIntros({
        data: {
          messages: history.filter(t => t.content).map(t => ({ role: t.role, content: t.content })),
          context: {
            page,
            textSize: readTextScale(),
            cursorSize: readCursorScale(),
            briefing,
            contextPanel,
            memberName,
            voice: { speaking: readerSnapshot().state !== 'idle', conversation: voice.conversation, speakReplies: voice.speakReplies },
            pages: [
              ...pageMeta.map(m => ({ id: m.id, label: m.label, blurb: m.blurb })),
              ...VOICE_PAGES.filter(v => !pageMeta.some(m => m.id === v.page)).map(v => ({ id: v.page, label: v.label, blurb: `Open ${v.label}` })),
            ],
            people: peopleNames.slice(0, 60),
          },
        },
      })
      const did: string[] = []
      for (const action of answer.actions) {
        if (action.kind === 'take-note') {
          try { did.push(noteSavedResult(await saveQuickNote(action.value ?? ''))) } catch (e) { did.push(noteFailedResult(e)) }
          continue
        }
        const note = run(action)
        if (note) did.push(note)
      }
      setTurns(current => [...current, { role: 'assistant', content: answer.reply, did }])
      const next = answer.suggestions.filter(item => item.toLowerCase() !== question.toLowerCase())
      if (next.length) setOpeners(next.slice(0, 4))
      const reads = answer.actions.some(action => action.kind === 'read-page')
      if (!reads && (voice.speakReplies || voice.conversation) && voiceOutputSupported()) {
        readAloud([answer.reply], 'Ask Intros')
      }
    } catch (error) {
      const { isAuthRequiredError } = await import('@/lib/auth-contract')
      if (isAuthRequiredError(error)) {
        setTurns(current => [...current, { role: 'assistant', content: 'Your session has ended. Sign in again to continue the conversation — I can still open pages and answer from recorded data meanwhile.' }])
        return
      }
      speak('The language service is unavailable right now, so I am answering from your recorded data only.')
      setTurns(current => [...current, { role: 'assistant', content: 'The language service is unavailable right now, so I am answering from your recorded data only. Try: “Who is most relevant to my active mission?”, “Who needs something I can provide?”, “Which relationship is going quiet?” or “Who can introduce me to <name>?”' }])
    } finally {
      setBusy(false)
      sending.current = false
    }
  }

  const heard = (phrase: string) => {
    if (isStopPhrase(phrase)) {
      stopReading()
      if (voice.conversation) setVoice({ conversation: false })
      dictation.stop()
      return
    }
    void send(phrase)
  }

  const dictation = useDictation({ onFinal: heard, keepOpen: voice.conversation })

  /* Conversation mode: listen, answer aloud, then listen again — never while speaking. */
  useEffect(() => {
    if (!open || !voice.conversation || !dictation.supported) { return }
    const idle = !busy && reader.state === 'idle'
    if (idle && !dictation.listening) dictation.start()
    if (!idle && dictation.listening) dictation.stop()
  }, [open, voice.conversation, busy, reader.state, dictation.listening, dictation.supported])

  useEffect(() => { if (!open) dictation.stop() }, [open])

  // Voice mode from the right-click menu: start a spoken conversation straight away.
  useEffect(() => {
    if (!open || !pendingVoice.current) return
    pendingVoice.current = false
    unlockAudio()
    if (dictation.supported) {
      setVoice({ conversation: true, speakReplies: true })
      setTurns(current => [...current, { role: 'assistant', content: 'Listening. Say what you want: “go to events”, “find Acme”, “message Ana”, “take a note…”, or ask me anything. Say “stop” to end.' }])
    } else {
      setTurns(current => [...current, { role: 'assistant', content: 'Voice needs Chrome, Edge or Safari. You can type here instead.' }])
    }
  }, [open, voiceAsk]) // eslint-disable-line react-hooks/exhaustive-deps

  const status = busy ? 'Thinking' : reader.state !== 'idle' ? 'Speaking' : dictation.listening ? 'Listening' : ''

  return <>
    <button ref={fabRef} className={`ask-dock-fab ${open ? 'active' : ''}`} aria-label="Ask Intros" title="Drag to move"
      style={fabPos ? { left: fabPos.left, top: fabPos.top, right: 'auto', bottom: 'auto' } : undefined}
      onPointerDown={e => dragFab(e, fabRef.current)}
      onClick={() => { if (fabRef.current?.dataset['dragged']) return; setOpen(value => !value) }}>
      {open ? <X size={18} /> : <AetherisGlyph size={18} />}
      {!open && <span>Ask Intros</span>}
    </button>

    {open && <aside ref={dockRef} className="ask-dock" role="dialog" aria-label="Ask Intros" data-voice-skip="true"
      style={pos ? { ...clampPoint(pos, Math.min(390, window.innerWidth - 32), dockRef.current?.offsetHeight ?? 420), right: 'auto', bottom: 'auto' } : undefined}>
      <header className="ask-dock-drag" title="Drag to move" onPointerDown={e => { if ((e.target as HTMLElement).closest('button')) return; dragDock(e, dockRef.current) }}>
        <span className="ask-dock-mark"><AetherisGlyph size={14} /></span>
        <div><b>Ask Intros</b><small>Your butler for the whole system</small></div>
        {voiceOutputSupported() && <button className={`icon-btn ${voice.speakReplies ? 'active' : ''}`}
          aria-label={voice.speakReplies ? 'Stop speaking replies' : 'Speak replies out loud'}
          title={voice.speakReplies ? 'Speaking replies out loud' : 'Replies are silent'}
          onClick={() => { setVoice({ speakReplies: !voice.speakReplies }); if (voice.speakReplies) stopReading() }}>
          {voice.speakReplies ? <Volume2 size={15} /> : <VolumeX size={15} />}</button>}
        {pos && <button className="icon-btn" aria-label="Move Ask Intros back to the corner" title="Back to the corner" onClick={() => { setPos(null); writePoint(POS_KEY, null) }}>↘</button>}
        <button className="icon-btn" aria-label="Close Ask Intros" onClick={() => setOpen(false)}><X size={16} /></button>
      </header>

      {dictation.supported && <div className="ask-dock-voice">
        <button type="button" className={voice.conversation ? 'active' : ''} aria-pressed={voice.conversation}
          onClick={() => { const next = !voice.conversation; setVoice({ conversation: next }); if (!next) { dictation.stop(); stopReading() } }}>
          <Radio size={13} /> Conversation mode
        </button>
        {status && <span className={`ask-dock-status ${status.toLowerCase()}`}><i />{status}…</span>}
        {dictation.interim && <em>{dictation.interim}</em>}
      </div>}

      <div className="ask-dock-log" ref={listRef}>
        {turns.map((turn, index) => <div key={index} className={`ask-dock-turn ${turn.role}`}>
          <p>{turn.content}</p>
          {turn.role === 'assistant' && voiceOutputSupported() && <button type="button" className="ask-dock-say"
            aria-label="Read this reply aloud" onClick={() => readAloud([turn.content], 'Ask Intros')}><Volume2 size={12} /></button>}
          {turn.did && turn.did.length > 0 && <ul className="ask-dock-did">{turn.did.map(note => <li key={note}>{note}</li>)}</ul>}
        </div>)}
        {busy && <div className="ask-dock-turn assistant"><span className="ask-dock-thinking-pill"><ThinkingOrb state="solving" size={20} theme="dark" /><span>Thinking…</span></span></div>}
      </div>

      <div className="ask-dock-openers">{openers.length > 0 && <span className="ask-dock-openers-label">Next</span>}{openers.map(item =>
        <button key={item} disabled={busy} onClick={() => void send(item)}>{item}</button>)}</div>

      <form className="ask-dock-input" onSubmit={event => { event.preventDefault(); void send(input) }}>
        <input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask, say it, or tell me what to do…" />
        {dictation.supported && <button type="button" className={dictation.listening ? 'listening' : ''}
          aria-label={dictation.listening ? 'Stop listening' : 'Speak to Ask Intros'} onClick={dictation.toggle}>
          {dictation.listening ? <MicOff size={15} /> : <Mic size={15} />}</button>}
        <button type="submit" aria-label="Send" disabled={busy || !input.trim()}><ArrowUp size={15} /></button>
      </form>
    </aside>}
  </>
}
