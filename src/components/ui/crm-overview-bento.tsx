"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { CHART_COLORS, stageChartColor } from "@/aetheris/ledger/chart-colors";
import type { CrmOpportunity, CrmStage } from "@/aetheris/crm/types";
import "./crm-overview-bento.css";

export interface CrmOverviewBentoProps {
  /** Account-scoped snapshot from the live canonical CRM; do not pass FullCrm starter data. */
  opportunities: readonly CrmOpportunity[];
  stages: readonly CrmStage[];
  peopleCount: number;
  openTaskCount: number;
  linkedMemberCount: number;
}

const money = (amount: number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 1,
  notation: Math.abs(amount) >= 1000 ? "compact" : "standard",
}).format(amount);
const fullMoney = (amount: number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
}).format(amount);
const labelDate = (date: Date) => date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
const ym = (d: Date) => d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
const axis = { tickLine: false as const, axisLine: false as const, stroke: "#DDE5F3", fontSize: 11 };
const tooltipStyle = { background: "#11182B", color: "#FFFFFF", border: "1px solid #DDE5F344", borderRadius: 12 };

function Tile({ tone, children, className = "" }: { tone: string; children: React.ReactNode; className?: string }) {
  return <article className={"ask-crm-bento-tile tone-" + tone + " " + className}>{children}</article>;
}
function Dot({ color }: { color: string }) {
  return <span className="ask-crm-bento-dot" style={{ backgroundColor: color }} aria-hidden="true" />;
}

