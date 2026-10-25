import type { ExperienceView } from './preference';
import './workspace-controls.css';

export function CompactExperienceSwitch({ value, onChange }: { value: ExperienceView; onChange: (view: ExperienceView) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label="Business view"
      aria-checked={value === 'business'}
      className="compact-experience-switch"
      data-view={value}
      onClick={() => onChange(value === 'social' ? 'business' : 'social')}
    >
      <span aria-hidden="true">Social</span>
      <span aria-hidden="true">Business</span>
    </button>
  );
}
