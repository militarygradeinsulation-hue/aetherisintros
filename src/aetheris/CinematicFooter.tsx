// Cinematic closing footer for the public Home page.
// Adapted from a supplied GSAP concept to the Ask Intros Editorial Noir system:
// near-black ground, ivory type, cobalt interaction accent, amber signals only.

import * as React from 'react'
import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUp, ArrowRight, LockKeyhole } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const STYLES = `
.cinematic-footer-wrapper {
  /* Ask Intros noir tokens, mapped onto the shadcn-style variable names the effect uses */
  --background: #0B0D0F;
  --foreground: #F1EFE9;
  --primary: #0F5CCB;
  --secondary: #1A1F25;
  --destructive: #F4A125;

  --pill-bg-1: color-mix(in oklch, var(--foreground) 4%, transparent);
  --pill-bg-2: color-mix(in oklch, var(--foreground) 1%, transparent);
  --pill-shadow: color-mix(in oklch, var(--background) 50%, transparent);
  --pill-highlight: color-mix(in oklch, var(--foreground) 10%, transparent);
  --pill-inset-shadow: color-mix(in oklch, var(--background) 80%, transparent);
  --pill-border: color-mix(in oklch, var(--foreground) 10%, transparent);
  --pill-bg-1-hover: color-mix(in oklch, var(--primary) 22%, transparent);
  --pill-bg-2-hover: color-mix(in oklch, var(--foreground) 2%, transparent);
  --pill-border-hover: color-mix(in oklch, var(--primary) 55%, transparent);
  --pill-shadow-hover: color-mix(in oklch, var(--background) 70%, transparent);
  --pill-highlight-hover: color-mix(in oklch, var(--foreground) 20%, transparent);

  position: relative;
  overflow: hidden;
  background: var(--background);
  color: var(--foreground);
  font-family: inherit;
  -webkit-font-smoothing: antialiased;
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
  100% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
}
@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@keyframes footer-heartbeat {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px color-mix(in oklch, var(--destructive) 50%, transparent)); }
  15%, 45% { transform: scale(1.2); filter: drop-shadow(0 0 10px color-mix(in oklch, var(--destructive) 80%, transparent)); }
  30% { transform: scale(1); }
}

.animate-footer-breathe { animation: footer-breathe 8s ease-in-out infinite alternate; }
.animate-footer-scroll-marquee { animation: footer-scroll-marquee 40s linear infinite; }
.animate-footer-heartbeat { animation: footer-heartbeat 2s cubic-bezier(0.25, 1, 0.5, 1) infinite; }

.footer-bg-grid {
  background-size: 60px 60px;
  background-image:
    linear-gradient(to right, color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}

.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in oklch, var(--primary) 18%, transparent) 0%,
    color-mix(in oklch, var(--secondary) 20%, transparent) 40%,
    transparent 70%
  );
}

.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow:
    0 10px 30px -10px var(--pill-shadow),
    inset 0 1px 1px var(--pill-highlight),
    inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow:
    0 20px 40px -10px var(--pill-shadow-hover),
    inset 0 1px 1px var(--pill-highlight-hover);
  color: var(--foreground);
}

.footer-giant-bg-text {
  font-size: 26vw;
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1px color-mix(in oklch, var(--foreground) 6%, transparent);
  background: linear-gradient(180deg, color-mix(in oklch, var(--foreground) 12%, transparent) 0%, transparent 60%);
  -webkit-background-clip: text;
  background-clip: text;
}

.footer-text-glow {
  background: linear-gradient(180deg, var(--foreground) 0%, color-mix(in oklch, var(--foreground) 45%, transparent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 20px color-mix(in oklch, var(--foreground) 15%, transparent));
}

.footer-marquee-track {
  color: color-mix(in oklch, var(--foreground) 45%, transparent);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-size: 11px;
  white-space: nowrap;
}
.footer-marquee-track em {
  color: var(--destructive);
  font-style: normal;
  padding: 0 1.25rem;
}

@media (prefers-reduced-motion: reduce) {
  .animate-footer-breathe, .animate-footer-scroll-marquee, .animate-footer-heartbeat { animation: none; }
}
`

// -------------------------------------------------------------------------
// Magnetic primitive (GSAP, zero extra deps)
// -------------------------------------------------------------------------
type MagneticButtonProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType
  to?: string
  href?: string
}

const MagneticButton = React.forwardRef<HTMLElement, MagneticButtonProps>(
  ({ className, children, as: Component = 'button', ...props }, forwardedRef) => {
    const localRef = useRef<HTMLElement | null>(null)

    useEffect(() => {
      if (typeof window === 'undefined') return
      const element = localRef.current
      if (!element) return

      const handleMouseMove = (e: MouseEvent) => {
        const rect = element.getBoundingClientRect()
        const x = e.clientX - rect.left - rect.width / 2
        const y = e.clientY - rect.top - rect.height / 2
        gsap.to(element, {
          x: x * 0.4,
          y: y * 0.4,
          rotationX: -y * 0.15,
          rotationY: x * 0.15,
          scale: 1.05,
          ease: 'power2.out',
          duration: 0.4,
        })
      }
      const handleMouseLeave = () => {
        gsap.to(element, {
          x: 0, y: 0, rotationX: 0, rotationY: 0, scale: 1,
          ease: 'elastic.out(1, 0.3)',
          duration: 1.2,
        })
      }
      element.addEventListener('mousemove', handleMouseMove)
      element.addEventListener('mouseleave', handleMouseLeave)
      return () => {
        element.removeEventListener('mousemove', handleMouseMove)
        element.removeEventListener('mouseleave', handleMouseLeave)
      }
    }, [])

    return (
      <Component
        ref={(node: HTMLElement | null) => {
          localRef.current = node
          if (typeof forwardedRef === 'function') forwardedRef(node)
          else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = node
        }}
        className={className}
        {...props}
      >
        {children}
      </Component>
    )
  },
)
MagneticButton.displayName = 'MagneticButton'

