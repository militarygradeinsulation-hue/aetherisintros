import { useEffect, useState, type ReactNode } from 'react';
// Actual feed rail layout: the unimported CSS left the old square widgets in place.
import '../../home-feed-layout.css';
import { ArrowLeftRight, Eye, EyeOff, GripVertical, LayoutGrid, RotateCcw, Settings2, X } from 'lucide-react';
import { DraggableWidgetGrid, type WidgetItem } from '@/components/ui/widget-board';

type Side = 'left' | 'right';
type GroupKey = 'network' | 'focus' | 'intros' | 'activity' | 'community' | 'assistant';
interface GroupLayout { id: GroupKey; side: Side; hidden: boolean; active: string }
type ToolGroup = { id: GroupKey; name: string; choices: readonly { id: string; name: string }[]; side: Side; hidden: boolean };

const GROUPS: readonly ToolGroup[] = [
  { id: 'network', name: 'People & Network', side: 'left', hidden: false, choices: [
    { id: 'network', name: 'Your network' }, { id: 'people', name: 'People to know' },
    { id: 'explore', name: 'Explore' }, { id: 'sectors', name: 'Interests' },
  ] },
  { id: 'focus', name: 'Goals & Priorities', side: 'left', hidden: false, choices: [
    { id: 'need', name: 'Your ask' }, { id: 'offers', name: 'Shared goals' },
    { id: 'profile', name: 'Your profile' },
  ] },
  { id: 'intros', name: 'Introductions', side: 'right', hidden: false, choices: [
    { id: 'introduce', name: 'Warm introductions' }, { id: 'whynow', name: 'Why now' },
  ] },
  { id: 'activity', name: 'Activity & Messages', side: 'right', hidden: false, choices: [
    { id: 'conversations', name: 'Messages' }, { id: 'saved', name: 'Saved posts' },
    { id: 'updates', name: 'Network updates' },
  ] },
  { id: 'community', name: 'Events & Circles', side: 'right', hidden: true, choices: [
    { id: 'events', name: 'Business events' }, { id: 'circles', name: 'Peer circles' },
  ] },
  { id: 'assistant', name: 'Ask Intros Butler', side: 'left', hidden: true, choices: [
    { id: 'ask', name: 'Ask Intros' },
  ] },
];
const STORAGE_KEY = 'intros.home.feed.layout.v3';
const defaults = (): GroupLayout[] => GROUPS.map(group => ({
  id: group.id, side: group.side, hidden: group.hidden, active: group.choices[0]?.id ?? '',
}));

function restoreLayout(): GroupLayout[] {
  const fallback = defaults();
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(raw)) {
      const found = new Set<string>();
      const items: GroupLayout[] = [];
      for (const record of raw) {
        if (!record || typeof record !== 'object') continue;
        const next = record as Partial<GroupLayout>;
        const group = GROUPS.find(group => group.id === next.id);
        if (!group || found.has(group.id)) continue;
        found.add(group.id);
        items.push({
          id: group.id,
          side: next.side === 'left' || next.side === 'right' ? next.side : group.side,
          hidden: typeof next.hidden === 'boolean' ? next.hidden : group.hidden,
          active: group.choices.some(choice => choice.id === next.active) ? next.active! : group.choices[0]?.id ?? '',
        });
      }
      return [...items, ...fallback.filter(group => !found.has(group.id))];
    }
    // Migration: the old 15-tile board had no hide control. Preserve the
    // earliest chosen tile and relative group order without overwriting v2.
    const former: unknown = JSON.parse(localStorage.getItem('intros.home.board.v2') || 'null');
    if (Array.isArray(former)) {
      const prior = former.filter(x => x && typeof x === 'object' && typeof x.id === 'string')
        .map(x => x.id as string);
      return fallback.map(item => {
        const group = GROUPS.find(group => group.id === item.id)!;
        return { ...item, active: group.choices.find(choice => prior.includes(choice.id))?.id || item.active };
      }).sort((a, b) => {
        const earliest = (id: GroupKey) => {
          const group = GROUPS.find(group => group.id === id)!;
          const positions = group.choices.map(choice => prior.indexOf(choice.id)).filter(i => i >= 0);
          return positions.length ? Math.min(...positions) : 999;
        };
        return earliest(a.id) - earliest(b.id);
      });
    }
  } catch { /* The feed is usable without local storage. */ }
  return fallback;
}

