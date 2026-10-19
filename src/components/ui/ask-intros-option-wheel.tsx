"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface AskIntrosOptionWheelProps {
  items: string[];
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}
export function AskIntrosOptionWheel({ items, value, onChange, label = "Choose an option", className }: AskIntrosOptionWheelProps) {
  const index = Math.max(0, items.indexOf(value ?? items[0]));
  const choose = (next: number) => { if (items.length) onChange(items[(next + items.length) % items.length]); };
  const touchStart = React.useRef<number | null>(null);
  if (!items.length) return null;
  return <div className={cn("relative mx-auto w-full max-w-xl rounded-2xl border border-border bg-card p-4 text-card-foreground", className)}>
    <div className="mb-3 text-sm font-semibold text-foreground">{label}</div>
    <div role="listbox" tabIndex={0} aria-label={label} aria-activedescendant={`wheel-option-${index}`}
      onKeyDown={e => { if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); choose(index + 1); } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); choose(index - 1); } }}
      onWheel={e => { if (Math.abs(e.deltaY) > 8) choose(index + Math.sign(e.deltaY)); }}
      onTouchStart={e => { touchStart.current = e.touches[0].clientY; }}
      onTouchEnd={e => { if (touchStart.current !== null) { const d = touchStart.current - e.changedTouches[0].clientY; if (Math.abs(d) > 25) choose(index + Math.sign(d)); touchStart.current = null; } }}
      className="relative flex min-h-52 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-background px-3 py-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {[-2,-1,0,1,2].map(offset => {
        const itemIndex = (index + offset + items.length) % items.length;
        const selected = offset === 0;
        return <button type="button" role="option" id={selected ? `wheel-option-${index}` : undefined} aria-selected={selected} key={offset} onClick={() => choose(index + offset)}
          className={cn("max-w-full break-words rounded-lg px-4 py-1 text-center transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", selected ? "scale-105 bg-primary font-bold text-primary-foreground shadow-sm" : "text-foreground/75 hover:text-foreground", Math.abs(offset) === 2 && "text-sm opacity-60")}>
          {items[itemIndex]}
        </button>;
      })}
    </div>
    <p className="mt-2 text-center text-xs text-muted-foreground">Scroll, swipe, click, or use arrow keys to select.</p>
  </div>;
}
export default AskIntrosOptionWheel;
