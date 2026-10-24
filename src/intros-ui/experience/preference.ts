export type ExperienceView = "social" | "business";
export const EXPERIENCE_KEY = "ask-intros.experience.v1";
export function readExperience(storage: Pick<Storage, "getItem">): ExperienceView {
  try {
    return storage.getItem(EXPERIENCE_KEY) === "social" ? "social" : "business";
  } catch {
    return "business";
  }
}
export function saveExperience(storage: Pick<Storage, "setItem">, value: ExperienceView) {
  try {
    storage.setItem(EXPERIENCE_KEY, value);
  } catch {
    /* Optional device preference. */
  }
}
