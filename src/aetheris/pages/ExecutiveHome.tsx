import { useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, CircleDot, MessageSquareText, Newspaper, Plus, Target, Users } from 'lucide-react'

import { useNav } from '../nav'
import { useNetwork } from '../store'
import { useOps } from '../crm/store'
import { useOS } from '../os-store'
import { NewsImagesProvider, newsAge, useAetherisNews, useNewsImages, type NewsItem } from '../news'
import { NewsThumbnail } from './NewsThumbnail'
import { NewsReader } from './NewsReader'
import { Btn } from '../ui'
import { HubIntro, RadarMini, SignalPath, TileShell } from '../hub-ui'

const dueLabel = (value: string | null) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date'

export function ExecutiveHome() {
  const net = useNetwork()
  const ops = useOps()
  const os = useOS()
  const nav = useNav()
  const { data, isLoading } = useAetherisNews()
  const [article, setArticle] = useState<NewsItem | null>(null)
  const stories = data?.items.slice(0, 3) ?? []
  const images = useNewsImages(data?.items ?? [])
  const people = useMemo(() => [...net.members].sort((a, b) => b.scoreTotal - a.scoreTotal).slice(0, 4), [net.members])
  const tasks = ops.tasks.filter(task => task.status !== 'done' && task.status !== 'cancelled').slice(0, 4)
  const pipeline = ops.opportunities.filter(opportunity => !opportunity.archived && opportunity.status === 'open')
  const loops = os.inbox.filter(item => item.status === 'open').slice(0, 4)
  const firstName = net.profile.name.trim().split(/\s+/)[0] || 'there'
  const attention = tasks.length + net.threads.filter(thread => thread.unread).length + loops.length

  if (article) return <NewsImagesProvider value={images}><NewsReader item={article} onBack={() => setArticle(null)} /></NewsImagesProvider>

  return <NewsImagesProvider value={images}>
    <div className="core-hub home-hub">
      <HubIntro label="TODAY / EXECUTIVE BRIEF" title={<>Good morning, {firstName}.<br /><em>Here is what matters now.</em></>}
        copy="A concise reading of timing, relationships, commitments and movement across your private operating system."
        aside={<div className="hub-now"><strong>{attention}</strong><span>items may need<br />your attention</span></div>} />

      <section className="hub-bento home-bento">
        <TileShell label="WHAT MATTERS NOW" title={attention ? `${attention} live items, ordered by consequence.` : 'Nothing urgent. Use the quiet well.'} variant="hero"
          action={<Btn onClick={() => nav.postNeed()}><Plus size={14} /> Post a need</Btn>}>
          <div className="today-stack">
            {tasks.slice(0, 2).map(task => <button key={task.id} onClick={() => nav.setPage('work')}><Target size={15} /><span><b>{task.title}</b><small>Task · {dueLabel(task.dueAt)}</small></span><ArrowRight size={14} /></button>)}
            {loops.slice(0, 2).map(loop => <button key={loop.id} onClick={() => nav.setPage('loops')}><CircleDot size={15} /><span><b>{loop.title}</b><small>{loop.whyNow || 'Open relationship loop'}</small></span><ArrowRight size={14} /></button>)}
            {!tasks.length && !loops.length && <p>Your commitments are clear. Ask Intros what deserves proactive attention next.</p>}
          </div>
        </TileShell>

        <TileShell label="WHY NOW" title="Changing signals" variant="data" action={<button className="tile-link" onClick={() => nav.setPage('insights')}>Open signals</button>}>
          <SignalPath points={5} active={people.length ? 3 : 0} />
          <p>{people[0]?.whyNow || 'Signals appear when real member context changes.'}</p>
        </TileShell>

        <TileShell label="PEOPLE WHO MATTER" title={people.length ? people[0]?.name : 'Build your relationship radar'} variant="graph" action={<button className="tile-link" onClick={() => nav.setPage('network')}>Network</button>}>
          <RadarMini values={people.map(person => person.scoreTotal)} />
          <ul className="tile-people">{people.map(person => <li key={person.id}><button onClick={() => nav.openMember(person)}><span>{person.initials}</span><b>{person.name}</b><em>{person.scoreTotal}</em></button></li>)}</ul>
          {!people.length && <p>Verified people appear here as your network forms.</p>}
        </TileShell>

        <TileShell label="ACTIVE MEMORY" title="Open loops stay visible." variant="tall" action={<button className="tile-link" onClick={() => nav.setPage('memory')}>Memory</button>}>
          <div className="memory-lines">{loops.map(loop => <button key={loop.id} onClick={() => nav.setPage('loops')}><b>{loop.title}</b><small>{loop.whyThisMatters}</small></button>)}
            {!loops.length && <p>No open relationship loops. Captured commitments will appear here.</p>}</div>
        </TileShell>

        <TileShell label="WORK / PIPELINE" title={`${pipeline.length} active ${pipeline.length === 1 ? 'opportunity' : 'opportunities'}`} variant="wide" action={<button className="tile-link" onClick={() => nav.setPage('work')}>Open Work</button>}>
          <div className="pipeline-mini">{ops.stages.slice(0, 5).map(stage => <span key={stage.id}><i style={{ height: `${Math.max(12, pipeline.filter(item => item.stageId === stage.id).length * 24)}px` }} /><b>{stage.name}</b></span>)}</div>
          {!pipeline.length && <p>Your CRM, pipeline, Grid and calendar share one private record system.</p>}
        </TileShell>

        <TileShell label="MEETINGS + TASKS" title="Time makes intent real." variant="action">
          <CalendarDays size={32} />
          <p>{tasks.length ? `${tasks.length} open tasks are connected to your work.` : 'Add meetings and follow-ups to make timing part of every recommendation.'}</p>
          <button className="tile-cta" onClick={() => nav.setPage('calendar')}>Open calendar <ArrowRight size={14} /></button>
        </TileShell>

        <TileShell label="INTELLIGENCE / NEWS" title="Read the signal. Then call the right person." variant="wide" action={<button className="tile-link" onClick={() => nav.setPage('news')}>All news</button>}>
          <div className="home-news">{stories.map(story => <button key={story.id} onClick={() => setArticle(story)}><span><NewsThumbnail item={story} /></span><div><small>{story.source} · {newsAge(story.published)}</small><b>{story.title}</b></div></button>)}</div>
          {isLoading && <p>Composing today’s intelligence feed…</p>}
          {!isLoading && !stories.length && <p>News will appear here when the live feed is available.</p>}
        </TileShell>

        <TileShell label="ONE CLEAR MOVE" title="Ask Intros what to do next." variant="action">
          <MessageSquareText size={32} />
          <p>Use the assistant to navigate, change settings, research, draft, or act across your account.</p>
          <button className="tile-cta" onClick={() => window.dispatchEvent(new CustomEvent('aetheris:open-assistant'))}>Ask Intros <ArrowRight size={14} /></button>
        </TileShell>
      </section>
    </div>
  </NewsImagesProvider>
}