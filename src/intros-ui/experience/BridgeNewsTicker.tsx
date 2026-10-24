import { useAetherisNews } from '@/aetheris/news';
export function BridgeNewsTicker({ onOpen }: { onOpen: () => void }) {
  const { data } = useAetherisNews();
  const items = (data?.items ?? []).slice(0, 8);
  if (!items.length) return null;
  return <button onClick={onOpen} className="commons-news" aria-label="Open news headlines">
    <strong>IN THE KNOW</strong><div>{items.map((n: any) => n.title).join('  ·  ')}</div>
  </button>;
}
