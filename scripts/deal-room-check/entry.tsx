import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'

import '../../src/aetheris/styles.css'
import { DealsPage, OpenDealRoomButton } from '../../src/aetheris/deals-ui'
import { setShowcaseMode } from '../../src/aetheris/showcase'
import { A, B } from './db-stub'

const INTRO = '11111111-1111-4111-8111-111111111111'

function Page() {
  const [key, setKey] = useState(0)
  const [who, setWho] = useState('A')
  const as = (uid: string, label: string) => { (window as unknown as { __uid: string }).__uid = uid; setWho(label); setKey(k => k + 1) }
  useEffect(() => {
    // Stands in for the app shell, which takes "Open deal room" to the Deals page.
    const open = (e: Event) => { e.preventDefault(); setKey(k => k + 1) }
    window.addEventListener('aetheris:open-deals', open)
    return () => window.removeEventListener('aetheris:open-deals', open)
  }, [])
  return <div className="ix-classic" style={{ padding: 24, minHeight: '100vh', background: '#07090C', color: '#F2EEE6' }}>
    <nav style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <button id="as-a" onClick={() => as(A, 'A')}>Sign in as Ana</button>
      <button id="as-b" onClick={() => as(B, 'B')}>Sign in as Ben</button>
      <button id="showcase" onClick={() => { setShowcaseMode(true); setKey(k => k + 1) }}>Showcase</button>
      <span id="who">{who}</span>
    </nav>
    <section id="accepted-intro" style={{ marginBottom: 16 }}>
      <p>Accepted introduction with Ben Okafor</p>
      <OpenDealRoomButton draft={{ sourceKind: 'intro', sourceId: INTRO, title: 'Deal with Ben Okafor', need: 'Fractional CFO for the raise', counterpartId: B, counterpartName: 'Ben Okafor' }} />
    </section>
    <DealsPage key={key} />
  </div>
}
createRoot(document.getElementById('root')!).render(<Page />)
