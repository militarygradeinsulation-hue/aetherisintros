import { useEffect, useMemo, useRef, useState, type ComponentProps, type Ref } from "react";

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };
}

function useInView<T extends Element>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), options);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, inView] as const;
}

// Where each light starts, how much slower than `duration` it drifts, and
// how far into its drift it begins, so the three never move in step.
const LIGHTS = [
  { left: "-15%", top: "-30%", pace: 1, start: 0 },
  { left: "40%", top: "-15%", pace: 1.35, start: -0.3 },
  { left: "10%", top: "35%", pace: 1.7, start: -0.65 },
];

interface AuroraProps extends ComponentProps<"div"> {
  /** Three CSS colours, one per light. Theme variables work. */
  colors?: [string, string, string];
  /** Seconds for the fastest light to finish one drift. */
  duration?: number;
  /** Opacity of the lights, from 0 to 1. */
  intensity?: number;
}

/**
 * Slow, soft light drifting behind its content. Three radial gradients
 * moved with transforms only: no blur filters, no canvas. The lights pause
 * while off screen and hold still with `prefers-reduced-motion`.
 */
function Aurora({
  colors = ["var(--acc)", "var(--acc-bright)", "var(--acc-glow)"],
  duration = 20,
  intensity = 0.3,
  className,
  children,
  ref,
  ...props
}: AuroraProps) {
  const [observe, inView] = useInView<HTMLDivElement>({ rootMargin: "200px" });
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);

  return (
    <div
      ref={mergedRef}
      data-slot="aurora"
      className={`relative isolate overflow-hidden${className ? ` ${className}` : ""}`}
      {...props}
    >
      <div aria-hidden="true" data-slot="aurora-lights" className="pointer-events-none absolute inset-0 -z-10">
        {LIGHTS.map((light, index) => (
          <span
            key={index}
            className="ix-aurora-light absolute size-[75%] rounded-full"
            style={{
              left: light.left,
              top: light.top,
              background: `radial-gradient(closest-side, ${colors[index]}, transparent)`,
              opacity: intensity,
              animationDuration: `${duration * light.pace}s`,
              animationDelay: `${duration * light.start}s`,
              animationPlayState: inView ? "running" : "paused",
            }}
          />
        ))}
      </div>
      {children}
    </div>
  );
}

export default Aurora;
export { type AuroraProps };
