"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
export type AskIntrosTimelineItem = { id: string; rowId: string; startTime: string; duration: number; title: string; category?: string };
export type AskIntrosTimelineRow = { id: string; label: string };
export interface AskIntrosTimelineProps {
  rows: AskIntrosTimelineRow[];
  items: AskIntrosTimelineItem[];
  startHour?: number;
  endHour?: number;
  snapMinutes?: number;
  onMove?: (id: string, time: string, rowId: string) => Promise<boolean> | boolean;
  onItemClick?: (id: string) => void;
  className?: string;
}
const minutes = (time: string) => { const [h,m] = time.split(":").map(Number); return h * 60 + m; };
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2,"0")}:${String(m % 60).padStart(2,"0")}`;
export function AskIntrosTimeline({ rows, items, startHour=8, endHour=19, snapMinutes=15, onMove, onItemClick, className }: AskIntrosTimelineProps) {
  const [busy,setBusy] = React.useState<string | null>(null);
  const drag = React.useRef<{id:string; x:number; start:number} | null>(null);
  const range = Math.max(1, (endHour-startHour)*60);
  const width = Math.max(900, (endHour-startHour)*125);
  const move = async (id:string, time:string, rowId:string) => { if (!onMove || busy) return; setBusy(id); try { await onMove(id,time,rowId); } finally { setBusy(null); } };
  return <div className={cn("w-full overflow-x-auto rounded-xl border border-border bg-background text-foreground",className)}>
    <div style={{minWidth:width+170}}>
      <div className="sticky top-0 z-10 flex border-b border-border bg-card text-card-foreground">
        <div className="w-[170px] shrink-0 border-r border-border p-3 text-sm font-semibold">People / resources</div>
        <div className="relative h-12 flex-1">{Array.from({length:endHour-startHour+1},(_,i)=><span key={i} className="absolute top-3 text-xs text-muted-foreground" style={{left:`${i*100/(endHour-startHour)}%`}}>{clock((startHour+i)*60)}</span>)}</div>
      </div>
      {rows.map(row=><div key={row.id} className="flex min-h-20 border-b border-border last:border-b-0">
        <div className="flex w-[170px] shrink-0 items-center border-r border-border bg-card px-3 text-sm font-medium text-card-foreground">{row.label}</div>
        <div className="relative min-h-20 flex-1" onDragOver={e=>e.preventDefault()} onDrop={e=>{ e.preventDefault(); const id=e.dataTransfer.getData("text/plain"); const item=items.find(x=>x.id===id); if(!item)return; const rect=e.currentTarget.getBoundingClientRect(); const pos=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)); const latest=endHour*60-item.duration; const next=Math.max(startHour*60,Math.min(latest,Math.round((startHour*60+pos*range)/snapMinutes)*snapMinutes)); void move(id,clock(next),row.id); }}>
          {Array.from({length:endHour-startHour},(_,i)=><div key={i} className="pointer-events-none absolute inset-y-0 border-l border-border/60" style={{left:`${i*100/(endHour-startHour)}%`}} />)}
          {items.filter(x=>x.rowId===row.id).map(item=><button key={item.id} type="button" draggable={!!onMove && busy===null} disabled={busy!==null} onDragStart={e=>{e.dataTransfer.setData("text/plain",item.id);e.dataTransfer.effectAllowed="move";}} onClick={()=>onItemClick?.(item.id)} title={`${item.title} at ${item.startTime}`}
            className="absolute top-2 bottom-2 overflow-hidden rounded-md border border-primary/40 bg-primary/15 px-2 py-1 text-left text-xs font-semibold text-foreground shadow-sm hover:bg-primary/25 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
            style={{left:`${Math.max(0,(minutes(item.startTime)-startHour*60)/range)*100}%`,width:`${Math.min(item.duration/range*100,100)}%`,minWidth:42}}>
            <span className="block truncate">{item.title}</span><span className="block text-[11px] opacity-80">{item.startTime}</span>
          </button>)}
        </div>
      </div>)}
    </div>
    <p className="p-2 text-xs text-muted-foreground">Drag appointments to another time or row. Changes are saved only when the connected handler confirms them.</p>
  </div>;
}
export default AskIntrosTimeline;
