/** Lightweight, opt-in local performance telemetry. No member data or URLs leave the browser. */
type Vital = { name: string; value: number; at: number };
const MAX_SAMPLES = 60;
const samples: Vital[] = [];
export function readPerformanceVitals(): readonly Vital[] { return [...samples]; }
export function installPerformanceVitals(): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return () => {};
  const observers: PerformanceObserver[] = [];
  const record = (name: string, value: number) => {
    if (!Number.isFinite(value) || value < 0) return;
    samples.push({ name, value: Math.round(value), at: Date.now() });
    if (samples.length > MAX_SAMPLES) samples.shift();
  };
  const observe = (type: string, handle: (entry: PerformanceEntry) => void) => {
    try {
      const observer = new PerformanceObserver(list => list.getEntries().forEach(handle));
      observer.observe({ type, buffered: true });
      observers.push(observer);
    } catch { /* Unsupported entry type: fail open. */ }
  };
  observe('largest-contentful-paint', entry => record('LCP', entry.startTime));
  observe('layout-shift', entry => {
    const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
    if (!shift.hadRecentInput) record('CLS-shift-x1000', (shift.value ?? 0) * 1000);
  });
  observe('longtask', entry => record('long-task', entry.duration));
  return () => observers.forEach(observer => observer.disconnect());
}
