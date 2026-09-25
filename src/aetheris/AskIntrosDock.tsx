import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Mic, MicOff, Radio, Volume2, VolumeX, X } from 'lucide-react'
import { ThinkingOrb } from '@/components/ui/thinking-orbs'

import { askIntros, type AskIntrosAction } from '@/lib/askIntros.functions'
import { pageMeta } from './pageMeta'
import { readTextScale } from './textScale'
import { readCursorScale } from './cursorScale'
import { useGraphInputs } from './graph-store'
import { answerGraphQuestion } from './opportunity-graph'
import { ceoViewLabel, recognizeCommand } from './ceo-engine'
import { openCeo } from './ceo-store'
import {
  isStopPhrase, readAloud, readerSnapshot, stopReading, useDictation, useReader, useVoiceSettings, voiceOutputSupported,
} from './voice'
function AetherisGlyph({ size = 18 }: { size?: number }) {
  return <span className="aetheris-glyph" style={{ width: size, height: size }} aria-hidden="true"><i /><b /></span>
}

export type { AskIntrosAction }

interface Turn { role: 'user' | 'assistant'; content: string; did?: string[] }

const startingOpeners = [
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
export function AskIntrosDock({ page, peopleNames, memberName, briefing, contextPanel, run }: AskIntrosDockProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([{
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
  useEffect(() => {
    const show = (event: Event) => {
      setOpen(true)
      const prompt = (event as CustomEvent<string>).detail
      if (typeof prompt === 'string') setInput(prompt)
    }
    window.addEventListener('aetheris:open-assistant', show)
    return () => window.removeEventListener('aetheris:open-assistant', show)
  }, [])

  const send = async (text: string) => {
    const question = text.trim()
    if (!question || sending.current) return
    sending.current = true
    setInput('')
    const history = [...turns, { role: 'user' as const, content: question }]
    setTurns(history)
    const command = recognizeCommand(question)
    if (command?.view) {
      openCeo(command)
      setTurns(current => [...current, { role: 'assistant', content: `Opening ${ceoViewLabel[command.view!]}${command.arg && command.view === 'who' ? ` for “${command.arg}”` : ''}. Everything in it comes from your recorded data — no AI needed.`, did: [ceoViewLabel[command.view!]] }])
      sending.current = false
      return
    }
    const local = answerGraphQuestion(question, graphInputs)
    if (local) {
      setTurns(current => [...current, { role: 'assistant', content: local }])
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
            pages: pageMeta.map(m => ({ id: m.id, label: m.label, blurb: m.blurb })),
            people: peopleNames.slice(0, 60),
          },
        },
      })
      const did = answer.actions.flatMap(action => {
        const note = run(action)
        return note ? [note] : []
      })
      setTurns(current => [...current, { role: 'assistant', content: answer.reply, did }])
      const next = answer.suggestions.filter(item => item.toLowerCase() !== question.toLowerCase())
      if (next.length) setOpeners(next.slice(0, 4))
      const reads = answer.actions.some(action => action.kind === 'read-page')
      if (!reads && (voice.speakReplies || voice.conversation) && voiceOutputSupported()) {
        readAloud([answer.reply], 'Ask Intros')
      }
    } catch {
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

  const status = busy ? 'Thinking' : reader.state !== 'idle' ? 'Speaking' : dictation.listening ? 'Listening' : ''

  return <>
    <button className={`ask-dock-fab ${open ? 'active' : ''}`} aria-label="Ask Intros" onClick={() => setOpen(value => !value)}>
      {open ? <X size={18} /> : <AetherisGlyph size={18} />}
      {!open && <span>Ask Intros</span>}
    </button>

    {open && <aside className="ask-dock" role="dialog" aria-label="Ask Intros" data-voice-skip="true">
      <header>
        <span className="ask-dock-mark"><AetherisGlyph size={14} /></span>
        <div><b>Ask Intros</b><small>Your butler for the whole system</small></div>
        {voiceOutputSupported() && <button className={`icon-btn ${voice.speakReplies ? 'active' : ''}`}
          aria-label={voice.speakReplies ? 'Stop speaking replies' : 'Speak replies out loud'}
          title={voice.speakReplies ? 'Speaking replies out loud' : 'Replies are silent'}
          onClick={() => { setVoice({ speakReplies: !voice.speakReplies }); if (voice.speakReplies) stopReading() }}>
          {voice.speakReplies ? <Volume2 size={15} /> : <VolumeX size={15} />}</button>}
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
