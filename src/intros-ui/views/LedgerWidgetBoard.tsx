import { useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { ArrowRight, BookOpen, CheckSquare, GripVertical, Lock, Mail, Radar, RotateCcw, Target, Unlock, Users } from 'lucide-react';
import { DraggableWidgetGrid, type WidgetItem, type WidgetSize } from '@/components/ui/widget-board';
import { useOps } from '@/aetheris/crm/store';
import type { NetworkMember } from '@/intros-ui/networkData';
import type { ActivePage } from '@/intros-ui/components/layout/TopNavigation';
import { DASHBOARD_BOARD_KEY, normalizeDashboardBoard, type DashboardBoardLayout } from './dashboard-board-layout';
import './ledger-widget-board.css';
import { MemberCardStack } from './MemberCardStack';
import './relationship-bento.css';

export function LedgerWidgetBoard({ members, unreadCount, live, onNavigate, onOpenTool, onOpenPipeline }: {
  members: NetworkMember[]; unreadCount: number | null; live: boolean;
  onNavigate: (page: ActivePage, memberId?: string) => void;
  onOpenTool?: ((tool: string) => void) | undefined;
  onOpenPipeline?: (() => void) | undefined;
}) {
  const ops = useOps();
  const [layout, setLayout] = useState<DashboardBoardLayout>(() => normalizeDashboardBoard(null));
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_BOARD_KEY);
      // Reuse recognized IDs from the former board without modifying its preferences.
      const former = localStorage.getItem('intros.home.board.v2');
      setLayout(normalizeDashboardBoard(JSON.parse(saved || former || 'null')));
    } catch { /* Defaults remain usable when storage is unavailable. */ }
  }, []);
  const save = (next: DashboardBoardLayout) => {
    const normalized = normalizeDashboardBoard(next);
    setLayout(normalized);
    try { localStorage.setItem(DASHBOARD_BOARD_KEY, JSON.stringify(normalized)); } catch { /* Device preferences are optional. */ }
  };
  const openTool = (id: string) => onOpenTool ? onOpenTool(id) : onNavigate('workspace');
  const available = ops.ready && ops.signedIn;
  const pending = !ops.ready ? 'Loading CRM records…' : 'Sign in to view your private CRM records.';
  const people = ops.people.filter(person => !person.archived);
  const opportunities = ops.opportunities.filter(item => !item.archived && item.status === 'open');
  const tasks = ops.tasks.filter(task => task.status !== 'done' && task.status !== 'cancelled');
  const overdue = tasks.filter(task => task.dueAt && new Date(task.dueAt).getTime() < Date.now());
  const stageCounts = new Map<string, number>();
  for (const item of opportunities) {
    const stage = ops.stages.find(stage => stage.id === item.stageId)?.name || item.stageName || 'Unassigned';
    stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
  }
  const stages = [...stageCounts].sort((a, b) => b[1] - a[1]);
  const count = (value: number) => available ? String(value) : '—';
  const metric = (value: string, caption: string) => <div className="ledger-widget-metric"><strong>{value}</strong><span>{caption}</span></div>;
  const views: Record<string, { icon: typeof Users; content: ReactNode; action: string; run: () => void }> = {
    pipeline: { icon: Target, action: 'Open CRM & Pipeline', run: () => onOpenPipeline ? onOpenPipeline() : openTool('crm'), content: <>
      {metric(count(opportunities.length), 'open opportunities')}
      {available && opportunities.length > 0 && <div className="ledger-pipeline-allocation" role="img" aria-label={stages.map(([name, n]) => `${name}: ${n}`).join(', ')}>{stages.map(([name, n], index) => <span key={name} style={{ flexGrow: n, '--stage-opacity': Math.max(.25, 1 - index * .13) } as CSSProperties} title={`${name}: ${n}`} />)}</div>}
      {available ? stages.length ? <div className="ledger-widget-bars" aria-label="Open opportunities by stage">{stages.slice(0, 4).map(([name, n]) => <div key={name}><span>{name}</span><i aria-hidden="true"><b style={{ width: `${n / Math.max(opportunities.length, 1) * 100}%` }}/></i><strong>{n}</strong></div>)}</div> : <p>No open opportunities in your loaded CRM records.</p> : <p>{pending}</p>}
    </> },
    network: { icon: Users, action: 'Explore network', run: () => onNavigate('people'), content: <MemberCardStack members={members} live={live} onOpen={id => onNavigate('people', id)}/> },
    conversations: { icon: Mail, action: 'Open messages', run: () => onNavigate('messages'), content: <>{metric(unreadCount === null ? '—' : String(unreadCount), 'unread messages')}<p>{unreadCount === null ? 'Inbox counts are unavailable. Open Messages to check.' : live ? 'From your live inbox.' : 'Showcase conversations.'}</p></> },
    crm: { icon: Users, action: 'Open CRM', run: () => openTool('crm'), content: <>{metric(count(people.length), 'CRM contacts loaded')}<p>{available ? `${ops.companies.filter(c => !c.archived).length} companies · ${people.filter(p => p.memberId).length} linked network members` : pending}</p></> },
    tasks: { icon: CheckSquare, action: 'Review CRM', run: () => openTool('crm'), content: <>{metric(count(tasks.length), 'open CRM tasks')}<p>{available ? `${overdue.length} overdue in your loaded records` : pending}</p>{available && <ul>{tasks.slice(0, 2).map(task => <li key={task.id}>{task.title}</li>)}</ul>}</> },
    updates: { icon: CheckSquare, action: 'View CRM activity', run: () => openTool('crm'), content: <>{available ? ops.events.length ? <ol className="ledger-widget-events">{ops.events.slice(0, 4).map(event => <li key={event.id}><span>{event.summary}</span><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleDateString()}</time></li>)}</ol> : <><strong className="ledger-widget-message">Your next move starts here.</strong><p>CRM changes will appear here when you add or update a record.</p></> : <><strong className="ledger-widget-message">Your account, at a glance.</strong><p>{pending}</p></>}</> },
    saved: { icon: BookOpen, action: 'Open private library', run: () => openTool('pocket'), content: <><strong className="ledger-widget-message">Keep the useful things.</strong><p>Return to saved evidence, contacts, and documents in your private library.</p></> },
    specter: { icon: Radar, action: 'Open Specter Detect', run: () => onNavigate('specter'), content: <><strong className="ledger-widget-message">Research your next opportunity.</strong><p>Capture website evidence and review it before your next conversation.</p></> },
  };
  const render = (item: WidgetItem) => {
    const view = views[item.id];
    if (!view) return null;
    const Icon = view.icon;
    return <article className="ledger-widget-card">
      <header><Icon size={16} aria-hidden="true"/><h3>{item.label}</h3>{!layout.locked && <><GripVertical size={15} aria-hidden="true"/><label data-no-drag><span className="sr-only">Size of {item.label}</span><select aria-label={`Size of ${item.label}`} value={item.size} onChange={event => save({ ...layout, items: layout.items.map(current => current.id === item.id ? { ...current, size: event.target.value as WidgetSize } : current) })}><option value="sm">Small</option><option value="wide">Wide</option><option value="tall">Tall</option><option value="lg">Large</option></select></label></>}</header>
      <div className="ledger-widget-body">{view.content}</div>
      <button type="button" className="ledger-widget-action" onClick={view.run}>{view.action}<ArrowRight size={14} aria-hidden="true"/></button>
    </article>;
  };
  return <section className="ledger-widget-board" aria-label="Your customizable dashboard board">
    <header className="ledger-widget-toolbar"><div><h2>Your board</h2><p>{layout.locked ? 'Your layout is locked. Edit it to move and resize cards.' : 'Drag cards to rearrange. On touch, press and hold. Keyboard: Alt + arrow keys.'} Preferences stay on this device.</p></div><div>
      <button type="button" aria-pressed={!layout.locked} onClick={() => save({ ...layout, locked: !layout.locked })}>{layout.locked ? <Unlock size={15}/> : <Lock size={15}/>} {layout.locked ? 'Edit layout' : 'Lock layout'}</button>
      <button type="button" onClick={() => save(normalizeDashboardBoard(null))}><RotateCcw size={15}/> Reset board</button>
    </div></header>
    <DraggableWidgetGrid items={layout.items} editable={!layout.locked} hoverLift={false} onChange={items => save({ ...layout, items })} renderItem={render} maxColumns={4} cellSize={260} rowHeight={240} gap={14} radius={24}/>
  </section>;
}
