import { useEffect, useRef } from 'react';

export const EFFECT_LIMITS = { dpr: 1.5, fps: 24, nodes: 64, mobileNodes: 28, beams: 12 };
export function motionEnabled(speed: number, reduced: boolean, hidden: boolean, visible: boolean) {
  return Number.isFinite(speed) && speed > 0 && !reduced && !hidden && visible;
}
export function boundedCount(area: number, mobile: boolean) {
  return Math.max(12, Math.min(mobile ? EFFECT_LIMITS.mobileNodes : EFFECT_LIMITS.nodes, Math.round(area / 19000)));
}
type Renderer = { resize: (width: number, height: number) => void; draw: (step: number, time: number) => void };
/** Shared transparent canvas lifecycle; no browser work during SSR. */
export function useAmbientCanvas(create: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => Renderer, speed: number) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const renderer = create(ctx, canvas);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false, raf = 0, last = 0, elapsed = 0, frames = 0;
    const render = (step: number) => {
      elapsed += step;
      renderer.draw(step, elapsed);
      canvas.dataset['frames'] = String(++frames);
    };
    const tick = (now: number) => {
      const delta = now - last;
      if (delta >= 1000 / EFFECT_LIMITS.fps) {
        render(Math.min(delta, 80) / (1000 / 60) * Math.min(speed, 2));
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(raf); raf = 0;
      const running = motionEnabled(speed, media.matches, document.hidden, visible);
      canvas.dataset['motion'] = running ? 'running' : 'paused';
      if (running) { last = performance.now(); raf = requestAnimationFrame(tick); }
    };
    const resize = () => {
      const width = canvas.clientWidth, height = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, EFFECT_LIMITS.dpr);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderer.resize(width, height);
      render(0); // A real static frame for reduced motion / speed zero.
      sync();
    };
    const intersection = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); sync(); });
    const observer = new ResizeObserver(resize);
    const theme = new MutationObserver(() => render(0));
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    observer.observe(canvas); intersection.observe(canvas);
    document.addEventListener('visibilitychange', sync); media.addEventListener('change', sync);
    resize();
    return () => {
      cancelAnimationFrame(raf); observer.disconnect(); intersection.disconnect(); theme.disconnect();
      document.removeEventListener('visibilitychange', sync); media.removeEventListener('change', sync);
    };
  }, [create, speed]);
  return ref;
}
export function canvasToken(canvas: HTMLCanvasElement, name: string) {
  return getComputedStyle(canvas).getPropertyValue(name).trim();
}
