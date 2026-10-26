import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import './butler-orb.css';

const RobotCanvas = lazy(() => import('./butler-robot-canvas'));
const BlobCanvas = lazy(() => import('./butler-blob-canvas'));

class RobotBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? null : this.props.children; }
}

/**
 * Butler's decorative 3D robot. Pointer movement is observed over the entire
 * window, while the existing launcher button keeps all clicks, drag handling,
 * keyboard access and voice behavior. No new assistant controller is created.
 */
export function ButlerAvatar({ robot = false, className = '', view }: { robot?: boolean; className?: string; view?: 'social' | 'business' }) {
  const host = useRef<HTMLSpanElement>(null);
  const pointer = useRef<[number, number]>([0, 0]);
  const [social, setSocial] = useState(false);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const sync = () => setSocial((view ?? document.documentElement.dataset['experience']) === 'social');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-experience'] });

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReducedMotion(motion.matches);
    const syncVisibility = () => setVisible(!document.hidden);
    syncMotion();
    syncVisibility();
    motion.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);

    // Keep a normal, visible fallback for devices that cannot render WebGL.
    const canvas = document.createElement('canvas');
    try {
      const gl = canvas.getContext('webgl2');
      setReady(!!gl);
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch { setReady(false); }

    const button = host.current?.closest('button');
    const move = (event: PointerEvent) => {
      const rect = (button ?? host.current)?.getBoundingClientRect();
      const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      const x = (event.clientX - cx) / Math.max(window.innerWidth * 0.48, 1);
      const y = (cy - event.clientY) / Math.max(window.innerHeight * 0.48, 1);
      // Imperative ref changes avoid 60 React renders/second as the mouse moves.
      pointer.current = [Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))];
    };
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    const reset = () => { pointer.current = [0, 0]; setHovered(false); };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });
    window.addEventListener('blur', reset);
    button?.addEventListener('pointerenter', enter);
    button?.addEventListener('pointerleave', leave);

    return () => {
      observer.disconnect();
      motion.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
      window.removeEventListener('blur', reset);
      button?.removeEventListener('pointerenter', enter);
      button?.removeEventListener('pointerleave', leave);
    };
  }, [view]);

  return <span ref={host} className={`butler-orb ${className}`} data-orb-view={social ? 'social' : 'business'} data-butler-avatar={robot ? 'robot' : 'orb'} aria-hidden="true">
    <span className="butler-orb-fallback" />
    {ready && <RobotBoundary><Suspense fallback={null}>
      {robot
        ? <RobotCanvas social={social} visible={visible} reducedMotion={reducedMotion} hovered={hovered} pointer={pointer} onLost={() => setReady(false)} />
        : <BlobCanvas social={social} visible={visible} reducedMotion={reducedMotion} hovered={hovered} pointer={pointer.current} onLost={() => setReady(false)} />}
    </Suspense></RobotBoundary>}
  </span>;
}

/** The existing floating launcher keeps the original view-colored orb. */
export function ButlerOrb() { return <ButlerAvatar />; }
