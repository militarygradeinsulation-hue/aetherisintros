import type { ComponentProps } from 'react';
import type { ExperienceView } from '../experience/preference';
import { CommonsProfileView } from './CommonsProfileView';
import { ProfileDetailView } from './ProfileDetailView';

/** Presentation switches retain the existing profile controller and member record. */
export function ExperienceProfileView({ experience, ...props }: ComponentProps<typeof CommonsProfileView> & { experience: ExperienceView }) {
  return <><div hidden={experience !== 'social'}><CommonsProfileView {...props}/></div><div hidden={experience === 'social'}><ProfileDetailView {...props}/></div></>;
}
