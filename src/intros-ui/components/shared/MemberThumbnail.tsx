import { AvatarImage } from '@/aetheris/avatar';
import { memberPhotoSource } from '@/aetheris/member-media';
import './member-thumbnail.css';

/** Initials remain underneath while an actual member photo loads, or if it fails. */
export function MemberThumbnail({ name, source, className = '' }: {
  name: string; source?: string | null | undefined; className?: string;
}) {
  const photo = memberPhotoSource(source);
  const initials = name.trim().split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase() || '?';
  return <span className={`member-thumbnail ${className}`} role="img" aria-label={name || 'Member'}>
    {initials}
    {photo && <AvatarImage key={photo} source={photo} alt="" width={72} height={72}/>}
  </span>;
}
