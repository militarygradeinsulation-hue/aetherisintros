import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { loadButlerHistory, saveButlerTurn } from '@/lib/butler.functions'

export interface ButlerDisplayTurn { id?: string; at?: string; role: 'user' | 'assistant'; content: string; did?: string[]; sources?: { title: string; url: string }[] }
const welcome: ButlerDisplayTurn = { role: 'assistant', content: 'I’m Butler. Ask me to research, analyze a file, find account information, draft in your voice, or help get something done.' }
const identify = (turn: ButlerDisplayTurn) => ({ ...turn, id: turn.id ?? crypto.randomUUID(), at: turn.at ?? new Date().toISOString() })

export function useButlerConversations() {
  const [turns, rawSetTurns] = useState<ButlerDisplayTurn[]>([welcome])
  const [owner, setOwner] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [conversation, setConversation] = useState('')
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState('Loading conversation…')
  const [history, setHistory] = useState<{ id: string; title: string }[]>([])
  const [historyBefore, setHistoryBefore] = useState<string | null>(null)
  const visible = useRef(turns)
  visible.current = turns
  const [older, setOlder] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const saved = useRef(new Set<string>())
  const scope = useRef({ owner, conversation })
  scope.current = { owner, conversation }
  const queue = useRef(Promise.resolve())
  useEffect(() => {
    let live = true
    const reset = (id: string | null) => {
      if (!live) return
      rawSetTurns([welcome]); saved.current.clear(); setOwner(id); setAuthReady(true); setHistory([]); setOlder(null)
      let last: string | null = null
      try { if (id) last = localStorage.getItem('butler.last.' + id) } catch { /* optional */ }
      setConversation(last && /^[0-9a-f-]{36}$/i.test(last) ? last : crypto.randomUUID())
      setReady(!id); setNotice(id ? 'Loading conversation…' : 'Sign in to save conversations across visits.')
    }
    void supabase.auth.getSession().then(({ data }) => reset(data.session?.user.id ?? null))
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session?.user.id !== scope.current.owner) reset(session?.user.id ?? null)
      }
    })
    return () => { live = false; data.subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    if (!owner || !conversation) return
    let live = true
    setReady(false); saved.current.clear()
    void loadButlerHistory({ data: { conversation } }).then(result => {
      if (!live) return
      const entries = result.entries.map(e => e.turn).reverse()
      entries.forEach(t => saved.current.add(t.id))
      rawSetTurns(entries.length ? entries : [welcome]); setOlder(result.before ?? null)
      setReady(true); setNotice('Conversation saved privately to your account.')
      try { localStorage.setItem('butler.last.' + owner, conversation) } catch { /* optional */ }
    }).catch(() => { if (live) setNotice('History unavailable. Retry to avoid losing your place.') })
    return () => { live = false }
  }, [owner, conversation, retry])
  const persist = useCallback((values: ButlerDisplayTurn[]) => {
    if (!owner || !conversation || !ready) return
    const pending = values.filter(t => t.id && !saved.current.has(t.id))
    if (!pending.length) return
    setNotice('Saving conversation…')
    queue.current = queue.current.catch(() => {}).then(async () => {
      for (const turn of pending) {
        if (scope.current.owner !== owner || scope.current.conversation !== conversation) return
        if (saved.current.has(turn.id!)) continue
        await saveButlerTurn({ data: { owner, conversation, turn: { id: turn.id!, at: turn.at!, role: turn.role, content: turn.content.slice(0, 16000) } } })
        if (scope.current.owner !== owner || scope.current.conversation !== conversation) return
        saved.current.add(turn.id!)
      }
      if (scope.current.owner === owner && scope.current.conversation === conversation) setNotice('Conversation saved privately to your account.')
    }).catch(() => { if (scope.current.owner === owner && scope.current.conversation === conversation) setNotice('Conversation save failed. Keep this window open and retry saving.') })
  }, [owner, conversation, ready])
  const setTurns = useCallback((next: SetStateAction<ButlerDisplayTurn[]>) => {
    if (scope.current.owner !== owner || scope.current.conversation !== conversation) return
    const values = (typeof next === 'function' ? next(visible.current) : next).map(t => t === welcome ? t : identify(t))
    visible.current = values
    rawSetTurns(values)
    // Queue before navigation can unmount the dock, including local voice commands.
    persist(values)
  }, [owner, conversation, persist])
  useEffect(() => { persist(turns) }, [turns, persist])
  const listHistory = async (more = false) => {
    if (!owner) return
    try {
      const result = await loadButlerHistory({ data: more && historyBefore ? { before: historyBefore } : {} })
      if (scope.current.owner !== owner) return
      const found = new Map<string, string>(more ? history.map(item => [item.id, item.title]) : [])
      for (const e of result.entries) if (!found.has(e.conversation) || e.turn.role === 'user') found.set(e.conversation, e.turn.content.slice(0, 75))
      setHistory(Array.from(found, ([id, title]) => ({ id, title }))); setHistoryBefore(result.before ?? null)
    } catch { setNotice('Conversation list unavailable. Please retry.') }
  }
  const loadOlder = async () => {
    if (!older || !owner) return
    try {
      const result = await loadButlerHistory({ data: { conversation, before: older } })
      if (scope.current.owner !== owner || scope.current.conversation !== conversation) return
      const entries = result.entries.map(e => e.turn).reverse(); entries.forEach(t => saved.current.add(t.id))
      rawSetTurns(prev => [...entries.filter(t => !prev.some(p => p.id === t.id)), ...prev]); setOlder(result.before ?? null)
    } catch { setNotice('Older messages unavailable. Please retry.') }
  }
  const switchConversation = async (id?: string) => {
    await queue.current
    if (scope.current.owner !== owner) return
    if (turns.some(t => t.id && !saved.current.has(t.id)) && owner) { setNotice('Save the current conversation before switching.'); return }
    rawSetTurns([welcome]); setConversation(id ?? crypto.randomUUID())
  }
  return { turns, setTurns, owner, authReady, ready, notice, history, historyBefore, older, listHistory, loadOlder, switchConversation,
    retrySave: () => { if (!ready) setRetry(n => n + 1); else rawSetTurns(prev => [...prev]) } }
}
