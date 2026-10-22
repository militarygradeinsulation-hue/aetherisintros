import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

/* eslint-disable @typescript-eslint/no-explicit-any */
export const rpc = (name: string, args?: Record<string, unknown>) =>
  (supabase as any).rpc(name, args) as Promise<{ data: any; error: { message: string } | null }>

/** Current signed-in user id; null while loading or signed out. */
export function useSessionUser() {
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    void supabase.auth.getUser().then(({ data }) => {
      if (!alive) return
      setUserId(data.user?.id ?? null)
      setReady(true)
    })
    return () => { alive = false }
  }, [])
  return { userId, ready }
}

export function SignInRequired({ what }: { what: string }) {
  return <section className="executive-section"><p className="og-note">Sign in as a member to use {what}.</p></section>
}
