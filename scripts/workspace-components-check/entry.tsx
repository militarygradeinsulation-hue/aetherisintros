import React from 'react'
import { createRoot } from 'react-dom/client'
import { PdfPreviewButton } from '../../src/aetheris/documents/PdfPreviewButton'
createRoot(document.getElementById('root')!).render(<main>
  <PdfPreviewButton url="/test.pdf" name="Evidence.pdf"/>
  <PdfPreviewButton url="/missing.pdf" name="Missing.pdf"/>
</main>)
