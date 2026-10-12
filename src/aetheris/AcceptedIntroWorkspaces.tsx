import { useCallback, useEffect, useMemo, useState } from 'react'
import { Handshake } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { StartWorkspaceButton } from './workspaces/StartWorkspace'
import { Eyebrow } from './ui'

type IntroRow = {
  id: string
  user_id: string
  target_user_id: string | null
  accepted_at: string | null
  reason: string | null
}

type AcceptedIntro = IntroRow & { otherId: string; otherName: string }

export function AcceptedIntroWorkspaces({ onOpen }: { onOpen: () => void }) {
  const [rows, setRows] = useState<AcceptedIntro[]>([])
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    setError('')
    const auth = await supabase.auth.getUser()
    const me = auth.data.user?.id
    if (!me) { setRows([]); setLoaded(true); return }

    const db = supabase as any
    const intro = await db.from('intro_requests')
      .select('id,user_id,target_user_id,accepted_at,reason')
      .not('accepted_at', 'is', null)
      .or(`user_id.eq.${me},target_user_id.eq.${me}`)
      .order('accepted_at', { ascending: false })
      .limit(20)

    if (intro.error) { setError(intro.error.message); setLoaded(true); return }

    const source = (intro.data ?? []) as IntroRow[]
    // A signed-in member cannot SELECT public.profiles directly. This RPC
    // reveals only their accepted-introduction counterparts, never third parties.
    const counterparts = source.length
      ? await db.rpc('my_intro_participant_names', { p_intro_ids: source.map(r => r.id) })
      : { data: [], error: null }
    if (counterparts.error) { setError(counterparts.error.message); setLoaded(true); return }
    const names = new Map<string, string>(
      (counterparts.data ?? []).map((p: { intro_request_id: string; other_name: string }) => [
        p.intro_request_id, p.other_name?.trim() || 'Member',
      ]),
    )

    setRows(source.flatMap(r => {
      const otherId = r.user_id === me ? r.target_user_id : r.user_id
      return otherId ? [{ ...r, otherId, otherName: names.get(r.id) ?? 'Member' }] : []
    }))
    setLoaded(true)
  }, [])

  useEffect(() => { void load() }, [load])

  const recent = useMemo(() => rows.slice(0, 8), [rows])
  if (!loaded) return <section className="executive-section"><p className="og-note">Loading accepted introductions…</p></section>
  if (error) return <section className="executive-section"><p className="og-note" role="alert">Accepted introductions could not load: {error}</p></section>
  if (!recent.length) return null

  return <section className="executive-section accepted-intro-workspaces">
    <Eyebrow><Handshake size={12} /> ACCEPTED INTRODUCTIONS</Eyebrow>
    <h2>Turn the conversation into working space when there is real work to do.</h2>
    <p className="og-note">A Deal Workspace does not change the introduction or copy its private context. It links back to the accepted intro and invites the other person into a separate collaborative workspace.</p>
    <div className="og-stack">
      {recent.map(row => <article key={row.id} className="oc-card">
        <div>
          <b>{row.otherName}</b>
          {row.reason && <p>{row.reason}</p>}
          <small>Accepted {row.accepted_at ? new Date(row.accepted_at).toLocaleDateString() : ''}</small>
        </div>
        <StartWorkspaceButton
          source="intro_request"
          sourceId={row.id}
          withName={row.otherName}
          label="Open deal workspace"
          onOpen={onOpen}
        />
      </article>)}
    </div>
  </section>
}
