import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FeedContainer = createContext<HTMLDivElement | null>(null);

/** Keep one canonical live feed mounted while unchanged Bridge slots come and go. */
export function BridgeFeedProvider({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = document.createElement('div');
    node.className = 'bridge-canonical-feed';
    setContainer(node);
    return () => node.remove();
  }, []);
  return <FeedContainer.Provider value={container}>{children}</FeedContainer.Provider>;
}

export function BridgeFeedSlot({ active }: { active: boolean }) {
  const container = useContext(FeedContainer);
  const slot = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const target = slot.current;
    if (!active || !container || !target) return;
    target.appendChild(container);
    return () => { if (container.parentNode === target) container.remove(); };
  }, [active, container]);
  return <div ref={slot} className="bridge-feed-slot" />;
}

export function PersistentBridgeFeed({ children }: { children: ReactNode }) {
  const container = useContext(FeedContainer);
  return container ? createPortal(children, container) : null;
}
