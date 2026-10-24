import { BriefcaseBusiness, Users } from "lucide-react";
import type { ExperienceView } from "./preference";
export function ExperienceSwitch({
  value,
  onChange,
}: {
  value: ExperienceView;
  onChange: (value: ExperienceView) => void;
}) {
  return (
    <div className="experience-switch" role="group" aria-label="Ask Intros visual view">
      <button type="button" aria-pressed={value === "social"} onClick={() => onChange("social")}>
        <Users size={16} aria-hidden="true" /> Social
      </button>
      <button
        type="button"
        aria-pressed={value === "business"}
        onClick={() => onChange("business")}
      >
        <BriefcaseBusiness size={16} aria-hidden="true" /> Business
      </button>
    </div>
  );
}
