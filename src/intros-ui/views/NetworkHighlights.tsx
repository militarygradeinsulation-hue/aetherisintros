import { useEffect, useRef, useState } from 'react';
import { Bookmark, Heart, Pause, Play } from 'lucide-react';
import { useNetwork } from '@/aetheris/store';
import { JournalMedia } from '@/aetheris/journal-media';
import type { JournalAttachment } from '@/aetheris/social';
import type { FeedPost } from '@/intros-ui/networkData';
import './network-highlights.css';
import { MemberThumbnail } from '../components/shared/MemberThumbnail';

interface Highlight {
  id: string; authorId: string; name: string; role: string; text: string;
  when: string; kind: string; liked: boolean; saved: boolean;
  media?: JournalAttachment[] | undefined;
  image?: FeedPost['image'] | undefined;
}

/** Presentation only: all live records and writes stay in the canonical provider. */
export function NetworkHighlights({ live, posts, active, onReadFeed, onOpenAuthor, onLikePost, onSavePost }: {
  live: boolean; posts: FeedPost[]; active: boolean;
  onReadFeed: () => void; onOpenAuthor: (id: string) => void;
  onLikePost: (id: string) => void; onSavePost: (id: string) => void;
}) {
  const net = useNetwork();
  const root = useRef<HTMLElement>(null);
  useEffect(() => { if (!active) root.current?.querySelectorAll('video').forEach(video => video.pause()); }, [active]);
  const [paused, setPaused] = useState(false);
  const [columns, setColumns] = useState(1);
  useEffect(() => {
    if (!paused && active) root.current?.querySelector('.network-marquee-window')?.scrollTo({ top: 0 });
  }, [paused, active]);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 900px)');
    const update = () => setColumns(query.matches ? 2 : 1);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const items: Highlight[] = live ? net.posts.filter(post => post.visibility !== 'private').slice(0, 12).map(post => {
    const member = net.members.find(member => member.id === post.memberId);
    const own = post.memberId === 'me';
    return {
      id: post.id, authorId: post.memberId,
      name: own ? net.profile.name || 'You' : member?.name || 'Member',
      role: own ? net.profile.title : [member?.title, member?.company].filter(Boolean).join(' · '),
      text: [post.text, post.detail].filter(Boolean).join('\n'), when: post.when, kind: post.kind,
      liked: net.likedPosts.includes(post.id), saved: net.saved.includes(post.id), media: post.media?.slice(0, 1),
    };
  }) : posts.slice(0, 12).map(post => ({
    id: post.id, authorId: post.authorId, name: post.authorName,
    role: [post.authorTitle, post.authorCompany].filter(Boolean).join(' · '), text: post.content,
    image: post.image, when: post.timeAgo, kind: post.badge || 'Update', liked: !!post.isLiked, saved: !!post.isSaved,
  }));
  const unavailable = live && (net.feedError || !!net.networkLoadError);
  const loading = live && !net.synced;
  const groups = columns === 2 && items.length > 1
    ? [items.filter((_, i) => i % 2 === 0), items.filter((_, i) => i % 2 !== 0)] : [items];
  const card = (post: Highlight) => <article className="network-highlight-card" data-post-id={post.id} key={post.id}>
    <header><button type="button" className="network-highlight-author" onClick={() => onOpenAuthor(post.authorId)}>
      <MemberThumbnail name={post.name} source={live ? post.authorId === 'me' ? net.profile.avatarUrl : net.members.find(member => member.id === post.authorId)?.avatarUrl : undefined}/>
      <span><strong>{post.name}</strong><small>{post.role}</small></span>
    </button><span className="network-highlight-kind">{post.kind}</span></header>
    <p>{post.text}</p>
    <JournalMedia media={post.media}/>
    {post.image && <img className="ledger-post-photo" src={post.image.src} alt={post.image.alt} loading="lazy"/>}
    <footer><time>{post.when}</time><div>
      <button type="button" aria-pressed={post.liked} onClick={() => live ? net.togglePostLike(post.id) : onLikePost(post.id)}><Heart size={14} aria-hidden="true"/>{post.liked ? 'Liked' : 'Like'}</button>
      <button type="button" aria-pressed={post.saved} onClick={() => live ? net.toggleSave(post.id, 'this post') : onSavePost(post.id)}><Bookmark size={14} aria-hidden="true"/>{post.saved ? 'Saved' : 'Save'}</button>
    </div></footer>
  </article>;
  return <section ref={root} className="network-highlights" aria-label="Network highlights" data-paused={paused || !active}>
    <header className="network-highlights-heading"><div><h2>Network highlights</h2><p>{live ? 'Updates from your member feed.' : 'Showcase posts · interactions stay in this session.'}</p></div><div>
      <button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={14}/> : <Pause size={14}/>} {paused ? 'Resume highlights' : 'Pause highlights'}</button>
      <button type="button" onClick={onReadFeed}>Read full feed</button>
    </div></header>
    {unavailable || loading || !items.length ? <p className="network-highlights-empty" role="status">{unavailable ? 'Highlights are unavailable. Open the feed to retry the connection.' : loading ? 'Loading your member feed…' : 'No shared posts yet. Open the feed to write the first update.'}</p> : <div className="network-marquee-window" tabIndex={0} aria-label="Scrolling posts; focus or hover to pause. Use Pause highlights to keep still.">
      <div className="network-marquee-columns">{groups.map((group, i) => <div className="network-marquee-column" key={i}>
        <div className="network-marquee-track" data-reverse={i % 2 === 1} data-static={group.length < 2}>
          <div className="network-marquee-group">{group.map(post => card(post))}</div>
        </div>
      </div>)}</div>
      <span className="network-marquee-fade top" aria-hidden="true"/><span className="network-marquee-fade bottom" aria-hidden="true"/>
    </div>}
  </section>;
}
