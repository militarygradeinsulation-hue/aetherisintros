"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, CalendarDays, Mail, Search, type LucideIcon } from "lucide-react";
import "./expanding-tabs.css";

export type ExpandingTabItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  disabled?: boolean;
};

export interface ExpandingTabsProps {
  items?: readonly ExpandingTabItem[];
  value?: string | undefined;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  ariaLabel?: string;
  /** Navigation buttons are not ARIA tabs unless they actually control tab panels. */
  mode?: "navigation" | "tabs";
  className?: string;
}

const SPRING = { type: "spring" as const, stiffness: 420, damping: 30, mass: 0.7 };
const DEFAULT_ITEMS: readonly ExpandingTabItem[] = [
  { id: "inbox", label: "Inbox", icon: Mail },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "search", label: "Search", icon: Search },
];

/** Animated compact navigation. Controlled via value/onValueChange for real app routing. */
export function ExpandingTabs({
  items = DEFAULT_ITEMS,
  value,
  defaultValue,
  onValueChange,
  ariaLabel = "Quick navigation",
  mode = "navigation",
  className = "",
}: ExpandingTabsProps) {
  const [internal, setInternal] = React.useState(defaultValue ?? items[0]?.id ?? "");
  const selected = value ?? internal;
  const reduceMotion = useReducedMotion();
  const groupRef = React.useRef<HTMLDivElement>(null);
  const activate = (id: string) => {
    if (value === undefined) setInternal(id);
    onValueChange?.(id);
  };
  const handleKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (mode !== "tabs") return;
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    const available = items.filter(item => !item.disabled);
    const idx = available.findIndex(item => item.id === selected);
    if (!available.length) return;
    let next = idx;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = available.length - 1;
    else next = (idx + (event.key === "ArrowRight" ? 1 : -1) + available.length) % available.length;
    const item = available[next];
    if (!item) return;
    event.preventDefault();
    activate(item.id);
    groupRef.current?.querySelector<HTMLButtonElement>('[data-tab-id="' + item.id + '"]')?.focus();
  };
  return (
    <div ref={groupRef}
      role={mode === "tabs" ? "tablist" : "group"}
      aria-label={ariaLabel}
      onKeyDown={handleKeyboard}
      className={["ask-expanding-tabs", className].filter(Boolean).join(" ")}
      data-navigation-mode={mode}>
      {items.map(item => {
        const Icon = item.icon;
        const active = item.id === selected;
        const label = item.badge && item.badge > 0
          ? item.label + ", " + item.badge + " unread"
          : item.label;
        return (
          <motion.button
            key={item.id}
            layout={!reduceMotion}
            data-tab-id={item.id}
            type="button"
            role={mode === "tabs" ? "tab" : undefined}
            aria-selected={mode === "tabs" ? active : undefined}
            aria-current={mode === "navigation" && active ? "page" : undefined}
            aria-label={label}
            aria-pressed={mode === "navigation" ? active : undefined}
            disabled={item.disabled}
            onClick={() => activate(item.id)}
            whileHover={reduceMotion || active ? {} : { scale: 1.045 }}
            whileTap={reduceMotion ? {} : { scale: 0.95 }}
            transition={reduceMotion ? { duration: 0 } : SPRING}
            className={["ask-expanding-tab", active ? "is-active" : ""].filter(Boolean).join(" ")}>
            <motion.span
              animate={{ scale: reduceMotion ? 1 : active ? 1.03 : 1, opacity: active ? 1 : 0.78 }}
              transition={reduceMotion ? { duration: 0 } : SPRING}
              className="ask-expanding-tab-icon">
              <Icon aria-hidden="true" size={18} strokeWidth={1.9} />
              {item.badge && item.badge > 0 && !active
                ? <span className="ask-expanding-badge" aria-hidden="true">{item.badge > 99 ? "99+" : item.badge}</span>
                : null}
            </motion.span>
            <AnimatePresence initial={false}>
              {active && (
                <motion.span
                  key="label"
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, x: -7 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -7 }}
                  transition={reduceMotion ? { duration: 0 } : SPRING}
                  className="ask-expanding-tab-label">
                  {item.label}
                  {item.badge && item.badge > 0 ? <span className="ask-expanding-active-badge">{item.badge > 99 ? "99+" : item.badge}</span> : null}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}

export default ExpandingTabs;
