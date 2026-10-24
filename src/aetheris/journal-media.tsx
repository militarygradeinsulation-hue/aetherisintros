import { PdfPreviewButton } from './documents/PdfPreviewButton'
import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { journalUrl } from './live';
import type { JournalAttachment } from './social';

function JournalFile({ item }: { item: JournalAttachment }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    void journalUrl(item.path).then(resolved => { if (active) setUrl(resolved) })
    return () => { active = false }
  }, [item.path])

  if (item.kind === 'image') {
    return <figure className="journal-image">{url ? <img src={url} alt={item.name} loading="lazy" /> : <span>{item.name}</span>}</figure>
  }
  if (item.kind === 'video') {
    return <figure className="journal-video">{url
      ? <video src={url} controls preload="metadata" playsInline><track kind="captions" /></video>
      : <span>{item.name}</span>}</figure>
  }
  if (url && (item.mime === 'application/pdf' || /\.pdf$/i.test(item.name))) return <PdfPreviewButton url={url} name={item.name} />
  return <a className="journal-doc" href={url ?? undefined} target="_blank" rel="noreferrer">
    <FileText size={15} /><span>{item.name}</span><small>{Math.max(1, Math.round(item.size / 1024))} KB</small>
  </a>
}

export function JournalMedia({ media }: { media?: JournalAttachment[] | undefined }) {
  if (!media?.length) return null
  const images = media.filter(m => m.kind === 'image')
  const rest = media.filter(m => m.kind !== 'image')
  return <div className="journal-media">
    {images.length > 0 && <div className={`journal-gallery count-${Math.min(images.length, 4)}`}>{images.map(item => <JournalFile key={item.path} item={item} />)}</div>}
    {rest.map(item => <JournalFile key={item.path} item={item} />)}
  </div>
}

