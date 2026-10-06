import { isShowcase } from '../showcase'
/**
 * Full CRM & operations workspace.
 *
 * One host, twelve modules, all reading the same account ledger. Nothing floats:
 * the module rail switches the panel beside it, exactly like the rest of Intros.
 */
import { useMemo, useState } from 'react'
import {
  Activity as ActivityIcon, BarChart3, Boxes, Building2, ClipboardList, Download, FileText,
  Kanban, Package, FileUp, Receipt, RotateCcw, Sparkles, Truck, UserRound, Users,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Btn, Eyebrow } from '../ui'
import { useLedger } from './store'
import SheetImport from './SheetImport'
import { count, downloadCsv, money, pct, shortDate } from './format'
import {
  inventoryByLocation, inventoryHealth, kpis, leadsBySource, marginTotals, ordersByMonth,
  ownerLeaderboard, pipelineByStage, receivablesAging, revenueByCategory, revenueByMonth,
  tierCohorts, winLossByMonth,
} from './analytics'
import { DEAL_STAGES, orderTotal, type DealStage } from './types'

type Module =
  | 'dashboard' | 'leads' | 'contacts' | 'companies' | 'deals' | 'activities'
  | 'products' | 'inventory' | 'orders' | 'invoices' | 'vendors' | 'reports' | 'import'

const MODULES: Array<{ id: Module; label: string; icon: typeof Kanban; group: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, group: 'Overview' },
  { id: 'leads', label: 'Leads', icon: Sparkles, group: 'Revenue' },
  { id: 'contacts', label: 'Contacts', icon: UserRound, group: 'Revenue' },
  { id: 'companies', label: 'Accounts', icon: Building2, group: 'Revenue' },
  { id: 'deals', label: 'Pipeline', icon: Kanban, group: 'Revenue' },
  { id: 'activities', label: 'Activities', icon: ClipboardList, group: 'Revenue' },
  { id: 'products', label: 'Catalogue', icon: Package, group: 'Operations' },
  { id: 'inventory', label: 'Inventory', icon: Boxes, group: 'Operations' },
  { id: 'orders', label: 'Orders', icon: Truck, group: 'Operations' },
  { id: 'invoices', label: 'Invoices', icon: Receipt, group: 'Finance' },
  { id: 'vendors', label: 'Suppliers', icon: FileText, group: 'Finance' },
  { id: 'reports', label: 'Reports', icon: ActivityIcon, group: 'Finance' },
  { id: 'import', label: 'Import', icon: FileUp, group: 'Data' },
]

const COBALT = '#C78522'
const AMBER = '#F4A125'
const GOLD = '#C78522'
const INK_LINE = 'rgba(255,255,255,.10)'
const MUTED = '#9EA4AC'
const PIE_COLORS = [COBALT, AMBER, '#C78522', GOLD, '#FFC85C', '#8C6A2B']

const axis = { stroke: MUTED, fontSize: 11, tickLine: false as const }
const tooltipStyle = {
  background: '#11151A', border: '1px solid rgba(255,255,255,.14)', borderRadius: 8,
  color: '#F1EFE9', fontSize: 12,
}

function Chart({ children, height = 240 }: { children: React.ReactElement; height?: number }) {
  return <div className="fcrm-chart" style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
  </div>
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div><Eyebrow>{label}</Eyebrow><strong>{value}</strong>{note ? <small>{note}</small> : null}</div>
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <article className="ops-panel">
    <div className="fcrm-panel-head"><Eyebrow>{title}</Eyebrow>{action}</div>
    {children}
  </article>
}

function Pill({ tone, children }: { tone?: 'good' | 'warn' | 'bad' | undefined; children: React.ReactNode }) {
  return <span className={`ops-chip fcrm-pill${tone ? ` is-${tone}` : ''}`}>{children}</span>
}