// -------------------------------------------------------------------------
// Main footer
// -------------------------------------------------------------------------
const marqueeWords = ['Know Who Matters', 'Why They Matter', 'Why Now', 'Verified Members', 'Double Opt-In', 'Private by Default']

const MarqueeRun = () => (
  <div className="footer-marquee-track" aria-hidden="true">
    {marqueeWords.map((w) => (
      <React.Fragment key={w}>{w}<em>✦</em></React.Fragment>
    ))}
  </div>
)

export function CinematicFooter() {
  const wrapperRef = useRef<HTMLElement | null>(null)
  const giantTextRef = useRef<HTMLDivElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const linksRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !wrapperRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        giantTextRef.current,
        { y: '10vh', scale: 0.8, opacity: 0 },
        {
          y: '0vh', scale: 1, opacity: 1, ease: 'power1.out',
          scrollTrigger: { trigger: wrapperRef.current, start: 'top 85%', end: 'bottom bottom', scrub: 1 },
        },
      )
      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: wrapperRef.current, start: 'top 55%', end: 'bottom bottom', scrub: 1 },
        },
      )
    }, wrapperRef)
    return () => ctx.revert()
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <footer ref={wrapperRef} className="cinematic-footer-wrapper" aria-label="Site footer">
      <style>{STYLES}</style>

      {/* blueprint grid backdrop */}
      <div className="footer-bg-grid" style={{ position: 'absolute', inset: 0 }} aria-hidden="true" />
      {/* aurora glow */}
      <div
        className="footer-aurora animate-footer-breathe"
        style={{ position: 'absolute', left: '50%', top: '45%', width: '90vmin', height: '90vmin', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
        aria-hidden="true"
      />

      {/* marquee */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '28px 0', borderBottom: '1px solid color-mix(in oklch, var(--foreground) 8%, transparent)' }}>
        <div className="animate-footer-scroll-marquee" style={{ display: 'inline-flex', width: 'max-content' }}>
          <MarqueeRun />
          <MarqueeRun />
        </div>
      </div>

      {/* main body */}
      <div style={{ position: 'relative', padding: '96px 24px 140px', textAlign: 'center', maxWidth: 1100, margin: '0 auto' }}>
        {/* giant background word */}
        <div
          ref={giantTextRef}
          className="footer-giant-bg-text"
          aria-hidden="true"
          style={{ position: 'absolute', left: '50%', top: '58%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap' }}
        >
          INTROS
        </div>

        <div style={{ position: 'relative' }}>
          <span style={{ letterSpacing: '0.28em', fontSize: 11, textTransform: 'uppercase', color: 'color-mix(in oklch, var(--foreground) 55%, transparent)' }}>
            Ask Intros
          </span>
          <h2 ref={headingRef} className="footer-text-glow" style={{ fontSize: 'clamp(34px, 6vw, 72px)', lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.02em', margin: '18px 0 14px' }}>
            The Relationship Network<br />for CEOs.
          </h2>
          <p style={{ color: 'color-mix(in oklch, var(--foreground) 60%, transparent)', fontSize: 15, maxWidth: 520, margin: '0 auto 40px' }}>
            Who matters. Why they matter. Why now.
          </p>

          <div ref={linksRef} style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', alignItems: 'center' }}>
            <MagneticButton as={Link} to="/demo" className="footer-glass-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 26px', borderRadius: 999, color: 'inherit', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              Demo the system <ArrowRight size={15} />
            </MagneticButton>
            <MagneticButton as="a" href="#whitelist" className="footer-glass-pill" aria-label="Sign-in is locked until launch. Join the whitelist." style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 26px', borderRadius: 999, color: 'inherit', textDecoration: 'none', fontSize: 14, fontWeight: 600, opacity: 0.62 }}>
              <LockKeyhole size={14} /> Sign-in locked
            </MagneticButton>

            <MagneticButton as={Link} to="/founder-story" className="footer-glass-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 26px', borderRadius: 999, color: 'inherit', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              Read My Story
            </MagneticButton>
            <MagneticButton as="a" href="#whitelist" className="footer-glass-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 26px', borderRadius: 999, color: 'inherit', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              <span className="animate-footer-heartbeat" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--destructive)', display: 'inline-block' }} aria-hidden="true" />
              Join the whitelist
            </MagneticButton>
            <MagneticButton onClick={scrollToTop} aria-label="Back to top" className="footer-glass-pill" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', color: 'inherit', cursor: 'pointer' }}>
              <ArrowUp size={17} />
            </MagneticButton>
          </div>
        </div>
      </div>

      {/* legal strip */}
      <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderTop: '1px solid color-mix(in oklch, var(--foreground) 8%, transparent)', fontSize: 12, color: 'color-mix(in oklch, var(--foreground) 45%, transparent)' }}>
        <span>No spam. No selling your attention. Private by default.</span>
        <span>© 2026 Aetheris</span>
      </div>
    </footer>
  )
}

export default CinematicFooter
