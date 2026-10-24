"use client";

import * as React from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { CHART_COLORS, STAGE_COLORS, CATEGORY_COLORS, stageChartColor, compactPipelineStageLabel } from '@/aetheris/ledger/chart-colors'

/** Real, owner-scoped CRM data. Personal portfolio values aren't fabricated. */
export interface FinanceBentoData {
  history: { month: string; billed: number; collected: number; target: number }[]
  pipeline: { name: string; value: number; count: number }[]
  categories: { name: string; value: number }[]
  receivables: { name: string; value: number }[]
  kpis: {
    pipeline: number; weighted: number; revenue30: number
    overdueValue: number; overdueCount: number
    winRate: number; grossMargin: number
  }
}
export interface FinanceBentoProps {
  data: FinanceBentoData
  title?: string
  subtitle?: string
  avatar?: string
  avatarAlt?: string
  credit?: boolean
  className?: string
  style?: React.CSSProperties
}
type Period = '3M' | '6M' | '12M'
const compactMoney = (n: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 1,
  notation: Math.abs(n) >= 1000 ? 'compact' : 'standard',
}).format(Number(n) || 0)
const currency = (n: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
}).format(Number(n) || 0)
const percent = (n: number) => Number.isFinite(n) ? n.toFixed(1) + '%' : '—'
const axis = { tickLine: false as const, axisLine: false as const, fontSize: 11, stroke: '#CBD5E1' }
const tooltipStyle = {
  background: '#11192D', border: '1px solid rgba(255,255,255,.2)',
  color: '#FFFFFF', borderRadius: 14, fontSize: 12, boxShadow: '0 16px 32px #0006',
}
const moneyTooltip = (value: number) => currency(Number(value))
const gridStroke = 'rgba(165,185,220,.21)'
function Graph({ children, height = 215, label }: { children: React.ReactElement; height?: number; label: string }) {
  return <div className="fpb-graph" style={{ height }} role="group" aria-label={label}>
    <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
  </div>
}
function Tile({ tone = 'graphite', className = '', children, title }: {
  tone?: 'blue' | 'green' | 'rose' | 'violet' | 'amber' | 'graphite'
  className?: string; children: React.ReactNode; title: string
}) {
  return <section className={'fpb-card fpb-' + tone + ' ' + className} aria-label={title}>
    <span className="fpb-card-glow" aria-hidden="true" />
    <div className="fpb-card-inner">{children}</div>
  </section>
}
function Dot({ color }: { color: string }) {
  return <i className="fpb-dot" style={{ backgroundColor: color }} aria-hidden="true" />
}
function Empty({ text }: { text: string }) {
  return <p className="fpb-empty">{text}</p>
}