export default function FullCrm({ onBack }: { onBack: () => void }) {
  const api = useLedger()
  const [module, setModule] = useState<Module>(() => {
    if (typeof window === 'undefined') return 'dashboard'
    return (window.localStorage.getItem('aetheris.ledger.module') as Module) || 'dashboard'
  })
  const [query, setQuery] = useState('')
  const [hideStarterPref, setHideStarter] = useState(false)
  // Real accounts only ever see their own records; examples exist in the demo only.
  const hideStarter = !isShowcase() || hideStarterPref

  const go = (id: Module) => {
    setModule(id)
    setQuery('')
    if (typeof window !== 'undefined') window.localStorage.setItem('aetheris.ledger.module', id)
  }

  const l = useMemo(() => {
    const src = api.ledger
    if (!hideStarter) return src
    const real = <T extends { starter?: boolean }>(rows: T[]) => rows.filter(r => !r.starter)
    return { ...src, companies: real(src.companies), contacts: real(src.contacts), leads: real(src.leads), deals: real(src.deals),
      activities: real(src.activities), products: real(src.products), inventory: real(src.inventory), orders: real(src.orders),
      invoices: real(src.invoices), vendors: real(src.vendors) }
  }, [api.ledger, hideStarter])
  const term = query.trim().toLowerCase()
  const match = (text: string) => !term || text.toLowerCase().includes(term)
  const visible = <T extends { starter?: boolean }>(rows: T[]) => hideStarter ? rows.filter(r => !r.starter) : rows

  const k = useMemo(() => kpis(l), [l])
  const margins = useMemo(() => marginTotals(l), [l])
  const starterCount = (['companies', 'contacts', 'leads', 'deals', 'activities', 'products', 'inventory', 'orders', 'invoices', 'vendors'] as const)
    .reduce((n, key) => n + (api.ledger[key] as { starter?: boolean }[]).filter(r => r.starter).length, 0)

  if (!api.ready) return <p className="ops-note">Building your workspace…</p>

  const groups = [...new Set(MODULES.map(m => m.group))]

  return <div className="fcrm">
    <header className="fcrm-top">
      <div>
        <Eyebrow>FULL CRM &amp; OPERATIONS</Eyebrow>
        <h2>{l.companies.length} accounts · {l.deals.length} opportunities · {l.invoices.length} invoices</h2>
        <p>Built from your records in the basic CRM. Changes made in this view are saved on this device only and do not update your basic CRM records.</p>
      </div>
      <div className="fcrm-top-actions">
        <Btn kind="quiet" onClick={onBack}>Back to basic CRM</Btn>
      </div>
    </header>

    {isShowcase() && starterCount > 0 && <p className="fcrm-banner">
      Your workspace opened with {starterCount} example records shaped to your industry so nothing sits empty.
      {' '}{hideStarter ? 'Showing only your real records and figures.' : 'Invoices, orders, stock, suppliers and the money figures above include these examples — hide them to see only your own.'}
      <button type="button" onClick={() => setHideStarter(v => !v)}>
        {hideStarter ? 'Show examples' : 'Hide examples'}
      </button>
    </p>}

    <div className="fcrm-body">
      <nav className="fcrm-rail" aria-label="Workspace modules">
        {groups.map(group => <div key={group} className="fcrm-rail-group">
          <Eyebrow>{group}</Eyebrow>
          {MODULES.filter(m => m.group === group).map(m => {
            const Icon = m.icon
            return <button key={m.id} type="button" aria-current={m.id === module}
              className={m.id === module ? 'active' : ''} onClick={() => go(m.id)}>
              <Icon size={14} /> {m.label}
            </button>
          })}
        </div>)}
      </nav>

      <section className="fcrm-panel-area">
        {module === 'dashboard' && <>
          <div className="ops-stats">
            <Stat label="OPEN PIPELINE" value={money(k.pipeline, true)} note={`${k.openDealCount} open opportunities`} />
            <Stat label="WEIGHTED" value={money(k.weighted, true)} note="By stage probability — modelled" />
            <Stat label="COLLECTED · 30 DAYS" value={money(k.revenue30, true)} note="Paid invoices only" />
            <Stat label="WIN RATE" value={pct(k.winRate)} note={`Average deal ${money(k.avgDealSize, true)}`} />
          </div>
          <div className="ops-cols">
            <Panel title="BILLED VERSUS COLLECTED">
              <Chart><AreaChart data={revenueByMonth(l)}>
                <CartesianGrid stroke={INK_LINE} vertical={false} />
                <XAxis dataKey="month" {...axis} /><YAxis {...axis} tickFormatter={v => money(Number(v), true)} width={60} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money(v)} />
                <Area type="monotone" dataKey="billed" stroke={COBALT} fill={COBALT} fillOpacity={0.18} />
                <Area type="monotone" dataKey="collected" stroke={AMBER} fill={AMBER} fillOpacity={0.12} />
              </AreaChart></Chart>
            </Panel>
            <Panel title="PIPELINE BY STAGE">
              <Chart><BarChart data={pipelineByStage(l)}>
                <CartesianGrid stroke={INK_LINE} vertical={false} />
                <XAxis dataKey="name" {...axis} /><YAxis {...axis} tickFormatter={v => money(Number(v), true)} width={60} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money(v)} />
                <Bar dataKey="value" fill={COBALT} radius={[4, 4, 0, 0]} />
              </BarChart></Chart>
            </Panel>
          </div>
          <div className="ops-cols">
            <Panel title="ATTENTION">
              <p className="ops-event"><b>{k.overdueCount} overdue invoices</b><small>{money(k.overdueValue)} outstanding</small></p>
              <p className="ops-event"><b>{k.lowStockCount} items at or below reorder point</b><small>Check lead times before promising delivery</small></p>
              <p className="ops-event"><b>{k.openActivities} open activities</b><small>Across {k.accounts} accounts</small></p>
              <p className="ops-event"><b>Gross margin {pct(margins.grossMargin, 1)}</b><small>{money(margins.revenueYTD)} collected this year</small></p>
            </Panel>
            <Panel title="OWNERS">
              <div className="ops-table-scroll" tabIndex={0}>
                <table className="ops-table">
                  <thead><tr><th>Owner</th><th>Closed</th><th>Pipeline</th><th>Attainment</th></tr></thead>
                  <tbody>{ownerLeaderboard(l).map(r => <tr key={r.id}>
                    <td><b>{r.name}</b></td><td>{money(r.closedValue, true)}</td>
                    <td>{money(r.pipeline, true)}</td><td>{pct(r.attainment)}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </Panel>
          </div>
        </>}

        {module === 'leads' && (() => {
          const rows = visible(l.leads).filter(x => match(`${x.name} ${x.company} ${x.source} ${x.status}`))
          return <>
            <div className="ops-toolbar">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search leads…" aria-label="Search leads" />
              <Btn kind="quiet" onClick={() => downloadCsv('leads.csv', rows)}><Download size={14} /> Export</Btn>
            </div>
            <div className="ops-cols">
              <Panel title="LEADS BY SOURCE">
                <Chart height={210}><BarChart data={leadsBySource(l)}>
                  <CartesianGrid stroke={INK_LINE} vertical={false} />
                  <XAxis dataKey="name" {...axis} /><YAxis {...axis} width={34} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="leads" fill={COBALT} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="qualified" fill={AMBER} radius={[4, 4, 0, 0]} />
                </BarChart></Chart>
              </Panel>
              <Panel title="WHAT THIS TELLS YOU">
                {leadsBySource(l).slice(0, 4).map(s => <p key={s.name} className="ops-event">
                  <b>{s.name}</b>
                  <small>{s.leads} leads · {s.leads ? pct((s.qualified / s.leads) * 100) : '0%'} qualified · {money(s.value, true)} stated value</small>
                </p>)}
              </Panel>
            </div>
            <div className="ops-table-scroll" tabIndex={0} aria-label="Leads">
              <table className="ops-table">
                <thead><tr><th>Lead</th><th>Company</th><th>Source</th><th>Score</th><th>Value</th><th>Status</th></tr></thead>
                <tbody>{rows.map(x => <tr key={x.id}>
                  <td><b>{x.name}</b><small>{x.email}</small></td><td>{x.company}</td><td>{x.source}</td>
                  <td>{x.score}</td><td>{money(x.value)}</td>
                  <td>
                    <select value={x.status} aria-label={`Status for ${x.name}`}
                      onChange={e => api.setLeadStatus(x.id, e.target.value as typeof x.status)}>
                      {['New', 'Working', 'Qualified', 'Nurture', 'Disqualified', 'Converted'].map(s =>
                        <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>)}</tbody>
              </table>
            </div>
          </>
        })()}

        {module === 'contacts' && (() => {
          const rows = visible(l.contacts).filter(c => match(`${c.firstName} ${c.lastName} ${c.title} ${c.email} ${api.companyName(c.companyId)}`))
          return <>
            <div className="ops-toolbar">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search contacts…" aria-label="Search contacts" />
              <Btn kind="quiet" onClick={() => downloadCsv('contacts.csv', rows)}><Download size={14} /> Export</Btn>
            </div>
            <div className="ops-table-scroll" tabIndex={0} aria-label="Contacts">
              <table className="ops-table">
                <thead><tr><th>Contact</th><th>Title</th><th>Account</th><th>Status</th><th>Owner</th><th>Last touch</th></tr></thead>
                <tbody>{rows.map(c => <tr key={c.id}>
                  <td><b>{c.firstName} {c.lastName}</b><small>{c.email}</small></td>
                  <td>{c.title || '—'}</td><td>{api.companyName(c.companyId)}</td>
                  <td><Pill tone={c.status === 'Champion' ? 'good' : c.status === 'Churned' ? 'bad' : undefined}>{c.status}</Pill></td>
                  <td>{api.ownerName(c.ownerId)}</td><td>{shortDate(c.lastTouch)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </>
        })()}

        {module === 'companies' && (() => {
          const rows = visible(l.companies).filter(c => match(`${c.name} ${c.industry} ${c.country} ${c.tier}`))
          return <>
            <div className="ops-toolbar">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search accounts…" aria-label="Search accounts" />
              <Btn kind="quiet" onClick={() => downloadCsv('accounts.csv', rows)}><Download size={14} /> Export</Btn>
            </div>
            <div className="ops-cols">
              <Panel title="COHORTS BY TIER">
                <div className="ops-table-scroll" tabIndex={0}>
                  <table className="ops-table">
                    <thead><tr><th>Tier</th><th>Accounts</th><th>Recurring</th><th>Health</th><th>At risk</th></tr></thead>
                    <tbody>{tierCohorts(l).map(r => <tr key={r.name}>
                      <td><b>{r.name}</b></td><td>{r.accounts}</td><td>{money(r.arr, true)}</td>
                      <td>{r.health}</td><td>{r.atRisk}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              </Panel>
              <Panel title="RECURRING BY CATEGORY">
                <Chart height={210}><PieChart>
                  <Pie data={revenueByCategory(l)} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} stroke="none">
                    {revenueByCategory(l).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money(v)} />
                  <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
                </PieChart></Chart>
              </Panel>
            </div>
            <div className="ops-table-scroll" tabIndex={0} aria-label="Accounts">
              <table className="ops-table">
                <thead><tr><th>Account</th><th>Industry</th><th>Tier</th><th>Health</th><th>Recurring</th><th>Open pipeline</th><th>Owner</th></tr></thead>
                <tbody>{rows.map(c => {
                  const open = l.deals.filter(d => d.companyId === c.id && !d.stage.startsWith('Closed'))
                  return <tr key={c.id}>
                    <td><b>{c.name}</b><small>{c.website}</small></td>
                    <td>{c.industry}</td><td>{c.tier}</td>
                    <td><Pill tone={c.health >= 75 ? 'good' : c.health < 60 ? 'bad' : 'warn'}>{c.health}</Pill></td>
                    <td>{money(c.arr, true)}</td>
                    <td>{money(open.reduce((s, d) => s + d.value, 0), true)}</td>
                    <td>{api.ownerName(c.ownerId)}</td>
                  </tr>
                })}</tbody>
              </table>
            </div>
          </>
        })()}

        {module === 'deals' && (() => {
          const rows = visible(l.deals).filter(d => match(`${d.name} ${api.companyName(d.companyId)} ${d.stage}`))
          return <>
            <div className="ops-toolbar">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search opportunities…" aria-label="Search opportunities" />
              <Btn kind="quiet" onClick={() => downloadCsv('pipeline.csv', rows)}><Download size={14} /> Export</Btn>
            </div>
            <div className="fcrm-board">
              {DEAL_STAGES.map(stage => {
                const inStage = rows.filter(d => d.stage === stage)
                return <div key={stage} className="fcrm-col">
                  <header><Eyebrow>{stage}</Eyebrow><small>{money(inStage.reduce((s, d) => s + d.value, 0), true)}</small></header>
                  {inStage.map(d => <article key={d.id} className="fcrm-card">
                    <b>{d.name}</b>
                    <small>{api.companyName(d.companyId)} · {money(d.value, true)}</small>
                    <small>{api.contactName(d.contactId)} · closes {shortDate(d.closeDate)}</small>
                    <label>
                      <span className="fcrm-sr">Move {d.name} to another stage</span>
                      <select value={d.stage} onChange={e => api.moveDeal(d.id, e.target.value as DealStage)}>
                        {DEAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                  </article>)}
                  {!inStage.length && <p className="ops-note">Nothing here.</p>}
                </div>
              })}
            </div>
          </>
        })()}

        {module === 'activities' && (() => {
          const rows = l.activities.filter(a => match(`${a.subject} ${a.type} ${api.companyName(a.companyId)}`))
          const open = rows.filter(a => !a.done)
          return <>
            <div className="ops-toolbar">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search activities…" aria-label="Search activities" />
              <Btn kind="quiet" onClick={() => downloadCsv('activities.csv', rows)}><Download size={14} /> Export</Btn>
            </div>
            <div className="ops-stats">
              <Stat label="OPEN" value={count(open.length)} note="Not yet completed" />
              <Stat label="OVERDUE" value={count(open.filter(a => new Date(a.dueDate) < new Date()).length)} note="Past their due date" />
              <Stat label="HIGH PRIORITY" value={count(open.filter(a => a.priority === 'High').length)} note="Marked high" />
              <Stat label="DONE" value={count(rows.length - open.length)} note="Logged as complete" />
            </div>
            <div className="ops-table-scroll" tabIndex={0} aria-label="Activities">
              <table className="ops-table">
                <thead><tr><th>Done</th><th>Activity</th><th>Type</th><th>Account</th><th>Due</th><th>Priority</th></tr></thead>
                <tbody>{rows.map(a => <tr key={a.id}>
                  <td><input type="checkbox" checked={a.done} aria-label={`Mark ${a.subject} complete`}
                    onChange={() => api.toggleActivity(a.id)} /></td>
                  <td><b>{a.subject}</b></td><td>{a.type}</td><td>{api.companyName(a.companyId)}</td>
                  <td>{shortDate(a.dueDate)}</td>
                  <td><Pill tone={a.priority === 'High' ? 'warn' : undefined}>{a.priority}</Pill></td>
                </tr>)}</tbody>
              </table>
            </div>
          </>
        })()}

        {module === 'products' && (() => {
          const rows = l.products.filter(p => match(`${p.name} ${p.sku} ${p.category}`))
          return <>
            <div className="ops-toolbar">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search catalogue…" aria-label="Search catalogue" />
              <Btn kind="quiet" onClick={() => downloadCsv('catalogue.csv', rows)}><Download size={14} /> Export</Btn>
            </div>
            <div className="ops-table-scroll" tabIndex={0} aria-label="Catalogue">
              <table className="ops-table">
                <thead><tr><th>Item</th><th>SKU</th><th>Category</th><th>Price</th><th>Cost</th><th>Margin</th></tr></thead>
                <tbody>{rows.map(p => <tr key={p.id}>
                  <td><b>{p.name}</b></td><td>{p.sku}</td><td>{p.category}</td>
                  <td>{money(p.price)}</td><td>{money(p.cost)}</td>
                  <td>{pct(p.price ? ((p.price - p.cost) / p.price) * 100 : 0)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </>
        })()}

        {module === 'inventory' && (() => {
          const rows = inventoryHealth(l).filter(i => match(`${i.product} ${i.sku} ${i.location} ${i.state}`))
          return <>
            <div className="ops-toolbar">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search inventory…" aria-label="Search inventory" />
              <Btn kind="quiet" onClick={() => downloadCsv('inventory.csv', rows)}><Download size={14} /> Export</Btn>
            </div>
            <div className="ops-cols">
              <Panel title="ON HAND BY LOCATION">
                <Chart height={210}><BarChart data={inventoryByLocation(l)}>
                  <CartesianGrid stroke={INK_LINE} vertical={false} />
                  <XAxis dataKey="name" {...axis} /><YAxis {...axis} width={40} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="onHand" fill={COBALT} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="committed" fill={AMBER} radius={[4, 4, 0, 0]} />
                </BarChart></Chart>
              </Panel>
              <Panel title="NEEDS A DECISION">
                {rows.filter(i => i.state !== 'Healthy').slice(0, 6).map(i => <p key={i.id} className="ops-event">
                  <b>{i.product} · {i.location}</b>
                  <small>{i.available} available against a {i.reorderPoint} reorder point · {i.leadTimeDays} day lead time</small>
                </p>)}
                {!rows.some(i => i.state !== 'Healthy') && <p className="ops-note">Every line is above its reorder point.</p>}
              </Panel>
            </div>
            <div className="ops-table-scroll" tabIndex={0} aria-label="Inventory">
              <table className="ops-table">
                <thead><tr><th>Item</th><th>Location</th><th>On hand</th><th>Committed</th><th>Available</th><th>Lead time</th><th>State</th></tr></thead>
                <tbody>{rows.map(i => <tr key={i.id}>
                  <td><b>{i.product}</b><small>{i.sku}</small></td><td>{i.location}</td>
                  <td>{count(i.onHand)}</td><td>{count(i.committed)}</td><td>{count(i.available)}</td>
                  <td>{i.leadTimeDays} days</td>
                  <td><Pill tone={i.state === 'Healthy' ? 'good' : i.state === 'Low' ? 'warn' : 'bad'}>{i.state}</Pill></td>
                </tr>)}</tbody>
              </table>
            </div>
          </>
        })()}

        {module === 'orders' && (() => {
          const rows = l.orders.filter(o => match(`${o.number} ${api.companyName(o.companyId)} ${o.status}`))
          return <>
            <div className="ops-toolbar">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search orders…" aria-label="Search orders" />
              <Btn kind="quiet" onClick={() => downloadCsv('orders.csv', rows.map(o => ({
                number: o.number, account: api.companyName(o.companyId), status: o.status,
                created: o.createdAt, total: orderTotal(o),
              })))}><Download size={14} /> Export</Btn>
            </div>
            <Panel title="ORDER VALUE BY MONTH">
              <Chart height={210}><LineChart data={ordersByMonth(l)}>
                <CartesianGrid stroke={INK_LINE} vertical={false} />
                <XAxis dataKey="month" {...axis} /><YAxis {...axis} tickFormatter={v => money(Number(v), true)} width={60} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money(v)} />
                <Line type="monotone" dataKey="value" stroke={COBALT} strokeWidth={2} dot={false} />
              </LineChart></Chart>
            </Panel>
            <div className="ops-table-scroll" tabIndex={0} aria-label="Orders">
              <table className="ops-table">
                <thead><tr><th>Order</th><th>Account</th><th>Lines</th><th>Total</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>{rows.map(o => <tr key={o.id}>
                  <td><b>{o.number}</b></td><td>{api.companyName(o.companyId)}</td>
                  <td>{o.lines.map(line => `${line.qty} × ${api.productName(line.productId)}`).join(', ')}</td>
                  <td>{money(orderTotal(o))}</td>
                  <td><Pill tone={o.status === 'Delivered' ? 'good' : o.status === 'Cancelled' ? 'bad' : undefined}>{o.status}</Pill></td>
                  <td>{shortDate(o.createdAt)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </>
        })()}

        {module === 'invoices' && (() => {
          const rows = l.invoices.filter(i => match(`${i.number} ${api.companyName(i.companyId)} ${i.status}`))
          return <>
            <div className="ops-toolbar">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search invoices…" aria-label="Search invoices" />
              <Btn kind="quiet" onClick={() => downloadCsv('invoices.csv', rows)}><Download size={14} /> Export</Btn>
            </div>
            <div className="ops-stats">
              <Stat label="OVERDUE" value={money(k.overdueValue, true)} note={`${k.overdueCount} invoices past due`} />
              <Stat label="COLLECTED · 30 DAYS" value={money(k.revenue30, true)} note="Paid only" />
              <Stat label="COLLECTED THIS YEAR" value={money(margins.revenueYTD, true)} note="Paid invoices" />
              <Stat label="GROSS MARGIN" value={pct(margins.grossMargin, 1)} note="Across fulfilled orders" />
            </div>
            <Panel title="RECEIVABLES AGEING">
              <Chart height={200}><BarChart data={receivablesAging(l)}>
                <CartesianGrid stroke={INK_LINE} vertical={false} />
                <XAxis dataKey="name" {...axis} /><YAxis {...axis} tickFormatter={v => money(Number(v), true)} width={60} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money(v)} />
                <Bar dataKey="value" fill={AMBER} radius={[4, 4, 0, 0]} />
              </BarChart></Chart>
            </Panel>
            <div className="ops-table-scroll" tabIndex={0} aria-label="Invoices">
              <table className="ops-table">
                <thead><tr><th>Invoice</th><th>Account</th><th>Amount</th><th>Issued</th><th>Due</th><th>Status</th></tr></thead>
                <tbody>{rows.map(i => <tr key={i.id}>
                  <td><b>{i.number}</b></td><td>{api.companyName(i.companyId)}</td>
                  <td>{money(i.amount)}</td><td>{shortDate(i.issuedAt)}</td><td>{shortDate(i.dueAt)}</td>
                  <td><Pill tone={i.status === 'Paid' ? 'good' : i.status === 'Overdue' ? 'bad' : undefined}>{i.status}</Pill></td>
                </tr>)}</tbody>
              </table>
            </div>
          </>
        })()}

        {module === 'vendors' && (() => {
          const rows = l.vendors.filter(v => match(`${v.name} ${v.category} ${v.status}`))
          return <>
            <div className="ops-toolbar">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search suppliers…" aria-label="Search suppliers" />
              <Btn kind="quiet" onClick={() => downloadCsv('suppliers.csv', rows)}><Download size={14} /> Export</Btn>
            </div>
            <div className="ops-table-scroll" tabIndex={0} aria-label="Suppliers">
              <table className="ops-table">
                <thead><tr><th>Supplier</th><th>Category</th><th>Country</th><th>Lead time</th><th>On time</th><th>Spend</th><th>Status</th></tr></thead>
                <tbody>{rows.map(v => <tr key={v.id}>
                  <td><b>{v.name}</b></td><td>{v.category}</td><td>{v.country}</td>
                  <td>{v.leadTimeDays} days</td><td>{pct(v.onTimeRate)}</td><td>{money(v.spendYTD, true)}</td>
                  <td><Pill tone={v.status === 'Preferred' ? 'good' : v.status === 'Under review' ? 'warn' : undefined}>{v.status}</Pill></td>
                </tr>)}</tbody>
              </table>
            </div>
          </>
        })()}

        {module === 'import' && <SheetImport />}

        {module === 'reports' && <>
          <div className="ops-cols">
            <Panel title="WON AND LOST BY MONTH">
              <Chart height={220}><BarChart data={winLossByMonth(l)}>
                <CartesianGrid stroke={INK_LINE} vertical={false} />
                <XAxis dataKey="month" {...axis} /><YAxis {...axis} width={34} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="won" fill={COBALT} radius={[4, 4, 0, 0]} />
                <Bar dataKey="lost" fill={GOLD} radius={[4, 4, 0, 0]} />
              </BarChart></Chart>
            </Panel>
            <Panel title="COLLECTIONS TREND">
              <Chart height={220}><AreaChart data={revenueByMonth(l)}>
                <CartesianGrid stroke={INK_LINE} vertical={false} />
                <XAxis dataKey="month" {...axis} /><YAxis {...axis} tickFormatter={v => money(Number(v), true)} width={60} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money(v)} />
                <Area type="monotone" dataKey="collected" stroke={AMBER} fill={AMBER} fillOpacity={0.14} />
                <Area type="monotone" dataKey="target" stroke={COBALT} fill="none" strokeDasharray="4 4" />
              </AreaChart></Chart>
            </Panel>
          </div>
          <Panel title="EXPORTS" action={<Btn kind="quiet" onClick={api.resetWorkspace}><RotateCcw size={14} /> Reset workspace edits</Btn>}>
            <div className="fcrm-exports">
              <Btn kind="secondary" onClick={() => downloadCsv('pipeline.csv', l.deals)}><Users size={14} /> Pipeline</Btn>
              <Btn kind="secondary" onClick={() => downloadCsv('accounts.csv', l.companies)}><Building2 size={14} /> Accounts</Btn>
              <Btn kind="secondary" onClick={() => downloadCsv('invoices.csv', l.invoices)}><Receipt size={14} /> Invoices</Btn>
              <Btn kind="secondary" onClick={() => downloadCsv('inventory.csv', inventoryHealth(l))}><Boxes size={14} /> Inventory</Btn>
            </div>
          </Panel>
        </>}
      </section>
    </div>
  </div>
}
