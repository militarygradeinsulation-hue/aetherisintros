import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { fetchAetherisNews, type NewsItem } from '../lib/news.functions'
import { fetchNewsImages } from '../lib/newsImages.functions'

export type { NewsItem }

/** Routes publisher artwork through Ask Intros so it always loads in-site. */
export function newsImageSrc(url: string | null | undefined): string | null {
  if (!url || !/^https?:\/\//i.test(url)) return null
  return `/api/public/news-image?url=${encodeURIComponent(url)}`
}

const ImagesContext = createContext<Record<string, string>>({})
export const NewsImagesProvider = ImagesContext.Provider

/** Reads a resolved lead image for an article, if one was found. */
export function useResolvedNewsImage(item: NewsItem): string | null {
  const resolved = useContext(ImagesContext)
  return item.image ?? resolved[item.link] ?? null
}

/**
 * Fills in lead images for stories whose feed entry carried none, by reading
 * each article's own page metadata a dozen links at a time.
 */
export function useNewsImages(items: NewsItem[]): Record<string, string> {
  const load = useServerFn(fetchNewsImages)
  const [found, setFound] = useState<Record<string, string>>({})
  const tried = useRef(new Set<string>())
  const busy = useRef(false)

  useEffect(() => {
    let live = true
    const run = async () => {
      if (busy.current) return
      const pending = items
        .filter(item => !item.image && item.link && !tried.current.has(item.link))
        .map(item => item.link)
      if (!pending.length) return
      busy.current = true
      try {
        for (let i = 0; i < pending.length; i += 12) {
          const batch = pending.slice(i, i + 12)
          batch.forEach(link => tried.current.add(link))
          const result = await load({ data: { links: batch } })
          if (!live) return
          if (result && Object.keys(result).length) setFound(prev => ({ ...prev, ...result }))
        }
      } catch {
        /* keep the branded fallback */
      } finally {
        busy.current = false
      }
    }
    void run()
    return () => { live = false }
  }, [items, load])

  return found
}

/** Live Aetheris news feed, cached for ten minutes. */
export function useAetherisNews() {
  const load = useServerFn(fetchAetherisNews)
  return useQuery({
    queryKey: ['aetheris-news'],
    queryFn: () => load({}),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function newsAge(published: string | null): string {
  if (!published) return 'Recent'
  const then = new Date(published).getTime()
  if (Number.isNaN(then)) return 'Recent'
  const mins = Math.max(1, Math.round((Date.now() - then) / 60000))
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}
