import { useState } from 'react';
import { Pause, Play, Newspaper } from 'lucide-react';
import { useAetherisNews } from '@/aetheris/news';
import './news-ticker.css';

/** Publisher headlines from the same canonical feed as Business news. */
export function NewsTicker({ onOpenNews }: { onOpenNews: () => void }) {
  const { data, isPending, isError } = useAetherisNews();
  const [paused, setPaused] = useState(false);
  const items = (data?.items ?? []).slice(0, 10);
  return <section className="workspace-news" aria-label="Business headlines" data-paused={paused}>
    <button type="button" className="workspace-news-label" onClick={onOpenNews}><Newspaper size={15}/> News</button>
    {items.length ? <>
      <div className="workspace-news-window" tabIndex={0} aria-label="Headlines; hover or focus to pause">
        <div className="workspace-news-track">{[0, 1].map(copy => <div className="workspace-news-group" key={copy} aria-hidden={copy === 1 || undefined}>
          {items.map(item => <button type="button" key={item.id} tabIndex={copy ? -1 : 0} onClick={onOpenNews}><span>{item.source}</span>{item.title}</button>)}
        </div>)}</div>
      </div>
      <button type="button" className="workspace-news-toggle" aria-label={paused ? 'Resume headlines' : 'Pause headlines'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={14}/> : <Pause size={14}/>}</button>
    </> : <span className="workspace-news-status" role="status">{isPending ? 'Loading headlines…' : isError ? 'Headlines unavailable. Open News to retry.' : 'No headlines available.'}</span>}
  </section>;
}
