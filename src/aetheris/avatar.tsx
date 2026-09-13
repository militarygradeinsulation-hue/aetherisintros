import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const resolvedUrls = new Map<string, string>()
const pendingUrls = new Map<string, Promise<string | null>>()

const isDirectUrl = (source: string) => /^(https?:|data:|blob:)/i.test(source)

async function resolveAvatarUrl(source: string): Promise<string | null> {
  if (isDirectUrl(source)) return source
  const cached = resolvedUrls.get(source)
  if (cached) return cached
  const pending = pendingUrls.get(source)
  if (pending) return pending

  const work = (async () => {
    const { data, error } = await supabase.storage.from('avatars').download(source)
    if (error || !data) return null
    const url = URL.createObjectURL(data)
    resolvedUrls.set(source, url)
    pendingUrls.delete(source)
    return url
  })()
  pendingUrls.set(source, work)
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
  const [url, setUrl] = useState<string | null>(source ? resolvedUrls.get(source) ?? direct : null)

  useEffect(() => {
    let active = true
    if (!source) { setUrl(null); return }
    if (isDirectUrl(source)) { setUrl(source); return }
    const cached = resolvedUrls.get(source)
    if (cached) { setUrl(cached); return }
    setUrl(null)
    void resolveAvatarUrl(source).then(resolved => { if (active) setUrl(resolved) })
    return () => { active = false }
  }, [source])

  if (!url) return null
  return <img src={url} alt={alt} className={className} width={width} height={height} loading={loading} style={style} />
}
