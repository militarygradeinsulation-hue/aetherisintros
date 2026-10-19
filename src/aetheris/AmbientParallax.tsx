import { useEffect, useRef, type ReactNode } from 'react';
import Aurora from '@/intros-ui/Aurora';
import ParticleDrift from '@/aetheris/ParticleDrift';
import ConstellationField from '@/aetheris/ConstellationField';

/**
 * Subtle site-wide depth, using the existing branded ambient artwork.
 * Do not intercept native scrolling: members use nested scroll panes, editors,
 * dialogs and drag-and-drop, which a global Lenis instance would interfere with.
 */
export function AmbientParallax() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(pointer: fine)');
    const init = async () => {
      if (media.matches || !finePointer.matches || !containerRef.current) return;
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (disposed || media.matches || !containerRef.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const root = containerRef.current;
      const context = gsap.context(() => {
        const layers = root.querySelectorAll<HTMLElement>('[data-parallax-layer]');
        // Keep decorative motion small and behind content. A single timeline
        // shares one ScrollTrigger rather than creating a listener per layer.
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: document.documentElement,
            start: 'top top',
            end: () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight),
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
        layers.forEach((layer, index) => {
          timeline.fromTo(layer, { y: 0 }, { y: [-48, -30, -14][index], ease: 'none', immediateRender: false }, 0);
        });
      }, root);
      cleanup = () => context.revert(); // Only remove triggers created here.
    };
    void init();
    const onPreferenceChange = () => {
      cleanup?.();
      cleanup = undefined;
      void init();
    };
    media.addEventListener('change', onPreferenceChange);
    finePointer.addEventListener('change', onPreferenceChange);
    return () => {
      disposed = true;
      media.removeEventListener('change', onPreferenceChange);
      finePointer.removeEventListener('change', onPreferenceChange);
      cleanup?.();
    };
  }, []);

  const layer = (name: string, child: ReactNode) => (
    <div className="site-ambient-parallax-layer" data-parallax-layer={name}>{child}</div>
  );

  return <div className="site-ambient" ref={containerRef} aria-hidden="true">
    {layer('1', <Aurora className="site-ambient-lights" colors={['var(--acc, var(--cobalt))', 'var(--acc-bright, var(--cobalt-bright))', 'var(--acc-glow, var(--cobalt))']} duration={22} intensity={0.34} />)}
    {layer('2', <ParticleDrift className="site-ambient-numbers" />)}
    {layer('3', <ConstellationField className="site-ambient-connections" />)}
  </div>;
}
