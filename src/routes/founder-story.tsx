import { ArrowLeft, ArrowRight, BookOpen, Menu, Quote } from 'lucide-react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import logoAsset from '@/assets/aetheris-logo.jpg.asset.json'
import josephPortraitAsset from '@/assets/portraits/member-joseph.jpg.asset.json'
import { founderStoryChapters as chapters } from '@/aetheris/founder-story-content'
import '@/aetheris/styles.css'

const MIN_PARAGRAPH_LENGTH = 240
const MAX_PARAGRAPH_LENGTH = 620

/**
 * The supplied manuscript intentionally stores many sentence-length beats as
 * separate entries. Join adjacent beats into book paragraphs at render time;
 * the source text, sequence, chapter boundaries and wording remain untouched.
 */
function flowBookParagraphs(paragraphs: string[]) {
  const flowed: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    const sentence = paragraph.trim()
    if (!sentence) continue
    const nextLength = current ? current.length + sentence.length + 1 : sentence.length

    if (current && (current.length >= MIN_PARAGRAPH_LENGTH || nextLength > MAX_PARAGRAPH_LENGTH)) {
      flowed.push(current)
      current = sentence
    } else {
      current = current ? `${current} ${sentence}` : sentence
    }
  }

  if (current) flowed.push(current)
  return flowed
}

export const Route = createFileRoute('/founder-story')({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: 'The Architect Behind the Operator — Aetheris' },
      { name: 'description', content: 'Why Joseph Toney built Aetheris: a founder case file about evidence, responsibility, systems, and what operators carry.' },
      { property: 'og:title', content: 'The Architect Behind the Operator — Aetheris' },
      { property: 'og:description', content: 'Why Joseph Toney built Aetheris—and why everything leaves evidence.' },
      { property: 'og:type', content: 'article' },
      { property: 'og:url', content: 'https://intros.today/founder-story' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: 'https://intros.today/founder-story' }],
  }),
  component: FounderStoryPage,
})

function FounderStoryPage() {
  const [chaptersOpen, setChaptersOpen] = useState(false)

  return <main className="founder-book">
    <header className="founder-book-bar">
      <Link to="/" className="brand-mark" aria-label="Ask Intros Home">
        <img className="brand-logo" src={logoAsset.url} alt="Ask Intros logo" />
        <span className="brand-name">Ask<em>Intros</em></span>
      </Link>
      <span>FOUNDER CASE FILE · 2026</span>
      <Link to="/" className="founder-back"><ArrowLeft size={14} /> Home</Link>
    </header>

    <section className="founder-cover">
      <div className="founder-cover-copy">
        <span className="founder-folio">AETHERIS / ORIGIN FILE 001</span>
        <p className="founder-tagline">Everything leaves evidence.</p>
        <h1>The Architect<br /><em>Behind the Operator</em></h1>
        <h2>Why I Built Aetheris</h2>
        <p className="founder-byline">Joseph Toney · Founder, Aetheris · Chaos Theory Forensics Operator</p>
        <div className="founder-positioning">
          <span>ASK INTROS</span>
          <strong>The Relationship Network for CEOs.</strong>
          <p>Who matters. Why they matter. Why now.</p>
        </div>
      </div>
      <figure className="founder-cover-portrait" data-person-portrait="founder-joseph" data-portrait-primary="true">
        <img src={josephPortraitAsset.url} alt="Joseph Toney, founder of Aetheris" width={1024} height={1280} />
        <figcaption><span>WHY ME / EVIDENCE 001</span><p>A founder story about responsibility, evidence, and building systems that protect the operator.</p></figcaption>
      </figure>
    </section>

    <section className="founder-preface">
      <span>BEFORE THE SOFTWARE</span>
      <blockquote>“Before Aetheris was software, it was a lifetime of learning how people, systems, pressure, failure, and responsibility connect.”</blockquote>
      <p>This is not a vanity biography. It is the evidence behind why Aetheris exists, how its operating principles were formed, and why its work begins with what is real.</p>
    </section>

    <button className="founder-chapter-toggle" type="button" onClick={() => setChaptersOpen(value => !value)} aria-expanded={chaptersOpen} aria-controls="founder-chapters">
      <Menu size={16} /> {chaptersOpen ? 'Close chapter index' : 'Open chapter index'}
    </button>

    <div className="founder-reader">
      <nav className={chaptersOpen ? 'founder-chapters open' : 'founder-chapters'} id="founder-chapters" aria-label="Book chapters">
        <header><BookOpen size={16} /><span>CHAPTER INDEX</span></header>
        <ol>{chapters.map((chapter, index) => <li key={chapter.title}>
          <a href={`#chapter-${index + 1}`} onClick={() => setChaptersOpen(false)}><span>{String(index + 1).padStart(2, '0')}</span>{chapter.title}</a>
        </li>)}</ol>
      </nav>

      <article className="founder-manuscript">
        {chapters.map((chapter, index) => {
          const chapterNumber = String(index + 1).padStart(2, '0')
          const bookParagraphs = flowBookParagraphs(chapter.paragraphs)
          return <section id={`chapter-${index + 1}`} className="founder-chapter" key={chapter.title}>
            <header className="founder-chapter-opening">
              <span>CHAPTER {chapterNumber}</span>
              <i />
              <h2>{chapter.title}</h2>
            </header>
            <div className="founder-prose">
              {bookParagraphs.map((paragraph, paragraphIndex) => <p key={`${index}-${paragraphIndex}`}>{paragraph}</p>)}
            </div>
            <footer className="founder-page-folio">
              <span>AETHERIS / ORIGIN FILE 001</span>
              <b>{chapterNumber}</b>
            </footer>
            {index < chapters.length - 1 && <a className="founder-next" href={`#chapter-${index + 2}`}>Continue to chapter {String(index + 2).padStart(2, '0')} <ArrowRight size={14} /></a>}
          </section>
        })}

        <footer className="founder-closing">
          <Quote size={24} />
          <blockquote>“Find what is hidden.<br />Prove what is real.<br />Fix what is broken.<br />Verify the recovery.<br />Then build the system that keeps it from happening again.”</blockquote>
          <span>JOSEPH TONEY · FOUNDER, AETHERIS</span>
          <Link to="/" className="btn primary">Return to Ask Intros <ArrowRight size={14} /></Link>
        </footer>
      </article>
    </div>
  </main>
}