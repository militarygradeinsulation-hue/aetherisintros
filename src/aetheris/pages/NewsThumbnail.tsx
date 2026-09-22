import { useEffect, useState } from 'react'
import { newsImageSrc, useResolvedNewsImage, type NewsItem } from '../news'

function markFor(item: NewsItem) {
  return item.title
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 2)
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase() || 'AI'
}

export function NewsThumbnail({ item, large = false }: { item: NewsItem; large?: boolean }) {
  const resolved = useResolvedNewsImage(item)
  const src = newsImageSrc(resolved)
  const [failed, setFailed] = useState(false)

  useEffect(() => { setFailed(false) }, [src])

  const showImage = Boolean(src) && !failed

  return <div className={`news-thumbnail ${large ? 'large' : ''} ${showImage ? 'has-image' : 'is-fallback'}`}>
    {showImage && <img src={src ?? ''} alt="" loading="lazy" onError={() => setFailed(true)} />}
    {!showImage && <div className="news-thumbnail-fallback" aria-hidden="true">
      <span>{item.source}</span>
      <strong>{markFor(item)}</strong>
      <small>{item.category}</small>
    </div>}
  </div>
}
