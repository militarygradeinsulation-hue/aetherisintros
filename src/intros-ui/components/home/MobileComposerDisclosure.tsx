import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronUp, PenLine, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Presentation only: the existing composer stays mounted with its own state. */
export function MobileComposerDisclosure({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const body = useRef<HTMLDivElement>(null);
  const open = () => {
    setExpanded(true);
    requestAnimationFrame(() => body.current?.querySelector<HTMLElement>('textarea, input:not([type="file"]), .social-composer-start button')?.focus({ preventScroll: true }));
  };
  useEffect(() => {
    window.addEventListener('intros:dashboard-compose', open);
    return () => window.removeEventListener('intros:dashboard-compose', open);
  }, []);
  return <div className="mobile-composer-disclosure" data-expanded={expanded}>
    <Button variant="ghost" className="mobile-composer-trigger" aria-expanded={expanded} aria-controls={id}
      onClick={() => expanded ? setExpanded(false) : open()}>
      <span className="mobile-composer-symbol"><PenLine size={18} /></span>
      <span>{expanded ? 'Keep draft, close editor' : 'Share an update'}</span>
      {expanded ? <ChevronUp size={17} /> : <Plus size={17} />}
    </Button>
    <div id={id} ref={body} className="mobile-composer-content">{children}</div>
  </div>;
}