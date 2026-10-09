import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'

import '../../src/aetheris/styles.css'
import { QuickMenuHost } from '../../src/aetheris/quick-menu-ui'
import { QuickNoteHost } from '../../src/aetheris/quick-note-ui'

function Page() {
  const [log, setLog] = useState<string[]>([])
  const add = (s: string) => setLog(l => [...l, s])
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ question?: string; x?: number; y?: number; voice?: boolean } | undefined>).detail
      add(`assistant:${d?.question ?? ''}${d?.voice ? ' [voice]' : ''}${typeof d?.x === 'number' ? ` @${d.x},${d.y}` : ''}`)
    }
    window.addEventListener('aetheris:open-assistant', on)
    return () => window.removeEventListener('aetheris:open-assistant', on)
  }, [])
  return <div style={{ padding: 40, minHeight: '100vh', background: '#07090C', color: '#F2EEE6' }}>
    <QuickMenuHost live
      onGo={t => add(`go:${t.kind}:${t.page}`)}
      findMember={id => (id === 'm1' ? { id, name: 'Ana Diaz' } : null)}
      onOpenMember={id => add(`open:${id}`)}
      onRequestIntro={id => add(`intro:${id}`)}
      onSearch={t => add(`search:${t}`)} />
    <QuickNoteHost />
    <p id="blank">Blank area</p>
    <p id="text">Logistics CFO in Texas</p>
    <span id="ana" data-person-portrait="m1">Ana</span>
    <a id="link" href="https://example.com/x">A link</a>
    <input id="field" defaultValue="type here" />
    <ul id="log">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
  </div>
}
createRoot(document.getElementById('root')!).render(<Page />)
