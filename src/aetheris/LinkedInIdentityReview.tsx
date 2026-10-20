import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { loadLinkedInIdentityDraft, saveLinkedInIdentityDraft, type IdentityReceipt, type LinkedInIdentityDraft } from './linkedin-identity-review'
import type { OidcConsent } from './linkedin-oidc'
import { Btn } from './ui'

export function LinkedInIdentityReview({ onSaved }: { onSaved: (receipt: IdentityReceipt) => void }) {
  const [draft, setDraft] = useState<LinkedInIdentityDraft | null>(null)
  const [consent, setConsent] = useState<OidcConsent>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const generation = useRef(0)
  const refresh = async () => {
    const request = ++generation.current
    setLoading(true); setDraft(null); setConsent({}); setNotice('')
    try { const next = await loadLinkedInIdentityDraft(); if(request === generation.current) setDraft(next) }
    catch(error) { if(request === generation.current) setNotice(error instanceof Error ? error.message : 'LinkedIn identity could not be loaded.') }
    finally { if(request === generation.current) setLoading(false) }
  }
  useEffect(() => {
    void refresh()
    const { data: subscription } = supabase.auth.onAuthStateChange(event => {
      if(event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') return
      generation.current++; setDraft(null); setConsent({}); setNotice('Your account changed. Reload this review.'); setLoading(false); setSaving(false)
    })
    return () => { generation.current++; subscription.subscription.unsubscribe() }
  }, [])
  const apply = async () => {
    if(!draft || saving) return
    const request = generation.current
    setSaving(true); setNotice('')
    try {
      const receipt = await saveLinkedInIdentityDraft(draft, consent)
      if(request !== generation.current) return
      onSaved(receipt)
      setDraft({ ...draft, current: { name: receipt.name, email: receipt.email, avatar_url: receipt.avatarUrl } })
      setConsent({}); setNotice('The LinkedIn details you selected were saved to your profile.')
    } catch(error) { if(request === generation.current) setNotice(error instanceof Error ? error.message : 'Your LinkedIn details could not be saved.') }
    finally { if(request === generation.current) setSaving(false) }
  }
  return <section className="li-public-review" aria-label="Review my LinkedIn identity">
    <span className="li-scan-label">Review linked identity</span>
    <p>Select the details to use on your profile. Profile contact email is managed separately from your sign-in email.</p>
    {loading ? <p role="status">Loading your LinkedIn identity…</p> : draft ? <>
      {(['name','email','photoUrl'] as const).filter(key=>draft.suggestion[key]).map(key=><label className="li-public-consent" key={key}>
        <input type="checkbox" checked={consent[key] === true} disabled={saving} onChange={event=>setConsent(previous=>({...previous,[key]:event.target.checked}))} />
        <span><b>{key === 'name' ? 'Name' : key === 'email' ? 'Profile contact email' : 'LinkedIn profile photo'}</b><br />{key === 'photoUrl' ? 'Use the photo supplied by your LinkedIn identity.' : draft.suggestion[key]}</span>
      </label>)}
      <Btn kind="secondary" disabled={saving || !Object.values(consent).some(Boolean)} onClick={()=>void apply()}>{saving ? 'Saving…' : 'Apply selected identity details'}</Btn>
    </> : <p>Connect LinkedIn to make its identity details available for review.</p>}
    <Btn kind="quiet" disabled={loading || saving} onClick={()=>void refresh()}>Reload identity details</Btn>
    {notice && <p role="status" className="li-scan-outcome">{notice}</p>}
  </section>
}
