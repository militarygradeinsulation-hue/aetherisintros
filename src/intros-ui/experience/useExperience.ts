import { useEffect, useState } from "react";
import { readExperience, saveExperience, type ExperienceView } from "./preference";

/** Presentation only: never keys or remounts member providers or active pages. */
export function useExperience() {
  const [experience, setExperience] = useState<ExperienceView>("business");
  useEffect(() => {
    try {
      setExperience(readExperience(window.localStorage));
    } catch {
      /* Storage may be blocked. */
    }
    return () => {
      delete document.documentElement.dataset["experience"];
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset["experience"] = experience;
  }, [experience]);
  const chooseExperience = (next: ExperienceView) => {
    setExperience(next);
    try {
      saveExperience(window.localStorage, next);
    } catch {
      /* Keep the in-memory selection. */
    }
  };
  useEffect(() => {
    const choose = (event: Event) => { const view = (event as CustomEvent<unknown>).detail; if (view === 'social' || view === 'business') chooseExperience(view); };
    window.addEventListener('ask-intros:experience', choose);
    return () => window.removeEventListener('ask-intros:experience', choose);
  }, []);
  return { experience, chooseExperience };
}