/** Premium financial design using ONLY saved CRM opportunities and relationship records. */
export function CrmOverviewBento({ opportunities, stages, peopleCount, openTaskCount, linkedMemberCount }: CrmOverviewBentoProps) {
  const reduced = !!useReducedMotion();
  const [period, setPeriod] = React.useState<"6M" | "12M">("6M");
  const months = period === "6M" ? 6 : 12;
  const active = React.useMemo(() => opportunities.filter(o => !o.archived), [opportunities]);
  const open = active.filter(o => o.status === "open");
  const won = active.filter(o => o.status === "won");
  const lost = active.filter(o => o.status === "lost");
  const value = open.reduce((sum, o) => sum + Math.max(0, o.amount), 0);
  const weighted = open.reduce((sum, o) => sum + Math.max(0, o.amount) * Math.max(0, o.probability) / 100, 0);
  const winRate = won.length + lost.length ? (100 * won.length / (won.length + lost.length)).toFixed(1) + "%" : "—";
  const stageRows = React.useMemo(() => {
    const activeStages = stages.filter(s => !s.isWon && !s.isLost);
    return activeStages.map(s => ({
      name: s.name,
      count: open.filter(o => o.stageId === s.id).length,
      value: open.filter(o => o.stageId === s.id).reduce((sum, o) => sum + Math.max(0, o.amount), 0),
    }));
  }, [stages, open]);
  const history = React.useMemo(() => {
    const anchor = new Date();
    return Array.from({ length: months }, (_, index) => {
      const date = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - (months - 1 - index), 1));
      const key = ym(date);
      const rows = active.filter(o => {
        const created = new Date(o.createdAt);
        return !Number.isNaN(created.getTime()) && ym(created) === key;
      });
      return {
        month: labelDate(date),
        open: rows.filter(o => o.status === "open").reduce((sum, o) => sum + o.amount, 0),
        won: rows.filter(o => o.status === "won").reduce((sum, o) => sum + o.amount, 0),
      };
    });
  }, [active, months]);
  const noOpportunityData = !active.length;
  const chartAnimation = !reduced;

  return <section className="ask-crm-bento" aria-label="Live CRM revenue and relationship overview">
    <header className="ask-crm-bento-head">
      <div><span className="ask-crm-bento-eyebrow">ASK INTROS / REAL WORKSPACE SIGNALS</span>
        <h2>Revenue intelligence</h2>
        <p>Live opportunities and relationships from your private CRM. No invented invoice or portfolio balances.</p>
      </div>
      <div className="ask-crm-bento-period" role="group" aria-label="Opportunity history period">
        {(["6M", "12M"] as const).map(next =>
          <button type="button" key={next} aria-pressed={period === next} onClick={() => setPeriod(next)}>{next}</button>)}
      </div>
    </header>
    <div className="ask-crm-bento-grid">
      <Tile tone="cobalt" className="ask-crm-bento-wide">
        <span className="ask-crm-bento-cap">SALES OPPORTUNITIES</span>
        <h3>Value entering the pipeline</h3>
        <strong className="ask-crm-bento-big">{money(value)}</strong>
        <p className="ask-crm-bento-hint">{open.length} open opportunities, from saved account records</p>
        <div className="ask-crm-bento-legend"><span><Dot color={CHART_COLORS.billed}/>Open</span>
          <span><Dot color={CHART_COLORS.collected}/>Won</span></div>
        {noOpportunityData ? <p className="ask-crm-bento-empty">No opportunities yet. Add your first opportunity to populate this chart.</p> :
          <div className="ask-crm-bento-chart" role="group" aria-label="Actual opportunity value by creation month">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 8, right: 5, left: -5, bottom: 0 }}>
                <CartesianGrid stroke="#FFFFFF2A" vertical={false}/>
                <XAxis {...axis} dataKey="month" />
                <YAxis {...axis} width={62} tickFormatter={money}/>
                <Tooltip formatter={(v: number) => fullMoney(Number(v))} contentStyle={tooltipStyle}/>
                <Area name="Open" type="monotone" dataKey="open" fill={CHART_COLORS.billed} fillOpacity={.19}
                  stroke={CHART_COLORS.billed} strokeWidth={3} isAnimationActive={chartAnimation}/>
                <Area name="Won" type="monotone" dataKey="won" fill={CHART_COLORS.collected} fillOpacity={.16}
                  stroke={CHART_COLORS.collected} strokeWidth={3} isAnimationActive={chartAnimation}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>}
      </Tile>
      <Tile tone="violet" className="ask-crm-bento-stage">
        <span className="ask-crm-bento-cap">PIPELINE COMPOSITION</span>
        <h3>By stage</h3>
        <div className="ask-crm-bento-stage-legend">{stageRows.map((row, i) =>
          <span key={row.name}><Dot color={stageChartColor(i)} />{row.name}</span>)}</div>
        {stageRows.some(row => row.value > 0) ?
          <div className="ask-crm-bento-chart" role="group" aria-label="Color-coded actual opportunity stages">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageRows} margin={{ top: 5, right: 3, left: -7, bottom: 4 }}>
                <CartesianGrid stroke="#FFFFFF2A" vertical={false}/>
                <XAxis dataKey="name" {...axis} tickFormatter={(s:string)=>s==="Qualification"?"Qualify":s==="Negotiation"?"Negotiate":s} interval={0} />
                <YAxis {...axis} width={60} tickFormatter={money}/>
                <Tooltip contentStyle={tooltipStyle} formatter={(v:number)=>fullMoney(Number(v))}/>
                <Bar dataKey="value" name="Pipeline value" radius={[6,6,0,0]} maxBarSize={62} isAnimationActive={chartAnimation}>
                  {stageRows.map((row,i)=><Cell key={row.name} fill={stageChartColor(i)}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          : <p className="ask-crm-bento-empty">Stage values appear when opportunities are saved.</p>}
      </Tile>
      <Tile tone="green" className="ask-crm-bento-kpi">
        <span className="ask-crm-bento-cap">WEIGHTED PIPELINE</span>
        <strong className="ask-crm-bento-value">{money(weighted)}</strong>
        <span className="ask-crm-bento-foot"><Dot color={CHART_COLORS.collected}/>Probability adjusted, not guaranteed</span>
      </Tile>
      <Tile tone="pink" className="ask-crm-bento-kpi">
        <span className="ask-crm-bento-cap">CLOSED WIN RATE</span>
        <strong className="ask-crm-bento-value">{winRate}</strong>
        <span className="ask-crm-bento-foot"><Dot color={CHART_COLORS.rose}/>{won.length} won / {lost.length} lost</span>
      </Tile>
      <Tile tone="amber" className="ask-crm-bento-kpi">
        <span className="ask-crm-bento-cap">RELATIONSHIP NETWORK</span>
        <strong className="ask-crm-bento-value">{peopleCount}</strong>
        <span className="ask-crm-bento-foot"><Dot color={CHART_COLORS.amber}/>{linkedMemberCount} linked to network</span>
      </Tile>
      <Tile tone="graphite" className="ask-crm-bento-kpi">
        <span className="ask-crm-bento-cap">OPEN TASKS</span>
        <strong className="ask-crm-bento-value">{openTaskCount}</strong>
        <span className="ask-crm-bento-foot"><Dot color={CHART_COLORS.violet}/>Saved action items</span>
      </Tile>
    </div>
  </section>;
}
export default CrmOverviewBento;
