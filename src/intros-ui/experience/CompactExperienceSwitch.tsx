import type { ExperienceView } from './preference';
import './workspace-controls.css';
export function CompactExperienceSwitch({value,onChange}:{value:ExperienceView;onChange:(view:ExperienceView)=>void}){
 return <select className="compact-experience-switch" aria-label="Social or Business view" value={value} onChange={e=>onChange(e.target.value as ExperienceView)}><option value="social">Social</option><option value="business">Business</option></select>;
}
