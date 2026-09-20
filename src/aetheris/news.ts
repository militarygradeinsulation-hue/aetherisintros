import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { fetchAetherisNews, type NewsItem } from '../lib/news.functions'

export type { NewsItem }

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