interface FeedSidebarLayoutProps {
  widgets: Record<string, ReactNode>;
  actionQueue?: ReactNode;
  children: ReactNode;
}

export function FeedSidebarLayout({ widgets, actionQueue, children }: FeedSidebarLayoutProps) {
  const [layout, setLayout] = useState<GroupLayout[]>(defaults);
  const [customize, setCustomize] = useState(false);
  const [focus, setFocus] = useState(true);
  const [desktop, setDesktop] = useState(false);
  const [railHeight, setRailHeight] = useState(944);

  useEffect(() => {
    setLayout(restoreLayout());
    try { setFocus(localStorage.getItem(STORAGE_KEY + '.focus') !== 'false'); } catch { /* browser storage unavailable */ }
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1100px)');
    const update = () => {
      setDesktop(query.matches);
      // Keep the measurements aligned with CSS's full-height side widgets.
      setRailHeight(Math.max(944, Math.min(1600, window.innerHeight)));
    };
    update();
    query.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const save = (next: GroupLayout[]) => {
    setLayout(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* continue without persistence */ }
  };
  const patch = (id: GroupKey, changes: Partial<GroupLayout>) => save(layout.map(item => item.id === id ? { ...item, ...changes } : item));
  const focusToggle = () => {
    setFocus(!focus);
    try { localStorage.setItem(STORAGE_KEY + '.focus', String(!focus)); } catch { /* optional */ }
  };
  const selected = (side: Side) => layout.filter(item => item.side === side && !item.hidden);
  const count = layout.filter(item => !item.hidden).length;
  const reorder = (side: Side, items: WidgetItem[]) => {
    const desired = items.map(item => item.id);
    const current = selected(side);
    const byId = new Map<string, GroupLayout>(current.map(item => [item.id, item]));
    const ordered = desired.map(id => byId.get(id)).filter((item): item is GroupLayout => Boolean(item));
    if (ordered.length !== current.length) return;
    let index = 0;
    save(layout.map(item => item.side === side && !item.hidden ? ordered[index++] ?? item : item));
  };

  const groupInfo = (id: GroupKey) => GROUPS.find(group => group.id === id)!;
  const card = (item: GroupLayout) => {
    const group = groupInfo(item.id);
    return <div className="home-feed-widget h-full min-h-0 w-full flex flex-col">
      <header className="home-feed-widget-title">
        <GripVertical size={13} className="home-feed-grip" aria-hidden="true" />
        <strong>{group.name}</strong>
        <button data-no-drag type="button" onClick={() => patch(item.id, { side: item.side === 'left' ? 'right' : 'left' })}
          aria-label={`Move ${group.name} to the ${item.side === 'left' ? 'right' : 'left'} sidebar`} title="Move to other side">
          <ArrowLeftRight size={14} />
        </button>
        <button data-no-drag type="button" onClick={() => patch(item.id, { hidden: true })}
          aria-label={`Hide ${group.name}`} title="Hide widget"><EyeOff size={14}/></button>
      </header>
      {group.choices.length > 1 && <label data-no-drag className="home-feed-widget-choice">
        <span className="sr-only">{group.name} view</span>
        <select aria-label={`${group.name} view`} value={item.active} onChange={event => patch(item.id, { active: event.target.value })}>
          {group.choices.map(choice => <option key={choice.id} value={choice.id}>{choice.name}</option>)}
        </select>
      </label>}
      <div data-no-drag className="home-widget-scroll min-h-0 flex-1 overflow-auto touch-pan-y">
        {widgets[item.active]}
      </div>
    </div>;
  };
  const rail = (side: Side) => {
    const entries = selected(side);
    return <aside className={`home-feed-rail home-feed-rail--${side}`} aria-label={side === 'left' ? 'People and priorities' : 'Introductions and activity'}>
      <div className="home-feed-rail-label">{side === 'left' ? 'People & context' : 'Activity & next steps'}</div>
      {entries.length > 0
        ? <DraggableWidgetGrid items={entries.map(item => ({id:item.id,size:'sm' as const,label:groupInfo(item.id).name}))}
            onChange={next => reorder(side, next)} maxColumns={1} cellSize={236} rowHeight={railHeight} gap={14} radius={0}
            className="home-feed-side-grid"
            renderItem={item => card(layout.find(entry => entry.id === item.id)!)} />
        : <p className="home-feed-empty">No tools on this side. Use Customize to add one.</p>}
      {side === 'right' && actionQueue && <details className="home-feed-priorities">
        <summary>Weekly priorities <span>Optional</span></summary>
        <div className="home-feed-priorities-content">{actionQueue}</div>
      </details>}
    </aside>;
  };

  return <>
    <section className={`home-feed-layout ${focus ? 'home-feed-layout--focus' : ''} ${!selected('left').length ? 'home-feed-layout--no-left' : ''} ${!selected('right').length && !actionQueue ? 'home-feed-layout--no-right' : ''}`}>
      {!focus && desktop && rail('left')}
      <div className="home-feed-center">
        <div className="home-feed-controls">
          <span className="home-feed-controls-label">Your network / Social feed</span>
          <div className="home-feed-controls-actions">
            <button type="button" aria-pressed={focus} onClick={focusToggle}>{focus ? 'Show sidebars' : 'Focus mode'}</button>
            <button type="button" onClick={() => setCustomize(true)}><Settings2 size={15}/> Customize <span className="home-feed-visible-count">{count}</span></button>
          </div>
        </div>
        {children}
        {!focus && !desktop && <details className="home-feed-mobile-tools">
          <summary><LayoutGrid size={16}/> Tools & widgets <span>{count} active</span></summary>
          <div className="home-feed-mobile-tool-list">
            {layout.filter(item => !item.hidden).map(item => <div key={item.id} className="home-feed-mobile-widget">{card(item)}</div>)}
            {actionQueue && <details className="home-feed-priorities"><summary>Weekly priorities</summary>{actionQueue}</details>}
          </div>
        </details>}
      </div>
      {!focus && desktop && rail('right')}
    </section>
    {customize && <div className="home-feed-customize-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) setCustomize(false);
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="home-feed-customize-title" className="home-feed-customize">
        <header>
          <div><span className="home-board-label">Your viewing preferences</span><h2 id="home-feed-customize-title">Customize your feed</h2></div>
          <button type="button" aria-label="Close customization" onClick={() => setCustomize(false)}><X size={20}/></button>
        </header>
        <p>Keep the feed central. Choose which tools appear, where they live, and which view they show. Drag a visible card within its side column to change its order. Alt + arrow keys also work.</p>
        <div className="home-feed-customize-list">
          {layout.map(item => {
            const group = groupInfo(item.id);
            return <div key={item.id} className="home-feed-customize-row">
              <label className="home-feed-customize-show"><input type="checkbox" checked={!item.hidden}
                onChange={event => patch(item.id, { hidden: !event.target.checked })} />
                <span>{item.hidden ? <EyeOff size={15}/> : <Eye size={15}/>}</span><strong>{group.name}</strong>
              </label>
              <label><span className="sr-only">Position of {group.name}</span>
                <select value={item.side} onChange={event => patch(item.id, {side:event.target.value as Side})}>
                  <option value="left">Left</option><option value="right">Right</option>
                </select>
              </label>
              <label><span className="sr-only">Selected view of {group.name}</span>
                <select value={item.active} onChange={event => patch(item.id, {active:event.target.value})}>
                  {group.choices.map(choice => <option value={choice.id} key={choice.id}>{choice.name}</option>)}
                </select>
              </label>
            </div>;
          })}
        </div>
        <footer>
          <button type="button" onClick={() => save(defaults())}><RotateCcw size={15}/> Reset layout</button>
          <button type="button" onClick={() => setCustomize(false)} className="home-feed-customize-done">Done</button>
        </footer>
      </section>
    </div>}
  </>;
}
