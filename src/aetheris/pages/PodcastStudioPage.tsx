import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Copy, Download, Mic2, Plus, RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useNetwork } from '../store'

type Episode = { id: string; title: string; angle: string; script: string; updated: string }
type Format = 'Solo insight' | 'Interview' | 'Case study'
const clean = (v: unknown) => typeof v === 'string' ? v.trim() : ''
const split = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()).slice(0, 10) : []
const unique = (items: string[]) => Array.from(new Set(items.map(s => s.trim()).filter(Boolean)))
const draftKey = (id: string) => `ask-intros-podcast-v1:${id}`
const makeScript = (title: string, angle: string, name: string, specialty: string, audience: string, format: Format, minutes: number) => {
  const intro = `Welcome to the show. I'm ${name}, and today we're talking about ${title.toLowerCase()}.`
  const purpose = `For ${audience}, the important question is: ${angle}.`
  const sections = format === 'Interview'
    ? ['Introduce your guest and explain why their perspective matters.', 'Ask: What challenge made this topic important in your work?', 'Ask: What do most people misunderstand about this?', 'Ask: Tell us about a real example, including what did not work.', 'Ask: What can listeners do this week?']
    : format === 'Case study'
    ? ['Describe the original situation without revealing confidential details.', 'Explain the constraint and what was at stake.', 'Walk through the decision process and tradeoffs.', 'Explain the result and what can actually be verified.', 'Share two lessons and one action listeners can take.']
    : ['What is changing and why it matters now.', 'Explain the most common misconception.', 'Share a personal observation from your work.', 'Walk through three practical steps.', 'Describe a mistake to avoid and a realistic next action.']
  return [
    `# ${title}`, `Format: ${format} | Target length: ${minutes} minutes`, '',
    '## Opening (0:00–0:45)', intro, purpose, '',
    '## Host introduction', `My work focuses on ${specialty}. Here's why this topic matters to me: [add a genuine first-hand example].`, '',
    '## Main conversation', ...sections.map((s, i) => `### Segment ${i + 1}\n${s}\n[Add your actual story, research, or guest answer. Do not invent quotes or results.]\n`),
    '## Closing', 'Recap the most useful takeaway in one sentence.', 'Invite listeners to share their experience or connect through Ask Intros. Do not promise an introduction without permission.',
    '', '## Producer notes', 'Verify factual claims, guest details and permissions before publishing.', `Audience: ${audience}. Maintain a clear, conversational tone. Adjust the pacing to reach approximately ${minutes} minutes.`,
  ].join('\n')
}
export function PodcastStudioPage() {
  const { profile } = useNetwork()
  const name = clean(profile.name) || 'Your host'
  const specialty = clean(profile.whatIDo) || clean(profile.title) || clean(profile.focus) || 'your professional experience'
  const audienceDefault = clean(profile.wantToMeet) || 'people interested in your field'
  const [audience, setAudience] = useState(audienceDefault)
  const [focus, setFocus] = useState(clean(profile.focus) || specialty)
  const [format, setFormat] = useState<Format>('Solo insight')
  const [minutes, setMinutes] = useState(10)
  const [selected, setSelected] = useState('')
  const [title, setTitle] = useState('')
  const [script, setScript] = useState('')
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [identity, setIdentity] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [variation, setVariation] = useState(0)

  useEffect(() => {
    let live = true
    void supabase.auth.getUser().then(({ data }) => {
      if (!live) return
      const id = data.user?.id ?? null
      setIdentity(id)
      if (!id) { setEpisodes([]); return }
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(draftKey(id)) || '[]')
        setEpisodes(Array.isArray(parsed) ? parsed.filter((x): x is Episode => !!x && typeof x.id === 'string' && typeof x.title === 'string' && typeof x.script === 'string').slice(0, 100) : [])
      } catch { setEpisodes([]) }
    })
    return () => { live = false }
  }, [])
  const subjects = useMemo(() => unique([
    ...split(profile.goals), ...split(profile.openTo), clean(profile.building), focus, specialty,
    ...split(profile.offers), ...split(profile.needs),
  ]).slice(0, 8), [profile, focus, specialty])
  const topics = useMemo(() => {
    const fallback = subjects.length ? subjects : [specialty]
    const patterns = [
      (s: string) => ({ title: `What people get wrong about ${s}`, angle: `Which misconception about ${s} should ${audience} reconsider?` }),
      (s: string) => ({ title: `A practical guide to ${s}`, angle: `How can ${audience} take the first useful step toward ${s}?` }),
      (s: string) => ({ title: `The decisions behind ${s}`, angle: `What tradeoffs do experienced practitioners face when working on ${s}?` }),
      (s: string) => ({ title: `Where ${s} goes next`, angle: `What signals should ${audience} watch in ${s}?` }),
    ]
    return Array.from({ length: 8 }, (_, i) => patterns[(i + variation) % patterns.length](fallback[(i + variation) % fallback.length]))
  }, [subjects, audience, specialty, variation])
  const [angle, setAngle] = useState('')
  const applyTopic = (topic: { title: string; angle: string }) => { setSelected(''); setTitle(topic.title); setAngle(topic.angle); setScript(''); setStatus('Topic selected. Create a draft when ready.') }
  const generate = () => {
    if (!title.trim()) { setStatus('Choose a topic or enter an episode title.'); return }
    setScript(makeScript(title.trim(), angle.trim() || 'What should listeners learn?', name, specialty, audience.trim() || audienceDefault, format, minutes))
    setStatus('Editable script outline created. Add real examples and verify claims before publishing.')
  }
  const save = () => {
    if (!identity) { setStatus('Sign in to save private podcast drafts.'); return }
    if (!title.trim() || !script.trim()) { setStatus('Create a script before saving.'); return }
    const id = selected || crypto.randomUUID()
    const next = [{ id, title: title.trim(), angle, script, updated: new Date().toISOString() }, ...episodes.filter(ep => ep.id !== id)].slice(0, 100)
    try { localStorage.setItem(draftKey(identity), JSON.stringify(next)); setEpisodes(next); setSelected(id); setStatus('Saved in this browser for your signed-in account. Not synced between devices.') }
    catch { setStatus('Could not save locally. Copy or export your script instead.') }
  }
  const remove = (id: string) => {
    if (!identity) return
    const next = episodes.filter(ep => ep.id !== id)
    try { localStorage.setItem(draftKey(identity), JSON.stringify(next)); setEpisodes(next); if (id === selected) setSelected(''); setStatus('Draft removed.') } catch { setStatus('Unable to remove draft.') }
  }
  const download = () => {
    if (!script) return
    const link = document.createElement('a')
    const url = URL.createObjectURL(new Blob([script], { type: 'text/markdown;charset=utf-8' }))
    link.href = url; link.download = `${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) || 'episode'}.md`; link.click()
    URL.revokeObjectURL(url)
  }
  const field = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-inherit outline-none focus:border-red-400'
  return <main className="mx-auto w-full max-w-6xl space-y-5 px-3 py-5 sm:px-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs uppercase tracking-widest opacity-60">Your creator workspace</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold"><Mic2 size={23} /> Podcast Studio</h1><p className="mt-1 max-w-2xl text-sm opacity-70">Develop episodes from your profile, expertise and goals. Your ideas stay editable and private.</p></div>
      <button className="rounded-lg border border-white/20 px-3 py-2 text-sm" onClick={() => { setSelected(''); setTitle(''); setAngle(''); setScript(''); setStatus('New episode ready.') }}><Plus size={14} className="mr-1 inline" /> New episode</button>
    </header>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-4">
        <section className="rounded-xl border border-white/15 bg-white/[0.035] p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} /> Personalized topic generator</h2>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs opacity-85">Audience<input className={field + ' mt-1'} value={audience} onChange={e => setAudience(e.target.value)} /></label><label className="text-xs opacity-85">Topic focus<input className={field + ' mt-1'} value={focus} onChange={e => setFocus(e.target.value)} /></label></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{topics.map((topic, i) => <button key={i} onClick={() => applyTopic(topic)} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-left hover:border-red-400 focus-visible:outline focus-visible:outline-2"><strong className="block text-sm">{topic.title}</strong><span className="mt-1 block text-xs leading-relaxed opacity-60">{topic.angle}</span></button>)}</div>
          <button className="mt-3 inline-flex items-center gap-1 text-xs opacity-75 hover:opacity-100" onClick={() => setVariation(v => v + 1)}><RefreshCw size={13} /> More ideas</button>
        </section>
        <section className="space-y-3 rounded-xl border border-white/15 bg-white/[0.035] p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><BookOpen size={15} /> Script creator</h2>
          <label className="block text-xs">Episode title<input className={field + ' mt-1'} value={title} onChange={e => setTitle(e.target.value)} placeholder="What should this episode explore?" /></label>
          <label className="block text-xs">Core question or angle<textarea className={field + ' mt-1 min-h-20'} value={angle} onChange={e => setAngle(e.target.value)} /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Format<select className={field + ' mt-1'} value={format} onChange={e => setFormat(e.target.value as Format)}><option>Solo insight</option><option>Interview</option><option>Case study</option></select></label><label className="text-xs">Length<select className={field + ' mt-1'} value={minutes} onChange={e => setMinutes(Number(e.target.value))}>{[5,10,15,20,30,45].map(n => <option key={n} value={n}>{n} minutes</option>)}</select></label></div>
          <button onClick={generate} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"><Sparkles size={15} className="mr-2 inline" /> Create script outline</button>
          <label className="block text-xs">Editable episode script<textarea className={field + ' mt-1 min-h-80 font-mono text-xs leading-relaxed'} value={script} onChange={e => setScript(e.target.value)} placeholder="Choose a topic, then create your script outline." /></label>
          <div className="flex flex-wrap gap-2"><button onClick={save} disabled={!script} className="rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-40"><Save size={13} className="mr-1 inline" /> Save draft</button><button onClick={() => void navigator.clipboard.writeText(script).then(() => setStatus('Copied to clipboard.')).catch(() => setStatus('Copy failed.'))} disabled={!script} className="rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-40"><Copy size={13} className="mr-1 inline" /> Copy</button><button onClick={download} disabled={!script} className="rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-40"><Download size={13} className="mr-1 inline" /> Export Markdown</button></div>
          <p role="status" aria-live="polite" className="text-xs opacity-70">{status || 'Topics and scripts are structured writing templates based on your profile, not AI-generated factual research.'}</p>
        </section>
      </div>
      <aside className="min-w-0 space-y-3"><section className="rounded-xl border border-white/15 bg-white/[0.035] p-4"><h2 className="mb-2 text-sm font-semibold">Based on your profile</h2><p className="text-sm font-medium">{name}</p><p className="mt-1 text-xs opacity-65">{specialty}</p><p className="mt-3 text-xs opacity-70">Change your expertise and goals in your member profile to personalize future topics.</p></section><section className="rounded-xl border border-white/15 bg-white/[0.035] p-4"><h2 className="mb-3 text-sm font-semibold">My drafts ({episodes.length})</h2>{!identity && <p className="text-xs opacity-70">Sign in to save drafts on this device.</p>}{identity && !episodes.length && <p className="text-xs opacity-65">No saved episodes yet.</p>}{episodes.map(ep => <div key={ep.id} className="flex items-start gap-2 border-t border-white/10 py-2"><button className="min-w-0 flex-1 text-left text-xs hover:underline" onClick={() => { setSelected(ep.id); setTitle(ep.title); setAngle(ep.angle); setScript(ep.script); setStatus('Draft loaded.') }}>{ep.title}</button><button aria-label={`Delete ${ep.title}`} onClick={() => remove(ep.id)} className="shrink-0 opacity-60 hover:opacity-100"><Trash2 size={14} /></button></div>)}</section></aside>
    </div>
  </main>
}
