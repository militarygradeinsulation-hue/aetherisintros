import { useMemo, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { ArrowLeft, ArrowUpRight, Loader2 } from 'lucide-react'
import { Btn, Eyebrow } from '../ui'
import { newsAge, type NewsItem } from '../news'
import { askNewsPerspective, readNewsArticle, type ArticleRead } from '../../lib/newsReader.functions'
import { useQuery } from '@tanstack/react-query'

const VIEWS: { label: string; question: string }[] = [
  { label: 'The other side', question: 'What is the strongest counterargument to the framing in this article?' },
  { label: 'What a skeptic sees', question: 'What would a careful skeptic question or doubt here, and what evidence is missing?' },
  { label: 'The operator view', question: 'How would an operator running a company read this, and what would they do differently on Monday?' },
  { label: 'Second-order effects', question: 'What are the likely second-order consequences over the next year if this holds?' },
  { label: 'Who this affects', question: 'Which kinds of people, roles and industries are most affected by this, and how?' },
  { label: 'What to watch', question: 'What specific signals would confirm or break this story over the coming months?' },
  { label: 'Worth a conversation?', question: 'What is a sharp, non-generic conversation opener a CEO could send someone about this?' },
]

export function NewsReader({ item, onBack }: { item: NewsItem; onBack: () => void }) {
  const read = useServerFn(readNewsArticle)
  const perspective = useServerFn(askNewsPerspective)
  const [views, setViews] = useState<{ label: string; question: string; answer: string }[]>([])
  const [pending, setPending] = useState<string | null>(null)
  const [custom, setCustom] = useState('')

  const { data, isLoading, isError } = useQuery<ArticleRead>({
    queryKey: ['news-read', item.id],
    queryFn: () => read({
      data: {
        title: item.title,
        link: item.link,
        source: item.source,
        published: item.published,
        image: item.image,
        feedSummary: item.summary,
      },
    }),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const basis = useMemo(() => {
    const body = data?.paragraphs?.join('\n\n') ?? ''
    return body.trim() ? body : `${item.summary}\n\n${data?.summary ?? ''}`
  }, [data, item.summary])

  async function ask(label: string, question: string) {
    if (pending) return
    setPending(label)
    const result = await perspective({ data: { title: item.title, source: item.source, text: basis, question } })
    setViews(prev => [{ label, question, answer: result.answer }, ...prev])
    setPending(null)
  }

  return <article className="reader">
    <button className="reader-back" onClick={onBack}><ArrowLeft size={13} /> Back to the feed</button>

    <header className="reader-head">
      <div className="reader-meta">
        <Eyebrow signal={item.kind === 'aetheris'}>{item.source}</Eyebrow>
        <span>{item.category}</span>
        <span>{newsAge(item.published)}</span>
      </div>
      <h1>{item.title}</h1>
      {item.image && <div className="reader-image"><img src={item.image} alt="" loading="lazy" /></div>}
    </header>

    <section className="module reader-brief">
      <p className="reader-label">WHAT THIS SAYS</p>
      {isLoading && <p className="sv-empty"><Loader2 size={13} className="spin" /> Reading the article…</p>}
      {!isLoading && data?.summary && <p className="reader-summary">{data.summary}</p>}
      {!isLoading && !data?.summary && <p className="sv-empty">{item.summary || 'No summary is available for this piece yet.'}</p>}
      {!!data?.keyPoints?.length && <ul className="reader-points">
        {data.keyPoints.map(point => <li key={point}>{point}</li>)}
      </ul>}
      {data?.whyItMatters && <div className="reader-matters">
        <p className="reader-label signal">WHY IT MATTERS</p>
        <p>{data.whyItMatters}</p>
      </div>}
      {data?.error === 'missing-key' && <p className="sv-empty">Summaries need the intelligence service configured on this account.</p>}
    </section>

    <section className="module reader-views">
      <p className="reader-label">READ IT FROM ANOTHER ANGLE</p>
      <p className="reader-note">Pick a view and Ask Intros answers from the article itself, separating what it says from what it implies.</p>
      <div className="reader-chips">
        {VIEWS.map(view => <button
          key={view.label}
          disabled={!!pending}
          onClick={() => ask(view.label, view.question)}
        >{pending === view.label ? 'Thinking…' : view.label}</button>)}
      </div>
      <form className="reader-ask" onSubmit={e => { e.preventDefault(); const q = custom.trim(); if (!q) return; setCustom(''); void ask('Your question', q) }}>
        <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Ask your own question about this piece…" aria-label="Ask a question about this article" />
        <Btn kind="secondary" disabled={!!pending || !custom.trim()} onClick={() => { const q = custom.trim(); if (!q) return; setCustom(''); void ask('Your question', q) }}>Ask</Btn>
      </form>
      {!!views.length && <div className="reader-answers">
        {views.map((view, index) => <div key={`${view.label}-${index}`} className="reader-answer">
          <p className="reader-label">{view.label.toUpperCase()}</p>
          <p className="reader-question">{view.question}</p>
          <p>{view.answer}</p>
        </div>)}
      </div>}
    </section>

    <footer className="reader-foot">
      {data?.partial && <p className="sv-empty">The publisher limits full-text reading, so this view is built from the feed summary.</p>}
      <a className="news-link" href={item.link} target="_blank" rel="noreferrer">Open the original at {item.source} <ArrowUpRight size={13} /></a>
    </footer>

    {!isLoading && !data?.partial && !!data?.paragraphs?.length && <section className="module reader-body">
      <p className="reader-label">THE ARTICLE</p>
      {data.paragraphs.map((para, index) => <p key={index}>{para}</p>)}
    </section>}

    {isError && <section className="module"><p className="sv-empty">This article could not be opened. Use the original link above.</p></section>}
  </article>
}

export default NewsReader
