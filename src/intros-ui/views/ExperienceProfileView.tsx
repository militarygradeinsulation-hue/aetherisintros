import type { ComponentProps } from 'react';
import type { ActivePage } from '../components/layout/TopNavigation';
import type { ExperienceView } from '../experience/preference';
import { CommonsProfileView } from '../../bridge-reference/src/intros-ui/views/CommonsProfileView';
import { ProfileDetailView } from './ProfileDetailView';

/** Presentation switches retain the existing profile controller and member record. */
export function ExperienceProfileView({ experience, ...props }: Omit<ComponentProps<typeof CommonsProfileView>, 'onNavigate'> & { experience: ExperienceView; onNavigate: (page: ActivePage, id?: string) => void }) {
  return <><div hidden={experience !== 'social'}><CommonsProfileView {...props}/></div><div hidden={experience === 'social'}><ProfileDetailView {...props}/></div></>;
}
