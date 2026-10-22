import React from 'react'
import { createRoot } from 'react-dom/client'
import { PdfPreviewButton } from '../../src/aetheris/documents/PdfPreviewButton'
import { AdminOverview } from '../../src/aetheris/admin-overview'
import { setAccount } from '../admin-connections-check/access-stub'
createRoot(document.getElementById('root')!).render(<main>
  <nav><button onClick={() => setAccount(false)}>Ordinary member</button><button onClick={() => setAccount(true,'admin-a')}>Admin A</button><button onClick={() => setAccount(true,'admin-b')}>Admin B</button></nav>
  <PdfPreviewButton url="/test.pdf" name="Evidence.pdf"/>
  <PdfPreviewButton url="/missing.pdf" name="Missing.pdf"/>
  <AdminOverview/>
</main>)
