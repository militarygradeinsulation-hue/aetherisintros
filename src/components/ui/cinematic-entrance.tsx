"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import "./cinematic-entrance.css";

// Film from the supplied MetroHero; the site keeps its automatic, bounded entrance.
export const CITY_OPENING_VIDEO = "https://cdn.21st.dev/assets/mirror/21/21a77eac28eacbb7e142016eefeaa0b4a766619e51113629a3bc6df6af066c0f.mp4";
export interface CinematicEntranceProps { videoSrc: string; onComplete?: () => void }
export const MINIMUM_ENTRANCE_MS = 8000;
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function CinematicEntrance({ videoSrc, onComplete }: CinematicEntranceProps) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mediaFailed, setMediaFailed] = useState(false);
  const startedAt = useRef(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);
  const endedRef = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onComplete);
  callbackRef.current = onComplete;
  const finish = React.useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setExiting(true);
    exitTimer.current = setTimeout(() => { setVisible(false); callbackRef.current?.(); }, 450);
  }, []);
  const finishAutomatically = React.useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    const remaining = Math.max(1800, MINIMUM_ENTRANCE_MS - (Date.now() - startedAt.current));
    holdTimer.current = setTimeout(finish, remaining);
  }, [finish]);
  useEffect(() => {
    if (!mediaFailed) return;
    const tick = window.setInterval(() => setProgress(clamp((Date.now() - startedAt.current) / MINIMUM_ENTRANCE_MS)), 100);
    return () => window.clearInterval(tick);
  }, [mediaFailed]);
  useEffect(() => {
    startedAt.current = Date.now();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      endedRef.current = true;
      setVisible(false);
      callbackRef.current?.();
      return;
    }
    endedRef.current = false;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.playbackRate = 0.8;
    const playback = video.play();
    playback?.catch(() => { /* The timeout and Skip remain available if autoplay is denied. */ });
    const fallback = window.setTimeout(() => { if (video.currentTime < .1) finish(); }, 9000);
    const maximum = window.setTimeout(finish, 30000);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') finish(); };
    window.addEventListener('keydown', escape);
    return () => {
      window.clearTimeout(fallback); window.clearTimeout(maximum);
      if (exitTimer.current) clearTimeout(exitTimer.current);
      if (holdTimer.current) clearTimeout(holdTimer.current);
      window.removeEventListener('keydown', escape);
      video.pause();
    };
  }, [videoSrc, finish]);
  if (!visible) return null;
  const title = 1 - clamp(progress / .35);
  const tagline = clamp((progress - .82) / .18);
  return <div className={"ask-cinematic-entrance" + (exiting ? " is-exiting" : "")}
    role="region" aria-label="Ask Intros introduction film">
    <video ref={videoRef} src={videoSrc} autoPlay playsInline muted preload="auto"
      style={{ transform: `scale(${1 + progress * .06})` }}
      onTimeUpdate={event => { const video = event.currentTarget; if (Number.isFinite(video.duration) && video.duration > 0) setProgress(clamp(video.currentTime / video.duration)); }}
      onEnded={() => { setProgress(1); finishAutomatically(); }}
      onError={() => { setMediaFailed(true); finishAutomatically(); }} disablePictureInPicture aria-label="Ask Intros introduction film">
      <track kind="captions" />
    </video>
    <div className="ask-cinematic-entrance-shade" aria-hidden="true" />
    <div className="ask-cinematic-entrance-opening" style={{ opacity: title, transform: `translateY(${(1-title)*-24}px) scale(${.96+title*.04})`, filter: `blur(${(1-title)*10}px)` }}><h2>ASK INTROS</h2></div>
    <div className="ask-cinematic-entrance-title" style={{ opacity: tagline, transform: `translateY(${(1-tagline)*20}px) scale(${.97+tagline*.03})`, filter: `blur(${(1-tagline)*8}px)` }}>
      <h2>Each Connection Matters.</h2><span>ASK INTROS</span>
    </div>
    <div className="ask-cinematic-entrance-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
    <button className="ask-cinematic-entrance-skip" type="button" onClick={finish}>Skip intro <span aria-hidden="true">↗</span></button>
  </div>;
}
export default CinematicEntrance;
