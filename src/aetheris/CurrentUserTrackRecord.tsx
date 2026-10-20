import { useEffect, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { TrackRecordDashboard } from './TrackRecordDashboard'
import { TrackRecordPanel } from './track-record-ui'
import { Eyebrow } from './ui'

/** Current-member wrapper so reputation and proof live inside the canonical Passport page. */
export function CurrentUserTrackRecord() {
  const [userId, setUserId] = useState<string | null>(null)
  const [resolved, setResolved] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    supabase.auth.getUser().then(({ data, error }) => {
      if (!live) return
      if (error && error.name !== 'AuthSessionMissingError') setAuthError(error.message)
      setUserId(data.user?.id ?? null)
      setResolved(true)
    }).catch((err: unknown) => {
      if (!live) return
      setAuthError(err instanceof Error ? err.message : 'Could not confirm your session.')
      setResolved(true)
    })
    return () => { live = false }
  }, [])

  if (!resolved) return <section className="executive-section"><p className="og-note">Loading track record…</p></section>
  if (authError) return <section className="executive-section"><p className="og-note" role="alert">Could not load your track record: {authError}</p></section>
  if (!userId) return <section className="executive-section"><p className="og-note">Sign in to see your track record.</p></section>

  return <section className="executive-section" aria-label="Your verified track record">
    <Eyebrow>PROOF & REPUTATION</Eyebrow>
    <p className="og-note">Self-stated outcomes stay visibly separate from server-verified outcomes. Reputation is calculated from recorded activity and cannot be edited directly.</p>
    <div className="og-stack">
      <TrackRecordDashboard userId={userId} />
      <TrackRecordPanel userId={userId} editable />
    </div>
  </section>
}
