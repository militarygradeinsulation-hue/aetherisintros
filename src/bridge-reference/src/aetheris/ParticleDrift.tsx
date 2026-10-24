import { boundedCount, canvasToken, EFFECT_LIMITS, useAmbientCanvas } from './canvas-motion';

// Adapted from supplied particle-drift.html canvas only; no demo UI or scripts.
const GLYPHS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*()';
type Node = { x: number; y: number; vy: number; char: string };
type Beam = { x: number; y: number; length: number; speed: number; opacity: number };
function createDrift(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  let width = 0, height = 0;
  let nodes: Node[] = [], beams: Beam[] = [];
  const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '0';
  return {
    resize(w: number, h: number) {
      width = w; height = h;
      nodes = Array.from({ length: boundedCount(w * h, w < 768) }, () => ({ x: Math.random() * w, y: Math.random() * h, vy: Math.random() * 0.4 + 0.1, char: glyph() }));
      beams = Array.from({ length: Math.max(4, Math.min(EFFECT_LIMITS.beams, Math.round(w / 70))) }, () => ({ x: Math.random() * w, y: Math.random() * h, length: Math.random() * 100 + 50, speed: Math.random() * 6 + 3, opacity: Math.random() * 0.12 + 0.08 }));
    },
    draw(step: number) {
      ctx.clearRect(0, 0, width, height);
      const blue = canvasToken(canvas, '--ambient-beam'), ink = canvasToken(canvas, '--ambient-glyph');
      for (const b of beams) {
        b.y -= b.speed * step;
        if (b.y + b.length < 0) { b.y = height + 100; b.x = Math.random() * width; }
        const gradient = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.length);
        gradient.addColorStop(0, blue); gradient.addColorStop(1, 'transparent');
        ctx.strokeStyle = gradient; ctx.globalAlpha = b.opacity; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y + b.length); ctx.stroke();
      }
      ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      nodes.forEach((n, i) => {
        n.y += n.vy * step;
        if (n.y > height + 20) { n.y = -20; n.x = Math.random() * width; }
        if (step > 0 && Math.random() > 0.99) n.char = glyph();
        for (const b of nodes.slice(i + 1)) {
          const d = Math.hypot(n.x - b.x, n.y - b.y);
          if (d < 120) {
            ctx.strokeStyle = ink; ctx.globalAlpha = 0.08 * (1 - d / 120); ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        ctx.fillStyle = ink; ctx.globalAlpha = 0.22; ctx.fillText(n.char, n.x, n.y);
      });
      ctx.globalAlpha = 1;
    },
  };
}
export default function ParticleDrift({ className = '', speed = 0.25 }: { className?: string; speed?: number }) {
  const ref = useAmbientCanvas(createDrift, speed);
  return <canvas ref={ref} className={`ambient-effect ${className}`} data-effect="particle-drift" aria-hidden="true" />;
}
