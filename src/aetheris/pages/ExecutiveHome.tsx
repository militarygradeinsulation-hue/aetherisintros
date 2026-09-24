import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, CalendarDays, Check, CircleDot, EyeOff, LayoutDashboard, MessageSquareText, Plus, RotateCcw, Target } from 'lucide-react'

import { useNav } from '../nav'
import { defaultHomeLayout, useNetwork, type HomeWidgetConfig, type HomeWidgetId, type HomeWidgetSize } from '../store'
import { useOps } from '../crm/store'
import { useOS } from '../os-store'
import { NewsImagesProvider, newsAge, useAetherisNews, useNewsImages, type NewsItem } from '../news'
import { NewsThumbnail } from './NewsThumbnail'
import { NewsReader } from './NewsReader'
import { Btn } from '../ui'
import { ActiveMissionTile, OpportunityGraphTile } from '../opportunity-ui'
import { ApprovalsTile, ChiefOfStaffTile, CompanyPulseTile, WhatChangedTile } from '../ceo-ui'
import { DigitalOffice, HelpTile, MissingTile, StrategicTile } from '../ceo-insights-ui'
import { LeverageTile, RiskTile } from '../ceo-leverage-ui'
import { HubIntro, RadarMini, SignalPath, TileShell } from '../hub-ui'

const dueLabel = (value: string | null) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date'

const widgetNames: Record<HomeWidgetId, string> = {
  missing: 'What am I missing?', help: 'Who can I help?', strategic: 'Strategic relationships',
  changed: 'What changed', pulse: 'Company pulse', chief: 'Chief of Staff', approvals: 'Approvals',
  risk: 'Risk Radar', leverage: 'Leverage',
  mission: 'Active mission', graph: 'Opportunity Graph',
  matters: 'What matters now', signals: 'Changing signals', people: 'People who matter', memory: 'Active Memory',
  pipeline: 'Work and pipeline', calendar: 'Meetings and tasks', news: 'Intelligence and news', assistant: 'Ask Intros',
}

function HomeWidgetFrame({ config, editing, index, count, children, onMove, onHide, onSize }: {
  config: HomeWidgetConfig; editing: boolean; index: number; count: number; children: ReactNode
  onMove: (direction: -1 | 1) => void; onHide: () => void; onSize: (size: HomeWidgetSize) => void
}) {
  return <div className={`home-widget home-widget-${config.size} ${editing ? 'is-editing' : ''}`}>
    {editing && <div className="home-widget-controls" aria-label={`Customize ${widgetNames[config.id]}`}>
      <span className="home-widget-handle"><LayoutDashboard size={14} />{widgetNames[config.id]}</span>
      <div className="home-widget-sizes" aria-label="Widget size">
        {(['compact', 'standard', 'wide'] as const).map(size => <button type="button" key={size} className={config.size === size ? 'active' : ''} onClick={() => onSize(size)} aria-label={`${size} size`} title={`${size} size`}>{size[0]?.toUpperCase()}</button>)}
      </div>
      <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move widget up" title="Move up"><ArrowUp size={14} /></button>
      <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move widget down" title="Move down"><ArrowDown size={14} /></button>
      <button type="button" onClick={onHide} aria-label="Hide widget" title="Hide widget"><EyeOff size={14} /></button>
    </div>}
    {children}
  </div>
}

