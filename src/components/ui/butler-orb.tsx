import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import './butler-orb.css';
const BlobCanvas = lazy(() => import('./butler-blob-canvas'));
class OrbBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? null : this.props.children; }
}
/** Decorative only: the existing button retains click, keyboard, drag and voice behavior. */
export function ButlerOrb() {
  const host = useRef<HTMLSpanElement>(null);
  const [social, setSocial] = useState(false);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pointer, setPointer] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    const sync = () => setSocial(document.documentElement.dataset['experience'] === 'social');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-experience'] });
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReducedMotion(motion.matches);
    const syncVisibility = () => setVisible(!document.hidden);
    syncMotion(); syncVisibility();
    motion.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);
    // Probe without consuming a context for browsers that cannot render WebGL.
    const canvas = document.createElement('canvas');
    try {
      const gl = canvas.getContext('webgl2');
      setReady(!!gl);
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch { setReady(false); }
    const button = host.current?.closest('button');
    const move = (event: PointerEvent) => {
      if (!button) return;
      const rect = button.getBoundingClientRect();
      setHovered(true);
      setPointer([(event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2]);
    };
    const leave = () => { setHovered(false); setPointer([0, 0]); };
    button?.addEventListener('pointermove', move);
    button?.addEventListener('pointerleave', leave);
    return () => { observer.disconnect(); motion.removeEventListener('change', syncMotion); document.removeEventListener('visibilitychange', syncVisibility); button?.removeEventListener('pointermove', move); button?.removeEventListener('pointerleave', leave); };
  }, []);
  return <span ref={host} className="butler-orb" data-orb-view={social ? 'social' : 'business'} aria-hidden="true">
    <span className="butler-orb-fallback" />
    {ready && <OrbBoundary><Suspense fallback={null}><BlobCanvas social={social} visible={visible} reducedMotion={reducedMotion} hovered={hovered} pointer={pointer} onLost={() => setReady(false)} /></Suspense></OrbBoundary>}
  </span>;
}