export function FinanceBento({
  data, title = 'Financial overview', subtitle = 'Your workspace records',
  avatar, avatarAlt = 'Profile', className = '', style,
}: FinanceBentoProps) {
  const [period, setPeriod] = React.useState<Period>('12M')
  const months = period === '3M' ? 3 : period === '6M' ? 6 : 12
  const recent = React.useMemo(() => data.history.slice(-months), [data.history, months])
  const hasInvoiceHistory = recent.some(v => v.billed > 0 || v.collected > 0)
  const categories = data.categories.filter(v => v.value > 0)
  const categoryTotal = categories.reduce((n, row) => n + row.value, 0)
  const billed = recent.reduce((n, row) => n + row.billed, 0)
  const collected = recent.reduce((n, row) => n + row.collected, 0)
  const collectionRate = billed ? percent(collected / billed * 100) : '—'
  const highestAging = Math.max(1, ...data.receivables.map(row => row.value))
  return <div className={'fpb ' + className} style={style}>
    <header className="fpb-top">
      <div className="fpb-heading">
        <span className="fpb-eyebrow">ASK INTROS / REVENUE INTELLIGENCE</span>
        <h2>{title}</h2><p>{subtitle}</p>
      </div>
      <div className="fpb-controls">
        <div className="fpb-segmented" role="group" aria-label="Financial chart period">
          {(['3M', '6M', '12M'] as const).map(choice =>
            <button key={choice} type="button" aria-pressed={choice === period}
              onClick={() => setPeriod(choice)}>{choice}</button>)}
        </div>
        {avatar ? <img className="fpb-avatar" src={avatar} alt={avatarAlt} loading="lazy" /> : null}
      </div>
    </header>
    <div className="fpb-grid">
      <Tile tone="blue" className="fpb-large" title="Billed versus collected revenue">
        <div className="fpb-flex-head">
          <div><span className="fpb-cap">REVENUE STREAM</span><h3>Billed vs collected</h3>
            <strong className="fpb-hero-value">{compactMoney(collected)}</strong>
            <p className="fpb-subtle">Collected in the last {months} months</p>
          </div>
          <div className="fpb-key"><span><Dot color={CHART_COLORS.billed}/> Billed</span>
            <span><Dot color={CHART_COLORS.collected}/> Collected</span></div>
        </div>
        {hasInvoiceHistory ? <Graph height={190} label="Billed versus collected amounts by month">
          <AreaChart data={recent} margin={{ top: 9, left: -9, right: 7 }}>
            <CartesianGrid stroke={gridStroke} vertical={false} />
            <XAxis dataKey="month" {...axis}/><YAxis {...axis} width={65} tickFormatter={compactMoney} />
            <Tooltip contentStyle={tooltipStyle} formatter={moneyTooltip} />
            <Area type="monotone" dataKey="billed" name="Billed"
              stroke={CHART_COLORS.billed} strokeWidth={2.8} fill={CHART_COLORS.billed} fillOpacity={.18} />
            <Area type="monotone" dataKey="collected" name="Collected"
              stroke={CHART_COLORS.collected} strokeWidth={2.8} fill={CHART_COLORS.collected} fillOpacity={.18} />
          </AreaChart>
        </Graph> : <Empty text="No issued or paid invoice history yet."/>}
      </Tile>

      <Tile tone="violet" className="fpb-allocation" title="Revenue allocation by category">
        <span className="fpb-cap">REVENUE COMPOSITION</span><h3>Allocation</h3>
        {categories.length ? <>
          <div className="fpb-donut">
            <Graph height={188} label="Revenue split by product or service category">
              <PieChart><Pie data={categories} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="85%" paddingAngle={2} stroke="none">
                {categories.map((row, i) => <Cell key={row.name} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}/>)}
              </Pie><Tooltip contentStyle={tooltipStyle} formatter={moneyTooltip} /></PieChart>
            </Graph>
            <div className="fpb-donut-total"><span>Order value</span><strong>{compactMoney(categoryTotal)}</strong></div>
          </div>
          <div className="fpb-category-list">{categories.slice(0,5).map((row, i) =>
            <div key={row.name}><span><Dot color={CATEGORY_COLORS[i % CATEGORY_COLORS.length] || CHART_COLORS.billed}/>{row.name}</span>
              <strong>{Math.round(100*row.value/categoryTotal)}%</strong></div>)}</div>
        </> : <Empty text="No categorized order revenue recorded yet." />}
      </Tile>

      <Tile tone="green" className="fpb-kpi" title="Collected invoices, last 30 days">
        <span className="fpb-cap">COLLECTED / 30 DAYS</span><strong className="fpb-kpi-value">{compactMoney(data.kpis.revenue30)}</strong>
        <span className="fpb-kpi-footer"><Dot color={CHART_COLORS.collected}/>Paid invoices only</span>
      </Tile>
      <Tile tone="rose" className="fpb-kpi" title="Overdue invoices">
        <span className="fpb-cap">OVERDUE RECEIVABLES</span><strong className="fpb-kpi-value">{compactMoney(data.kpis.overdueValue)}</strong>
        <span className="fpb-kpi-footer"><Dot color={CHART_COLORS.rose}/>{data.kpis.overdueCount} overdue invoices</span>
      </Tile>
      <Tile tone="amber" className="fpb-kpi" title="Weighted opportunity pipeline">
        <span className="fpb-cap">WEIGHTED PIPELINE</span><strong className="fpb-kpi-value">{compactMoney(data.kpis.weighted)}</strong>
        <span className="fpb-kpi-footer"><Dot color={CHART_COLORS.amber}/>Probability adjusted</span>
      </Tile>
      <Tile tone="graphite" className="fpb-kpi" title="Closed-deal win rate">
        <span className="fpb-cap">WIN RATE</span><strong className="fpb-kpi-value">{percent(data.kpis.winRate)}</strong>
        <span className="fpb-kpi-footer"><Dot color={CHART_COLORS.violet}/>Closed opportunities</span>
      </Tile>

      <Tile tone="rose" className="fpb-flow" title="Monthly billed and paid invoices">
        <div className="fpb-flex-head"><div><span className="fpb-cap">BILLING PERFORMANCE</span><h3>Cash flow signals</h3>
          <p className="fpb-subtle">Invoice data, not bank account balances</p></div>
          <div className="fpb-key"><span><Dot color={CHART_COLORS.billed}/>Billed</span>
            <span><Dot color={CHART_COLORS.collected}/>Paid</span></div></div>
        {hasInvoiceHistory ? <Graph label="Monthly billed and collected invoices" height={205}>
          <BarChart data={recent} margin={{ top: 9, left: -10, right: 3 }}>
            <CartesianGrid stroke={gridStroke} vertical={false}/>
            <XAxis dataKey="month" {...axis}/><YAxis {...axis} width={65} tickFormatter={compactMoney}/>
            <Tooltip contentStyle={tooltipStyle} formatter={moneyTooltip}/>
            <Bar dataKey="billed" name="Billed" fill={CHART_COLORS.billed} radius={[5,5,0,0]} maxBarSize={36}/>
            <Bar dataKey="collected" name="Collected" fill={CHART_COLORS.collected} radius={[5,5,0,0]} maxBarSize={36}/>
          </BarChart>
        </Graph> : <Empty text="No invoice amounts recorded yet."/>}
      </Tile>

      <Tile tone="amber" className="fpb-pipeline" title="Opportunity pipeline by stage">
        <span className="fpb-cap">OPPORTUNITY MOMENTUM</span><h3>Pipeline by stage</h3>
        {data.pipeline.some(v => v.value > 0) ? <Graph label="Opportunity value by sales stage" height={228}>
          <BarChart data={data.pipeline} margin={{ top: 8, left: -10, right: 2 }}>
            <CartesianGrid stroke={gridStroke} vertical={false}/>
            <XAxis dataKey="name" {...axis} interval={0} tickFormatter={compactPipelineStageLabel} tickMargin={7}/>
            <YAxis {...axis} width={65} tickFormatter={compactMoney}/>
            <Tooltip contentStyle={tooltipStyle} formatter={moneyTooltip}/>
            <Bar dataKey="value" name="Pipeline value" radius={[6,6,0,0]} maxBarSize={52}>
              {data.pipeline.map((v,i) => <Cell key={v.name} fill={stageChartColor(i)}/>)}
            </Bar>
          </BarChart>
        </Graph> : <Empty text="Add opportunities to see pipeline stage values."/>}
      </Tile>

      <Tile tone="green" className="fpb-aging" title="Accounts receivable aging">
        <span className="fpb-cap">RECEIVABLES HEALTH</span><h3>Aging</h3>
        <strong className="fpb-secondary-value">{collectionRate}</strong>
        <p className="fpb-subtle">Paid divided by billed for selected period</p>
        <div className="fpb-aging-list">
          {data.receivables.map((row,i) => <div key={row.name}>
            <div className="fpb-aging-label"><span><Dot color={STAGE_COLORS[i % STAGE_COLORS.length] || CHART_COLORS.billed}/>{row.name}</span>
              <b>{compactMoney(row.value)}</b></div>
            <div className="fpb-aging-track"><span style={{width: String(100*row.value/highestAging)+'%',
              backgroundColor:STAGE_COLORS[i % STAGE_COLORS.length] || CHART_COLORS.billed}}/></div>
          </div>)}
        </div>
      </Tile>
    </div>
  </div>
}
export default FinanceBento
