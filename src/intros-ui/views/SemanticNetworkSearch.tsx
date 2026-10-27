import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Search, Sparkles, X } from 'lucide-react'
import { semanticSearchMembers, type SemanticSearchResult } from '@/lib/semanticSearch.functions'

const prompts = [
  'Founders in B2B building partnerships',
  'Advisors with enterprise go to market experience',
  'Investors interested in developer tools',
]

export function SemanticNetworkSearch({
  live, onResults,
}: {
  live: boolean
  onResults: (result: SemanticSearchResult | null) => void
}) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(0)
  useEffect(() => () => { requestId.current += 1 }, [])

  const search = async (text: string) => {
    const value = text.trim()
    if (!live || value.length < 5 || loading) return
    const current = ++requestId.current
    setQuery(value)
    setLoading(true)
    setError('')
    onResults(null)
    try {
      const result = await semanticSearchMembers({ data: { query: value } })
      if (current === requestId.current) onResults(result)
    } catch (cause) {
      if (current === requestId.current) setError(cause instanceof Error ? cause.message : 'Semantic search is temporarily unavailable.')
    } finally {
      if (current === requestId.current) setLoading(false)
    }
  }
  const clear = () => {
    requestId.current += 1
    setQuery('')
    setLoading(false)
    setError('')
    onResults(null)
  }

  return <section className="rounded-2xl border border-white/15 bg-[#12151c] p-4 sm:p-5 shadow-[0_15px_45px_rgba(0,0,0,.28)] text-[#f3f4f6]" aria-label="AI semantic network search">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2"><Sparkles size={18} className="text-amber-400" aria-hidden="true"/>
        <h2 className="font-['Space_Grotesk'] text-base font-semibold tracking-tight">Intelligence Search</h2>
        <span className="rounded-full border border-amber-500/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-amber-300">AI</span>
      </div>
      {query && <button type="button" onClick={clear} aria-label="Clear semantic search" className="flex items-center gap-1 text-xs text-slate-300 hover:text-white"><X size={14}/> Clear</button>}
    </div>
    <p className="mt-1 text-xs text-slate-300">Describe who you want to meet and why. Matches use only member-visible profile information.</p>
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); void search(query) }} className="mt-3 flex flex-col sm:flex-row gap-2">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/20 bg-[#07090e] px-3 py-2.5 focus-within:border-amber-400">
        <Search size={17} className="shrink-0 text-amber-300" aria-hidden="true"/>
        <span className="sr-only">Describe the members to find</span>
        <input value={query} onChange={e => { setQuery(e.target.value); if (error) setError('') }} maxLength={300} disabled={!live || loading}
          aria-label="AI network search" placeholder="Find CEOs looking for distribution partnerships…"
          className="min-w-0 w-full bg-transparent text-base sm:text-sm text-white placeholder:text-slate-400 outline-none"/>
      </label>
      <button type="submit" disabled={!live || loading || query.trim().length < 5}
        className="min-h-10 rounded-xl bg-[#b42328] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#d12a31]">
        {loading ? 'Butler is thinking…' : 'Find matches'}
      </button>
    </form>
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Suggested network searches">
      {prompts.map(prompt => <button key={prompt} type="button" disabled={!live || loading} onClick={() => void search(prompt)}
        className="rounded-full border border-white/15 bg-white/[.05] px-3 py-1.5 text-left text-[11px] text-slate-200 hover:border-amber-400/60 disabled:opacity-50">{prompt}</button>)}
    </div>
    {loading && <p role="status" className="mt-3 flex items-center gap-2 text-xs text-amber-200"><Sparkles size={13} className="animate-pulse"/> Butler is reviewing approved profiles, not generating contacts.</p>}
    {!live && <p role="status" className="mt-3 text-xs text-slate-300">Sign in as an approved member to search the live network. Showcase profiles are excluded.</p>}
    {error && <p role="alert" className="mt-3 rounded-lg border border-red-400/50 bg-red-950/40 p-3 text-xs text-red-100">{error} You can still use standard directory search.</p>}
  </section>
}
