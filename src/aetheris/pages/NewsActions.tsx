import { useState } from 'react'
import { BookmarkPlus, Check, Clock, Send } from 'lucide-react'
import { useNetwork } from '../store'
import { useNewsShelf } from '../newsShelf'
import type { NewsItem } from '../news'

/** Read later, Save to library and Send to network for one article. */
export function NewsActions({ item, compact }: { item: NewsItem; compact?: boolean }) {
  const shelf = useNewsShelf()
  const net = useNetwork()
  const [sent, setSent] = useState(false)

  const later = shelf.has('later', item.id)
  const saved = shelf.has('library', item.id)

  function send() {
    if (sent) return
    const detail = [
      item.summary,
      `Source: ${item.source}`,
      item.link,
    ].filter(Boolean).join('\n\n')
    net.addPost(item.title, detail, [], 'network')
    setSent(true)
  }

  return <div className={`news-acts${compact ? ' compact' : ''}`}>
    <button className={later ? 'on' : ''} onClick={() => shelf.toggle('later', item)} title="Read later">
      {later ? <Check size={12} /> : <Clock size={12} />} {later ? 'Saved to read later' : 'Read later'}
    </button>
    <button className={saved ? 'on' : ''} onClick={() => shelf.toggle('library', item)} title="Save to library">
      {saved ? <Check size={12} /> : <BookmarkPlus size={12} />} {saved ? 'In your library' : 'Save to library'}
    </button>
    <button className={sent ? 'on' : ''} onClick={send} title="Share this with your network">
      {sent ? <Check size={12} /> : <Send size={12} />} {sent ? 'Sent to your network' : 'Send to network'}
    </button>
  </div>
}

export default NewsActions