export function ExecutiveHome() {
  const net = useNetwork()
  const ops = useOps()
  const os = useOS()
  const nav = useNav()
  const { data, isLoading } = useAetherisNews()
  const [article, setArticle] = useState<NewsItem | null>(null)
  const [customizing, setCustomizing] = useState(false)
  const stories = data?.items.slice(0, 3) ?? []
  const images = useNewsImages(data?.items ?? [])
  const people = useMemo(() => [...net.members].sort((a, b) => b.scoreTotal - a.scoreTotal).slice(0, 4), [net.members])
  const tasks = ops.tasks.filter(task => task.status !== 'done' && task.status !== 'cancelled').slice(0, 4)
  const pipeline = ops.opportunities.filter(opportunity => !opportunity.archived && opportunity.status === 'open')
  const loops = os.inbox.filter(item => item.status === 'open').slice(0, 3)
  const firstName = net.profile.name.trim().split(/\s+/)[0] || 'there'
  const attention = tasks.length + net.threads.filter(thread => thread.unread).length + loops.length
  const visibleWidgets = net.homeLayout.filter(widget => widget.visible)
  const hiddenWidgets = net.homeLayout.filter(widget => !widget.visible)

  const updateWidget = (id: HomeWidgetId, change: Partial<HomeWidgetConfig>) => {
    net.setHomeLayout(net.homeLayout.map(widget => widget.id === id ? { ...widget, ...change } : widget))
  }
  const moveWidget = (id: HomeWidgetId, direction: -1 | 1) => {
    const layout = [...net.homeLayout]
    const from = layout.findIndex(widget => widget.id === id)
    if (from < 0) return
    const visible = layout.filter(widget => widget.visible)
    const visibleIndex = visible.findIndex(widget => widget.id === id)
    const neighbor = visible[visibleIndex + direction]
    if (!neighbor) return
    const to = layout.findIndex(widget => widget.id === neighbor.id)
    ;[layout[from], layout[to]] = [layout[to] as HomeWidgetConfig, layout[from] as HomeWidgetConfig]
    net.setHomeLayout(layout)
  }

  const renderWidget = (id: HomeWidgetId) => {
    switch (id) {
      case 'missing': return <MissingTile />
      case 'help': return <HelpTile />
      case 'strategic': return <StrategicTile />
      case 'changed': return <WhatChangedTile />
      case 'pulse': return <CompanyPulseTile />
      case 'chief': return <ChiefOfStaffTile />
      case 'approvals': return <ApprovalsTile />
      case 'risk': return <RiskTile />
      case 'leverage': return <LeverageTile />
      case 'mission': return <ActiveMissionTile />
      case 'graph': return <OpportunityGraphTile />
      case 'matters': return <TileShell label="WHAT MATTERS NOW" title={attention ? `${attention} live items, ordered by consequence.` : 'Nothing urgent. Use the quiet well.'} variant="hero"
        action={<Btn onClick={() => nav.postNeed()}><Plus size={14} /> Post a need</Btn>}>
        <div className="today-stack">
          {tasks.slice(0, 2).map(task => <button key={task.id} onClick={() => nav.setPage('work')}><Target size={15} /><span><b>{task.title}</b><small>Task · {dueLabel(task.dueAt)}</small></span><ArrowRight size={14} /></button>)}
          {loops.slice(0, 2).map(loop => <button key={loop.id} onClick={() => nav.setPage('loops')}><CircleDot size={15} /><span><b>{loop.title}</b><small>{loop.whyNow || 'Open relationship loop'}</small></span><ArrowRight size={14} /></button>)}
          {!tasks.length && !loops.length && <p>Your commitments are clear. Ask Intros what deserves proactive attention next.</p>}
        </div>
      </TileShell>
      case 'signals': return <TileShell label="WHY NOW" title="Changing signals" variant="data" action={<button className="tile-link" onClick={() => nav.setPage('insights')}>Open signals</button>}>
        <SignalPath points={5} active={people.length ? 3 : 0} /><p>{people[0]?.whyNow || 'Signals appear when real member context changes.'}</p>
      </TileShell>
      case 'people': return <TileShell label="PEOPLE WHO MATTER" title={people.length ? people[0]?.name : 'Build your relationship radar'} variant="graph" action={<button className="tile-link" onClick={() => nav.setPage('network')}>Network</button>}>
        <RadarMini values={people.map(person => person.scoreTotal)} />
        <ul className="tile-people">{people.map(person => <li key={person.id}><button onClick={() => nav.openMember(person)}><span>{person.initials}</span><b>{person.name}</b><em>{person.scoreTotal}</em></button></li>)}</ul>
        {!people.length && <p>Verified people appear here as your network forms.</p>}
      </TileShell>
      case 'memory': return <TileShell label="ACTIVE MEMORY" title="Open loops stay visible." variant="tall" action={<button className="tile-link" onClick={() => nav.setPage('memory')}>Memory</button>}>
        <div className="memory-lines">{loops.map(loop => <button key={loop.id} onClick={() => nav.setPage('loops')}><b>{loop.title}</b><small>{loop.whyThisMatters}</small></button>)}
          {!loops.length && <p>No open relationship loops. Captured commitments will appear here.</p>}</div>
      </TileShell>
      case 'pipeline': return <TileShell label="WORK / PIPELINE" title={`${pipeline.length} active ${pipeline.length === 1 ? 'opportunity' : 'opportunities'}`} variant="wide" action={<button className="tile-link" onClick={() => nav.setPage('work')}>Open Work</button>}>
        <div className="pipeline-mini">{ops.stages.slice(0, 5).map(stage => <span key={stage.id}><i style={{ height: `${Math.max(12, pipeline.filter(item => item.stageId === stage.id).length * 24)}px` }} /><b>{stage.name}</b></span>)}</div>
        {!pipeline.length && <p>Your CRM, pipeline, Grid and calendar share one private record system.</p>}
      </TileShell>
      case 'calendar': return <TileShell label="MEETINGS + TASKS" title="Time makes intent real." variant="action">
        <CalendarDays size={32} /><p>{tasks.length ? `${tasks.length} open tasks are connected to your work.` : 'Add meetings and follow-ups to make timing part of every recommendation.'}</p>
        <button className="tile-cta" onClick={() => nav.setPage('calendar')}>Open calendar <ArrowRight size={14} /></button>
      </TileShell>
      case 'news': return <TileShell label="INTELLIGENCE / NEWS" title="Read the signal. Then call the right person." variant="wide" action={<button className="tile-link" onClick={() => nav.setPage('news')}>All news</button>}>
        <div className="home-news">{stories.map(story => <button key={story.id} onClick={() => setArticle(story)}><span><NewsThumbnail item={story} /></span><div><small>{story.source} · {newsAge(story.published)}</small><b>{story.title}</b></div></button>)}</div>
        {isLoading && <p>Composing today’s intelligence feed…</p>}{!isLoading && !stories.length && <p>News will appear here when the live feed is available.</p>}
      </TileShell>
      case 'assistant': return <TileShell label="ONE CLEAR MOVE" title="Ask Intros what to do next." variant="action">
        <MessageSquareText size={32} /><p>Use the assistant to navigate, change settings, research, draft, or act across your account.</p>
        <button className="tile-cta" onClick={() => window.dispatchEvent(new CustomEvent('aetheris:open-assistant'))}>Ask Intros <ArrowRight size={14} /></button>
      </TileShell>
    }
  }

  if (article) return <NewsImagesProvider value={images}><NewsReader item={article} onBack={() => setArticle(null)} /></NewsImagesProvider>

  return <NewsImagesProvider value={images}>
    <div className="core-hub home-hub">
      <HubIntro label="CEO NOW / TODAY" title={<>Good morning, {firstName}.<br /><em>Here is what matters now.</em></>}
        copy="A concise reading of timing, relationships, commitments and movement across your private operating system."
        aside={<div className="home-intro-aside"><div className="hub-now"><strong>{attention}</strong><span>items may need<br />your attention</span></div><Btn kind={customizing ? 'primary' : 'secondary'} onClick={() => setCustomizing(value => !value)}>{customizing ? <Check size={14} /> : <LayoutDashboard size={14} />}{customizing ? 'Done' : 'Customize Home'}</Btn></div>} />

      <DigitalOffice />

      {customizing && <section className="home-customizer" aria-label="Home customization">
        <div><span>YOUR HOME</span><h2>Arrange the view around your priorities.</h2><p>Move, resize, or hide any widget. Changes save automatically.</p></div>
        <Btn kind="quiet" onClick={() => net.setHomeLayout(defaultHomeLayout.map(widget => ({ ...widget })))}><RotateCcw size={14} /> Reset layout</Btn>
        {hiddenWidgets.length > 0 && <div className="home-hidden-widgets"><b>Add widgets</b>{hiddenWidgets.map(widget => <button type="button" key={widget.id} onClick={() => updateWidget(widget.id, { visible: true })}><Plus size={13} />{widgetNames[widget.id]}</button>)}</div>}
      </section>}

      <section className="hub-bento home-bento">
        {visibleWidgets.map((config, index) => <HomeWidgetFrame key={config.id} config={config} editing={customizing} index={index} count={visibleWidgets.length}
          onMove={direction => moveWidget(config.id, direction)} onHide={() => updateWidget(config.id, { visible: false })} onSize={size => updateWidget(config.id, { size })}>
          {renderWidget(config.id)}
        </HomeWidgetFrame>)}
      </section>
    </div>
  </NewsImagesProvider>
}