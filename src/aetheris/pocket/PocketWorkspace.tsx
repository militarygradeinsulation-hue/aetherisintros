import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Download, Monitor, Tablet, Smartphone, Volume2 } from 'lucide-react'
import { readAloud, unlockAudio } from '../voice'

type Kind = 'portal' | 'briefing' | 'concept' | 'calculator' | 'opportunity'
interface Idea { id: string; kind: Kind; title: string; headline: string; body: string; points: string[]; price: number; units: number; updatedAt: string }

const kinds: Record<Kind, { label: string; headline: string; body: string; points: string[] }> = {
  portal: { label: 'Client portal', headline: 'Everything for your engagement, in one place.', body: 'Status, documents and next steps your client can check any time.', points: ['Project status', 'Shared documents', 'Next meeting'] },
  briefing: { label: 'Board briefing', headline: 'Where we are, and what we need from you.', body: 'A short update the board can read in three minutes.', points: ['Progress since last meeting', 'Key risks', 'Decisions requested'] },
  concept: { label: 'Product concept', headline: 'A sharper way to solve one real problem.', body: 'Who it is for, the problem, and why now.', points: ['Who it serves', 'The problem', 'Why now'] },
  calculator: { label: 'Value calculator', headline: 'What this is worth to you.', body: 'Change the numbers to see the value over a year.', points: ['Price per unit', 'Units per month', 'Annual value'] },
  opportunity: { label: 'Opportunity page', headline: 'Two people who should be talking.', body: 'The shared context, the timing and the ask.', points: ['Shared context', 'Why now', 'The ask'] },
}
const widths = { desktop: 1440, tablet: 768, mobile: 390 } as const

function useOwnerKey() {
  const [key, setKey] = useState('aetheris.pocket.demo')
  useEffect(() => {
    let alive = true
    void import('@/integrations/supabase/client').then(({ supabase }) => supabase.auth.getSession()).then(({ data }) => {
      if (alive && data.session) setKey(`aetheris.pocket.${data.session.user.id}`)
    })
    return () => { alive = false }
  }, [])
  return key
}

const make = (kind: Kind): Idea => ({ id: crypto.randomUUID(), kind, title: kinds[kind].label, headline: kinds[kind].headline, body: kinds[kind].body, points: [...kinds[kind].points], price: 500, units: 20, updatedAt: new Date().toISOString() })

function coach(idea: Idea): string {
  const tips: string[] = []
  if (idea.headline.split(' ').length > 12) tips.push('Your headline is long; aim for under twelve words.')
  if (idea.body.length < 40) tips.push('Add one sentence on who this is for and what changes for them.')
  if (idea.points.filter(Boolean).length < 3) tips.push('Give it at least three clear points.')
  if (idea.kind === 'calculator') tips.push(`At these numbers the annual value is ${(idea.price * idea.units * 12).toLocaleString()}. Check that both inputs come from real figures.`)
  if (!tips.length) tips.push('This reads clearly. Next step: share it with one person in your network who would use it, and ask what is missing.')
  return tips.join(' ')
}

export function PocketWorkspace() {
  const key = useOwnerKey()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [view, setView] = useState<keyof typeof widths>('desktop')

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) ?? '[]') as Idea[]; setIdeas(saved); setActiveId(saved[0]?.id ?? null) } catch { setIdeas([]) }
  }, [key])
  const save = (next: Idea[]) => { setIdeas(next); localStorage.setItem(key, JSON.stringify(next)) }
  const active = useMemo(() => ideas.find(i => i.id === activeId) ?? null, [ideas, activeId])
  const patch = (p: Partial<Idea>) => active && save(ideas.map(i => i.id === active.id ? { ...i, ...p, updatedAt: new Date().toISOString() } : i))
  const add = (kind: Kind) => { const idea = make(kind); save([idea, ...ideas]); setActiveId(idea.id) }
  const remove = (id: string) => { const next = ideas.filter(i => i.id !== id); save(next); setActiveId(next[0]?.id ?? null) }
  const exportIdea = () => {
    if (!active) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `${active.title.replace(/\W+/g, '-').toLowerCase()}.json`; a.click(); URL.revokeObjectURL(url)
  }

  return <section className="pk">
    <header className="pk-head">
      <span className="eyebrow">YOUR POCKET · PRIVATE TO YOU</span>
      <h1>Build an idea <em>before you pitch it.</em></h1>
      <p>Start from a shape, edit it in place, and see it on desktop, tablet and phone. Saved on this device under your account.</p>
      <div className="pk-starters">{(Object.keys(kinds) as Kind[]).map(k => <button key={k} className="btn secondary" onClick={() => add(k)}><Plus size={13} />{kinds[k].label}</button>)}</div>
    </header>

    {!ideas.length ? <p className="dx-empty">Your pocket is empty. Pick a starting shape above.</p> : <div className="pk-grid">
      <aside className="pk-list">{ideas.map(i => <button key={i.id} className={i.id === activeId ? 'active' : ''} onClick={() => setActiveId(i.id)}>
        <span className="eyebrow">{kinds[i.kind].label.toUpperCase()}</span><strong>{i.title}</strong></button>)}</aside>
      {active && <>
        <div className="pk-edit">
          <label>Name<input value={active.title} onChange={e => patch({ title: e.target.value })} /></label>
          <label>Headline<input value={active.headline} onChange={e => patch({ headline: e.target.value })} /></label>
          <label>Description<textarea rows={3} value={active.body} onChange={e => patch({ body: e.target.value })} /></label>
          {active.points.map((p, n) => <label key={n}>Point {n + 1}<input value={p} onChange={e => patch({ points: active.points.map((x, m) => m === n ? e.target.value : x) })} /></label>)}
          {active.kind === 'calculator' && <div className="pk-nums">
            <label>Price per unit<input type="number" value={active.price} onChange={e => patch({ price: Number(e.target.value) || 0 })} /></label>
            <label>Units per month<input type="number" value={active.units} onChange={e => patch({ units: Number(e.target.value) || 0 })} /></label>
          </div>}
          <div className="pk-actions">
            <button className="btn primary" onClick={() => { unlockAudio(); readAloud([coach(active)], 'Pocket review') }}><Volume2 size={14} />Review my idea</button>
            <button className="btn" onClick={exportIdea}><Download size={14} />Export</button>
            <button className="btn quiet" onClick={() => remove(active.id)}><Trash2 size={14} />Delete</button>
          </div>
          <p className="pk-coach">{coach(active)}</p>
        </div>
        <div className="pk-preview">
          <div className="pk-views" role="group" aria-label="Preview size">
            {([['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]] as const).map(([v, Icon]) => <button key={v} aria-label={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}><Icon size={14} />{widths[v]}</button>)}
          </div>
          <div className="pk-frame" style={{ maxWidth: view === 'desktop' ? '100%' : widths[view] / 2 + 'px' }}>
            <span className="eyebrow">{kinds[active.kind].label.toUpperCase()}</span>
            <h2>{active.headline}</h2>
            <p>{active.body}</p>
            <ul className={view === 'mobile' ? 'stack' : ''}>{active.points.map((p, n) => <li key={n}><span>0{n + 1}</span>{active.kind === 'calculator' && n === 2 ? `${p}: ${(active.price * active.units * 12).toLocaleString()}` : p}</li>)}</ul>
          </div>
        </div>
      </>}
    </div>}
  </section>
}
