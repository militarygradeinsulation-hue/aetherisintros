import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SpecterDetectView } from '../../src/intros-ui/views/SpecterDetectView';
import { AetherisWorkspaceShell } from '../../src/intros-ui/components/layout/AetherisWorkspaceShell';
import { ExecutiveUpgrade } from '../../src/aetheris/ExecutiveUpgrade';

// Executive launcher harness (#executive): the dialog is controlled from the
// workspace sidebar action, with no floating bubble, and the Butler launcher
// stays fixed and unobstructed — mirroring the authenticated /app route.
function ExecutiveHarness() {
  const [open, setOpen] = useState(false);
  return <>
    <AetherisWorkspaceShell
      activePage="home"
      onNavigate={page => { document.body.dataset['destination'] = page; }}
      onWorkspace={page => { document.body.dataset['workspace'] = page; }}
      onSearch={query => { document.body.dataset['search'] = query; }}
      executiveAction={{ label: 'Executive access', onOpen: () => setOpen(true) }}
      member={{ name: 'Test Member' }}
    >
      <p style={{ padding: 24 }}>Workspace content</p>
    </AetherisWorkspaceShell>
    <button type="button" className="ask-dock-fab" aria-label="Ask Intros Butler"
      style={{ position: 'fixed', right: 22, bottom: 26, zIndex: 92 }}>
      Butler
    </button>
    <ExecutiveUpgrade tier="basic" isAdmin={false} open={open} onOpenChange={setOpen} hideTrigger />
  </>;
}

// Match the real fixed-height workspace host rather than rendering Specter on an unbounded page.
createRoot(document.getElementById('root')!).render(
  window.location.hash === '#executive' ? <ExecutiveHarness /> :
  <div className="ix-specter-mode">
    <main className="arch-product-main">
      <SpecterDetectView
        onNavigate={page => { document.body.dataset['destination'] = page; }}
        onWorkspace={page => { document.body.dataset['workspace'] = page; }}
        onSearch={query => { document.body.dataset['search'] = query; }}
        member={{ name: 'Test Member' }}
      />
    </main>
  </div>,
);
