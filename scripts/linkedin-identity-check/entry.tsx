import { createRoot } from 'react-dom/client'
import { LinkedInIdentityReview } from '../../src/aetheris/LinkedInIdentityReview'
import '../../src/aetheris/styles.css'
import '../../src/aetheris/public-info-review.css'
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:650,padding:20}}><LinkedInIdentityReview onSaved={receipt=>(window as any).__identityReceipts.push(receipt)} /></main>)
