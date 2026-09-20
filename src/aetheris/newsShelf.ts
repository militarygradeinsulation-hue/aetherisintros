import { useCallback, useEffect, useState } from 'react'
import type { NewsItem } from './news'

export type Shelf = 'later' | 'library'

export interface ShelfEntry {
  item: NewsItem
  savedAt: string
  note?: string
}

type ShelfState = Record<Shelf, ShelfEntry[]>

const KEY = 'aetheris.news-shelf.v1'
const empty: ShelfState = { later: [], library: [] }

function read(): ShelfState {
  if (typeof window === 'undefined') return empty
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<ShelfState>
    return {
      later: Array.isArray(parsed.later) ? parsed.later : [],
      library: Array.isArray(parsed.library) ? parsed.library : [],
    }
  } catch {
    return empty
  }
}

const listeners = new Set<(state: ShelfState) => void>()

function write(next: ShelfState) {
  try { window.localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
  listeners.forEach(listener => listener(next))
}

/** The member's own reading shelves: Read later and Library. Private to this account. */
export function useNewsShelf() {
  const [state, setState] = useState<ShelfState>(empty)

  useEffect(() => {
    setState(read())
    const listener = (next: ShelfState) => setState(next)
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  const has = useCallback((shelf: Shelf, id: string) => state[shelf].some(entry => entry.item.id === id), [state])

  const toggle = useCallback((shelf: Shelf, item: NewsItem) => {
    const current = read()
    const list = current[shelf]
    const next: ShelfState = {
      ...current,
      [shelf]: list.some(entry => entry.item.id === item.id)
        ? list.filter(entry => entry.item.id !== item.id)
        : [{ item, savedAt: new Date().toISOString() }, ...list].slice(0, 200),
    }
    write(next)
    setState(next)
    return next[shelf].some(entry => entry.item.id === item.id)
  }, [])

  const remove = useCallback((shelf: Shelf, id: string) => {
    const current = read()
    const next = { ...current, [shelf]: current[shelf].filter(entry => entry.item.id !== id) }
    write(next)
    setState(next)
  }, [])

  return { later: state.later, library: state.library, has, toggle, remove }
}
