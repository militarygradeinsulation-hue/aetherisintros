import React from 'react';
import { createRoot } from 'react-dom/client';
import { SpecterDetectView } from '../../src/intros-ui/views/SpecterDetectView';

// Match the real fixed-height workspace host rather than rendering Specter on an unbounded page.
createRoot(document.getElementById('root')!).render(
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
