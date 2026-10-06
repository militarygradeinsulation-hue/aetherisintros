import { useEffect, useRef } from "react";
import { useAccent } from "./AccentMode";

/**
 * Drifting blueprint grid, pointer-lit cell, film grain and a soft spotlight —
 * the reference field from the uploaded study, recoloured by the accent mode.
 * Sits behind every screen and never takes pointer input.
 */

type Offset = { x: number; y: number };

const CELL = 46;
const SPEED = 0.45;

function hiDPI(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const cw = window.innerWidth | 0;
  const ch = window.innerHeight | 0;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(cw * dpr);
  canvas.height = Math.floor(ch * dpr);
  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const wrapped = (o: Offset, cell: number) => ({
  x: -(((o.x % cell) + cell) % cell),
  y: -(((o.y % cell) + cell) % cell),
});

export default function BackdropField() {
  const { mode } = useAccent();
  const gridRef = useRef<HTMLCanvasElement | null>(null);
  const cellRef = useRef<HTMLCanvasElement | null>(null);
  const grainRef = useRef<HTMLCanvasElement | null>(null);
  const offset = useRef<Offset>({ x: 0, y: 0 });
  const hovered = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const grid = gridRef.current;
    const square = cellRef.current;
    const grain = grainRef.current;
    if (!grid || !square || !grain) return;
    const g = grid.getContext("2d");
    const s = square.getContext("2d");
    const n = grain.getContext("2d", { alpha: true });
    if (!g || !s || !n) return;

    const cs = getComputedStyle(document.documentElement);
    const line = cs.getPropertyValue("--acc-field-line").trim() || "rgba(255,255,255,.06)";
    const fill = cs.getPropertyValue("--acc-field-fill").trim() || "rgba(245,176,39,.05)";
    const edge = cs.getPropertyValue("--acc-field-stroke").trim() || "rgba(245,176,39,.26)";
    const glow = cs.getPropertyValue("--acc-field-glow").trim() || "rgba(245,176,39,.45)";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let frame = 0;
    let hidden = false;

    const drawGrid = () => {
      const cw = grid.clientWidth;
      const ch = grid.clientHeight;
      g.clearRect(0, 0, cw, ch);
      const o = wrapped(offset.current, CELL);
      g.strokeStyle = line;
      g.lineWidth = 1;
      for (let x = o.x; x < cw + CELL; x += CELL) {
        g.beginPath();
        g.moveTo(x + 0.5, 0);
        g.lineTo(x + 0.5, ch);
        g.stroke();
      }
      for (let y = o.y; y < ch + CELL; y += CELL) {
        g.beginPath();
        g.moveTo(0, y + 0.5);
        g.lineTo(cw, y + 0.5);
        g.stroke();
      }
      const rad = g.createRadialGradient(
        cw / 2,
        ch * 0.34,
        0,
        cw / 2,
        ch * 0.34,
        Math.max(cw, ch) * 0.8,
      );
      rad.addColorStop(0, "rgba(0,0,0,0)");
      rad.addColorStop(1, "rgba(4,5,7,.9)");
      g.fillStyle = rad;
      g.fillRect(0, 0, cw, ch);
    };

    const drawCell = () => {
      const cw = square.clientWidth;
      const ch = square.clientHeight;
      s.clearRect(0, 0, cw, ch);
      const h = hovered.current;
      if (!h) return;
      const o = wrapped(offset.current, CELL);
      const x = o.x + h.x * CELL;
      const y = o.y + h.y * CELL;
      s.save();
      s.shadowBlur = 18;
      s.shadowColor = glow;
      s.fillStyle = fill;
      s.fillRect(x, y, CELL, CELL);
      s.restore();
      s.lineWidth = 1.25;
      s.strokeStyle = edge;
      s.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      const sheen = s.createLinearGradient(x, y, x, y + CELL);
      sheen.addColorStop(0, "rgba(255,255,255,.10)");
      sheen.addColorStop(1, "rgba(255,255,255,0)");
      s.fillStyle = sheen;
      s.fillRect(x, y, CELL, CELL);
    };

    const TILE = 192;
    grain.width = TILE;
    grain.height = TILE;
    const drawGrain = () => {
      const img = n.createImageData(TILE, TILE);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = 15;
      }
      n.putImageData(img, 0, 0);
    };

    const onMove = (e: MouseEvent) => {
      const o = wrapped(offset.current, CELL);
      hovered.current = {
        x: Math.floor((e.clientX - o.x) / CELL),
        y: Math.floor((e.clientY - o.y) / CELL),
      };
    };
    const onLeave = () => {
      hovered.current = null;
    };
    const onVisibility = () => {
      hidden = document.hidden;
    };
    const onResize = () => {
      hiDPI(grid, g);
      hiDPI(square, s);
    };

    hiDPI(grid, g);
    hiDPI(square, s);
    drawGrain();

    const tick = () => {
      if (!hidden) {
        if (!reduce) {
          offset.current.x = (offset.current.x - SPEED + CELL) % CELL;
          offset.current.y = (offset.current.y - SPEED + CELL) % CELL;
          if (frame++ % 3 === 0) drawGrain();
        }
        drawGrid();
        drawCell();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mode]);

  return (
    <div className="ix-backdrop" aria-hidden="true">
      <div className="ix-backdrop-spot" />
      <canvas ref={gridRef} className="ix-backdrop-grid" />
      <canvas ref={cellRef} className="ix-backdrop-cell" />
      <canvas ref={grainRef} className="ix-backdrop-grain" />
      <div className="ix-backdrop-foot" />
    </div>
  );
}
