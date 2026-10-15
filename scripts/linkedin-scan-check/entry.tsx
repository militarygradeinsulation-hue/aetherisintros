import { createRoot } from 'react-dom/client'
import { useState } from 'react'

import '../../src/aetheris/styles.css'
import { CONTACT_KEYS, PROFILE_KEYS } from '../../src/aetheris/linkedin-scan'
import { LinkedInScanPanel, saveProfileScan, type ScanPatch } from '../../src/aetheris/linkedin-scan-ui'

// The member's current profile, as My profile passes it to the panel.
const CURRENT: ScanPatch = { name: 'Maya Okafor', title: 'Founder', company: '', location: 'Lagos, Lagos State, Nigeria', expertise: '' }

function ContactForm() {
  const [form, setForm] = useState<ScanPatch>({})
  return <div id="contact">
    <LinkedInScanPanel keys={CONTACT_KEYS} current={form} demo heading="Fill this contact from LinkedIn" intro="Contacts are private."
      applyLabel="Fill the form" onApply={async patch => { setForm(f => ({ ...f, ...patch })); return { status: 'filled', message: 'Filled in the form below. Not saved yet.' } }} />
    <output id="contact-form">{JSON.stringify(form)}</output>
  </div>
}

function Page() {
  return <div style={{ padding: 24, minHeight: '100vh', background: '#07090C', color: '#F2EEE6', display: 'grid', gap: 24, maxWidth: 980 }}>
    <div id="profile">
      <LinkedInScanPanel keys={PROFILE_KEYS} current={CURRENT} demo={false} heading="Fill your profile from LinkedIn"
        intro="Review every field." applyLabel="Apply to my profile" onApply={saveProfileScan} />
    </div>
    <ContactForm />
  </div>
}
createRoot(document.getElementById('root')!).render(<Page />)
