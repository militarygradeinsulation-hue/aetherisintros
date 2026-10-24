"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";
import "./shine-border.css";

export type ShineBorderProps = {
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  color?: string | string[];
  className?: string;
  children: React.ReactNode;
};

/** Decorative focus halo only: respects pointer events and reduced-motion preferences. */
export function ShineBorder({
  borderRadius = 12,
  borderWidth = 1,
  duration = 14,
  color = ["#EF4444", "#FB7185", "#A78BFA"],
  className,
  children,
}: ShineBorderProps) {
  const colors = Array.isArray(color) ? color : [color];
  const style = {
    "--shine-radius": String(Math.max(0, borderRadius)) + "px",
    "--shine-width": String(Math.max(1, borderWidth)) + "px",
    "--shine-duration": String(Math.max(2, duration)) + "s",
    "--shine-start": colors[0] || "#EF4444",
    "--shine-middle": colors[1] || colors[0] || "#FB7185",
    "--shine-end": colors[2] || colors[0] || "#A78BFA",
  } as React.CSSProperties;
  return <div className={cn("ask-shine-border", className)} style={style}>{children}</div>;
}
