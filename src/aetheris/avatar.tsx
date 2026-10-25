import { memberClient } from '@/integrations/supabase/member-client'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const resolvedUrls = new Map<string, string>()
const pendingUrls = new Map<string, Promise<string | null>>()
let cacheEpoch = 0
export function clearAvatarCache() {
  cacheEpoch++
  for (const url of resolvedUrls.values()) URL.revokeObjectURL(url)
  resolvedUrls.clear(); pendingUrls.clear()
}

// Bundled Vite assets and Lovable image assets are site-relative URLs, not
// objects in the private Supabase `avatars` bucket. Treating "/assets/..." as
// a storage key makes profile portraits silently disappear behind initials.
export const isDirectAvatarUrl = (source: string) => /^(https?:|data:|blob:|\/(?!\/)|\.\.?\/|assets\/|__l5e\/)/i.test(source)
const isDirectUrl = isDirectAvatarUrl

export async function resolveAvatarUrl(source: string): Promise<string | null> {
  if (isDirectUrl(source)) return source
  const { data: auth } = await supabase.auth.getSession()
  const viewer = auth.session?.user.id
  if (!viewer) return null
  const key = `${viewer}:${source}`
  const epoch = cacheEpoch
  const cached = resolvedUrls.get(key)
  if (cached) return cached
  const pending = pendingUrls.get(key)
  if (pending) return pending

  const work = (async () => {
    const db = await memberClient(viewer)
    const { data, error } = await db.storage.from('avatars').download(source)
    const current = await supabase.auth.getSession()
    if (error || !data || epoch !== cacheEpoch || current.data.session?.user.id !== viewer) return null
    const url = URL.createObjectURL(data)
    resolvedUrls.set(key, url)
    return url
  })().finally(() => pendingUrls.delete(key))
  pendingUrls.set(key, work)
  return work
}

/** Renders either a direct image URL or a private member-owned storage object. */
export function AvatarImage({ source, alt = '', className = '', width, height, loading = 'lazy', style }: {
  source?: string | null | undefined
  alt?: string
  className?: string
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
  style?: React.CSSProperties
}) {
  const direct = source && isDirectUrl(source) ? source : null
  const [url, setUrl] = useState<string | null>(direct)

  useEffect(() => {
    let active = true
    if (!source) { setUrl(null); return }
    if (isDirectUrl(source)) { setUrl(source); return }
    let revision = 0
    const load = async () => {
      const requested = ++revision
      setUrl(null)
      try {
        const resolved = await resolveAvatarUrl(source)
        if (active && requested === revision) setUrl(resolved)
      } catch { if (active && requested === revision) setUrl(null) }
    }
    void load()
    const { data: subscription } = supabase.auth.onAuthStateChange(event => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') return
      revision++; clearAvatarCache(); setUrl(null)
      if (event !== 'SIGNED_OUT') setTimeout(() => { if (active) void load() }, 0)
    })
    return () => { active = false; revision++; subscription.subscription.unsubscribe() }
  }, [source])

  if (!url) return null
  return <img src={url} alt={alt} className={className} width={width} height={height} loading={loading} style={style}
    onError={() => { if (source) clearAvatarCache(); setUrl(null) }} />
}
