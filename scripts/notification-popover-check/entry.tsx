import React from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/aetheris/styles.css'
import { LiveNotificationsBell } from '../../src/aetheris/notifications-bell'

const fixture = document.getElementById('root')
if (!fixture) throw Error('Fixture root missing')
createRoot(fixture).render(
  <main style={{ minHeight: '130vh', background: '#090c12', color: 'white', padding: '60px 0' }}>
    <header className="fixture-transformed-header" style={{
      overflow: 'hidden', position: 'relative', transform: 'translateZ(0)',
      display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
      margin: '0 auto', padding: '12px 8px',
      width: '58%', maxWidth: 420, border: '1px solid #555',
      borderRadius: 12,
    }}>
      <span style={{ marginRight: 'auto', fontSize: 11 }}>Ask Intros</span>
      <LiveNotificationsBell onOpen={() => {}} />
    </header>
    <p style={{ margin: 12 }}>Synthetic notifications, no external accounts.</p>
  </main>
)
