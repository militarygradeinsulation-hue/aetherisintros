import { useEffect, useRef } from "react";

/**
 * App-wide soft light that follows the cursor so members can see what they
 * are hovering over. Aetheris-tuned: restrained amber signal + cobalt halo.
 * Pointer-only (hidden on touch), respects reduced motion, never blocks clicks.
 */
export function CursorGlow({ radius = 220 }: { radius?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      el.style.transform = `translate3d(${x - radius}px, ${y - radius}px, 0)`;
    };
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      el.style.opacity = "1";
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const hide = () => (el.style.opacity = "0");
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", hide);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", hide);
      cancelAnimationFrame(frame);
    };
  }, [radius]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="cursor-glow"
      style={{ width: radius * 2, height: radius * 2 }}
    />
  );
}

export default CursorGlow;
