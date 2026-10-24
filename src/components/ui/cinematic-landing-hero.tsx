"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight, ArrowUpRight, Check, CircleDot, Fingerprint,
  Handshake, ShieldCheck, Users,
} from "lucide-react";
import { ShineBorder } from "@/components/ui/shine-border";
import { cn } from "@/lib/utils";
import "./cinematic-landing-hero.css";

export interface CinematicHeroProps extends React.HTMLAttributes<HTMLElement> {
  brandName?: string;
  tagline1?: string;
  tagline2?: string;
  cardHeading?: string;
  cardDescription?: React.ReactNode;
  metricValue?: number;
  metricLabel?: string;
  ctaHeading?: string;
  ctaDescription?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

/**
 * Ask Intros cinematic chapter based on the supplied physical-depth component:
 * tactile blue-black card, 3D device, floating badges and an immersive reveal.
 * It never pins thousands of pixels of scrolling, fakes member data, or changes
 * existing app navigation. All demo UI in the phone is explicitly illustrative.
 */
export function CinematicHero({
  brandName = "ASK INTROS",
  tagline1 = "Each Connection",
  tagline2 = "Matters.",
  cardHeading = "A better introduction begins with a reason.",
  cardDescription = "Bring a real need, discover relevant people, and request introductions with mutual consent.",
  metricValue = 3,
  metricLabel = "Simple steps",
  ctaHeading = "The right person. The right reason. The right moment.",
  ctaDescription = "An intentional relationship network for people building businesses.",
  primaryHref = "/auth?mode=signup",
  primaryLabel = "Start connecting",
  secondaryHref = "/try",
  secondaryLabel = "Explore the experience",
  className,
  ...props
}: CinematicHeroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const deviceRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined" || !rootRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.fromTo("[data-cine-reveal]",
        { opacity: 0, y: 44, filter: "blur(9px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.25, ease: "power3.out",
          stagger: 0.14,
          scrollTrigger: { trigger: rootRef.current, start: "top 86%", once: true } });
      gsap.fromTo(".ask-cine-phone",
        { rotateX: 14, rotateY: -22, scale: .88, opacity: .25, y: 75 },
        { rotateX: 0, rotateY: 0, scale: 1, opacity: 1, y: 0,
          duration: 1.65, ease: "power3.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 70%", once: true } });
    }, rootRef);
    return () => { context.revert(); };
  }, []);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (typeof window === "undefined" || event.pointerType !== "mouse"
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cancelAnimationFrame(frameRef.current);
    const x = event.clientX, y = event.clientY;
    frameRef.current = requestAnimationFrame(() => {
      const card = cardRef.current, device = deviceRef.current;
      if (!card || !device) return;
      const box = card.getBoundingClientRect();
      card.style.setProperty("--mouse-x", x - box.left + "px");
      card.style.setProperty("--mouse-y", y - box.top + "px");
      gsap.to(device, { rotationY: ((x / window.innerWidth) - .5) * 12,
        rotationX: -((y / window.innerHeight) - .5) * 12,
        ease: "power3.out", duration: 1.1, overwrite: "auto" });
    });
  };
  const onPointerLeave = () => {
    cancelAnimationFrame(frameRef.current);
    if (deviceRef.current) gsap.to(deviceRef.current, {
      rotationX: 0, rotationY: 0, duration: .9, overwrite: "auto",
    });
  };

  return <section {...props} ref={rootRef}
    className={cn("ask-cinematic-hero", className)}
    aria-label="Ask Intros connection experience">
    <div className="ask-cine-grid" aria-hidden="true" />
    <div className="ask-cine-grain" aria-hidden="true" />
    <header className="ask-cine-heading">
      <p data-cine-reveal className="ask-cine-eyebrow">INTENTIONAL CONNECTIONS / ASK INTROS</p>
      <h2 data-cine-reveal className="ask-cine-headline">
        <span>{tagline1}</span><strong>{tagline2}</strong>
      </h2>
      <p data-cine-reveal className="ask-cine-subheading">{ctaDescription}</p>
    </header>

    <ShineBorder className="ask-cine-shell" borderRadius={36} borderWidth={1}
      duration={19} color={["#D8474D","#C4B5FD","#6277D9"]}>
      <article ref={cardRef} className="ask-cine-card" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
        <div className="ask-cine-sheen" aria-hidden="true"/>
        <div className="ask-cine-card-copy" data-cine-reveal>
          <div className="ask-cine-card-kicker"><CircleDot size={15} aria-hidden="true"/> INTRODUCTIONS WITH PURPOSE</div>
          <div className="ask-cine-brand">{brandName}</div>
          <h3>{cardHeading}</h3>
          <p>{cardDescription}</p>
          <a className="ask-cine-cta" href={primaryHref}>{primaryLabel}<ArrowUpRight size={18} aria-hidden="true"/></a>
          <a className="ask-cine-secondary" href={secondaryHref}>{secondaryLabel}<ArrowRight size={15} aria-hidden="true"/></a>
        </div>
        <div className="ask-cine-scene">
          <div ref={deviceRef} className="ask-cine-phone" aria-label="Illustrative mobile interface preview">
            <div className="ask-cine-phone-side ask-cine-phone-volume" aria-hidden="true"/>
            <div className="ask-cine-phone-side ask-cine-phone-power" aria-hidden="true"/>
            <div className="ask-cine-screen">
              <span className="ask-cine-island" aria-hidden="true"/>
              <div className="ask-cine-screen-heading">
                <div><small>ASK INTROS</small><strong>Your next connection</strong></div>
                <span className="ask-cine-profile"><Fingerprint size={18} aria-hidden="true"/></span>
              </div>
              <div className="ask-cine-screen-ring" aria-label={metricValue+" "+metricLabel}>
                <svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="66" fill="none" stroke="#323844" strokeWidth="11"/>
                  <circle cx="90" cy="90" r="66" fill="none" stroke="#EF6868" strokeWidth="11"
                    strokeLinecap="round" strokeDasharray="414" strokeDashoffset="105"
                    transform="rotate(-90 90 90)"/></svg>
                <span><strong>{metricValue}</strong><small>{metricLabel}</small></span>
              </div>
              <div className="ask-cine-phone-step"><span className="ask-cine-step-icon"><CircleDot size={18}/></span>
                <span><b>Share a real need</b><small>Make your intent clear</small></span><Check size={15} className="ask-cine-step-check"/></div>
              <div className="ask-cine-phone-step"><span className="ask-cine-step-icon"><Users size={18}/></span>
                <span><b>Find relevant people</b><small>Understand the connection</small></span></div>
              <div className="ask-cine-phone-step"><span className="ask-cine-step-icon"><Handshake size={18}/></span>
                <span><b>Request an introduction</b><small>Mutual consent comes first</small></span></div>
              <div className="ask-cine-phone-caption">Illustrative experience · not member data</div>
              <span className="ask-cine-home-indicator" aria-hidden="true"/>
            </div>
          </div>
          <div className="ask-cine-glass-badge ask-cine-badge-top"><span><Users size={20}/></span><div>
            <strong>Connections with context</strong><small>Know why someone matters</small>
          </div></div>
          <div className="ask-cine-glass-badge ask-cine-badge-bottom"><span><ShieldCheck size={20}/></span><div>
            <strong>Consent first</strong><small>People choose to connect</small>
          </div></div>
        </div>
      </article>
    </ShineBorder>
    <footer className="ask-cine-footer" data-cine-reveal>
      <span>WHY ME &nbsp; / &nbsp; WHY THEM &nbsp; / &nbsp; WHY NOW</span>
      <h3>{ctaHeading}</h3>
    </footer>
  </section>;
}
export default CinematicHero;
