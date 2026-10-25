import React from 'react'
import {createRoot} from 'react-dom/client'
import {EvidenceProvider,EvidenceWorkspace} from '../../src/features/evidence-loop/EvidenceWorkspace'
createRoot(document.getElementById('root')!).render(<EvidenceProvider><p style={{padding:12}}>TEST FIXTURES ONLY · no live member data</p><EvidenceWorkspace/></EvidenceProvider>)
