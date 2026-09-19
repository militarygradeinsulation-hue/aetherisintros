import { useEffect, useRef, useState } from 'react'
import { ArrowUp, X } from 'lucide-react'

import { askIntros, type AskIntrosAction } from '@/lib/askIntros.functions'
import { pageMeta } from './pageMeta'
import { readTextScale } from './textScale'
import { readCursorScale } from './cursorScale'
function AetherisGlyph({ size = 18 }: { size?: number }) {
  return <span className="aetheris-glyph" style={{ width: size, height: size }} aria-hidden="true"><i /><b /></span>
}

export type { AskIntrosAction }

interface Turn { role: 'user' | 'assistant'; content: string; did?: string[] }

const openers = [
  'What should I do first today?',
  'Make the text bigger',
  'Explain Active Memory',
  'Take me to my introductions',
  'How does a double opt-in intro work?',
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

/** Hovering butler: teaches the system and operates it on the member's behalf. */
export function AskIntrosDock({ page, peopleNames, memberName, briefing, contextPanel, run }: AskIntrosDockProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([{
    role: 'assistant',
    content: `I am Ask Intros. Ask me how anything here works, or tell me to do it — change your text size, open a page, post a need, find who matters this week.`,
  }])
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [turns, open])

  const send = async (text: string) => {
    const question = text.trim()
    if (!question || busy) return
    setInput('')
    const history = [...turns, { role: 'user' as const, content: question }]
    setTurns(history)
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
    } catch {
      setTurns(current => [...current, { role: 'assistant', content: 'I could not reach Ask Intros just now. Try again in a moment.' }])
    } finally {
      setBusy(false)
    }
  }

  return <>
    <button className={`ask-dock-fab ${open ? 'active' : ''}`} aria-label="Ask Intros" onClick={() => setOpen(value => !value)}>
      {open ? <X size={18} /> : <AetherisGlyph size={18} />}
      {!open && <span>Ask Intros</span>}
    </button>

    {open && <aside className="ask-dock" role="dialog" aria-label="Ask Intros">
      <header>
        <span className="ask-dock-mark"><AetherisGlyph size={14} /></span>
        <div><b>Ask Intros</b><small>Your butler for the whole system</small></div>
        <button className="icon-btn" aria-label="Close Ask Intros" onClick={() => setOpen(false)}><X size={16} /></button>
      </header>

      <div className="ask-dock-log" ref={listRef}>
        {turns.map((turn, index) => <div key={index} className={`ask-dock-turn ${turn.role}`}>
          <p>{turn.content}</p>
          {turn.did && turn.did.length > 0 && <ul className="ask-dock-did">{turn.did.map(note => <li key={note}>{note}</li>)}</ul>}
        </div>)}
        {busy && <div className="ask-dock-turn assistant"><p className="ask-dock-thinking">Thinking…</p></div>}
      </div>

      <div className="ask-dock-openers">{openers.map(item =>
        <button key={item} disabled={busy} onClick={() => void send(item)}>{item}</button>)}</div>

      <form className="ask-dock-input" onSubmit={event => { event.preventDefault(); void send(input) }}>
        <input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask, or tell me what to do…" />
        <button type="submit" aria-label="Send" disabled={busy || !input.trim()}><ArrowUp size={15} /></button>
      </form>
    </aside>}
  </>
}
