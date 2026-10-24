"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import "./cinematic-entrance.css";

export interface CinematicEntranceProps { videoSrc: string; /** Fires only when the intro finishes or is skipped. */ onComplete?: () => void }


/** Full-screen, muted autoplay introduction on every homepage arrival; always skippable. */
export function CinematicEntrance({ videoSrc, onComplete }: CinematicEntranceProps) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const endedRef = useRef(false);
  const callbackRef = useRef(onComplete);
  callbackRef.current = onComplete;
  const finish = React.useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setExiting(true);
    window.setTimeout(() => { setVisible(false); callbackRef.current?.(); }, 450);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      endedRef.current = true;
      setVisible(false);
      return;
    }
    endedRef.current = false;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const playback = video.play();
    if (playback && typeof playback.catch === "function") playback.catch(() => { /* fallback below */ });
    // If silent autoplay cannot begin, never leave visitors blocked by the overlay.
    const fallback = window.setTimeout(() => { if (!video || video.currentTime < .1) finish(); }, 9000);
    const maximum = window.setTimeout(finish, 30000);
    const stop = () => { window.clearTimeout(fallback); window.clearTimeout(maximum); video.pause(); };
    return stop;
  }, [videoSrc, finish]);

  if (!visible) return null;
  return <div className={"ask-cinematic-entrance" + (exiting ? " is-exiting" : "")}
    role="region" aria-label="Ask Intros introduction film">
    <video ref={videoRef} src={videoSrc} autoPlay playsInline muted preload="auto"
      onEnded={finish} onError={finish} disablePictureInPicture
      aria-label="Ask Intros introduction film">
      <track kind="captions" />
    </video>
    <div className="ask-cinematic-entrance-shade" aria-hidden="true" />
    <div className="ask-cinematic-entrance-title">
      <span>ASK INTROS</span>
      <h2>Each Connection Matters.</h2>
    </div>
    <button className="ask-cinematic-entrance-skip" type="button" onClick={finish}>Skip intro <span aria-hidden="true">↗</span></button>
  </div>;
}
export default CinematicEntrance;
