import { ArrowLeft, ArrowRight, BookOpen, Menu, Quote } from 'lucide-react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import logoAsset from '@/assets/aetheris-logo.jpg.asset.json'
import josephPortraitAsset from '@/assets/portraits/member-joseph.jpg.asset.json'
import '@/aetheris/styles.css'

type Chapter = {
  title: string
  paragraphs: string[]
}

const chapters: Chapter[] = [
  {
    title: 'Why I Built Aetheris',
    paragraphs: [
      'Aetheris did not begin with a software idea. It began with a life spent inside complicated situations, carrying responsibility, absorbing consequences, and being expected to find a way through them.',
      'Everything is connected. Every decision creates a consequence. Every failure has an origin. Every breakdown leaves evidence. What remains hidden does not remain inactive.',
    ],
  },
  {
    title: 'Growing Up With Service, Faith, and Responsibility',
    paragraphs: [
      'Leadership was never supposed to be a title. It meant carrying responsibility for what happened to others.',
      'Family, loyalty, usefulness, truth, and responsibility became standards — not abstractions, but measures for how a person should act when the outcome affects someone else.',
    ],
  },
  {
    title: 'Where the Operator Mindset Began',
    paragraphs: [
      'My service in the U.S. Marine Corps included an Iraq deployment and work across communications, military police, logistics support, strategic operations, and personnel readiness. At one point, that responsibility extended to roughly 200 Marines.',
      'The enduring lesson was practical: information is only useful if it reaches the right person, at the right time, in a form they can act on. Data without timing, context, and responsibility is not intelligence.',
    ],
  },
  {
    title: 'The Mission Ended. The Consequences Did Not.',
    paragraphs: [
      'I was wounded during deployment. I remained with the team and completed the mission. The service-connected consequences lasted beyond the mission itself.',
      'That experience made one principle impossible to ignore: when evidence is scattered, truth can remain functionally invisible. Systems must preserve what people cannot carry mentally forever.',
    ],
  },
  {
    title: 'Education Gave Me More Ways to Understand the Evidence',
    paragraphs: [
      'I studied psychology, marketing, AI engineering, machine learning, Python, neural networks, business systems, and software development — including IBM AI Engineering and developer education, and Harvard edX AI coursework.',
      'Psychology helped explain people. Marketing explained demand. Ownership explained consequences. Technology explained systems. AI created a way to connect evidence at scale.',
    ],
  },
  {
    title: 'Fatherhood Under Pressure',
    paragraphs: [
      'Fatherhood brought a different kind of operational pressure. My children faced serious health procedures, including open-heart surgery, a jaw extraction related to breathing, lip surgery, and eye conditions. There were periods of moving between hospital rooms and the field.',
      'The lesson was not about endurance for its own sake. Founders and operators are not machines. A system that requires people to destroy themselves to maintain it is a concealed failure.',
    ],
  },
  {
    title: 'Running Companies Changed the Meaning of Business Problems',
    paragraphs: [
      'My work crossed telecom, technology, homebuilding, design, advertising, construction, insulation, marketing, business analysis, manufacturing, ecommerce, distribution, CRM architecture, automation, consulting, cryptocurrency, and AI.',
      'I founded and operated construction businesses, managed as many as 60 employees, grew companies into the millions, and exited them. That work taught me the difference between talking about business and carrying one — between observing a problem and being responsible for payroll, quality, customers, timing, and consequences.',
    ],
  },
  {
    title: 'Seeing Value Move at Digital Speed',
    paragraphs: [
      'I participated in cryptocurrency projects operating at several-hundred-million-dollar scale. The scale changed, but the underlying laws did not.',
      'Large numbers do not eliminate structural weakness. Speed accelerates consequences. Transparency of transactions does not equal transparency of leadership.',
    ],
  },
  {
    title: 'What I Saw Across Industries',
    paragraphs: [
      'Across more than 100 small-business marketing environments — and larger CRM, ecommerce, manufacturing, and distribution environments — the same pattern kept appearing: companies bought more leads when follow-up was the real failure, and departments operated from fragmented versions of the truth.',
      'In one environment, the evidence included 957 duplicate HubSpot company records, 157 workflows, and 87 inactive workflows. The numbers mattered because they exposed the operating condition beneath them. Leadership cannot correct what it cannot see clearly.',
    ],
  },
  {
    title: 'Being Valued for the Result but Not the Person',
    paragraphs: [
      'I saw organizations want the strategy, systems, automation, intellectual property, analysis, architecture, speed, and results while minimizing the value or ownership of the person who created them.',
      'That experience sharpened the need for evidence, attribution, ownership, documentation, and traceable outcomes. Good work should not become invisible simply because the result is useful.',
    ],
  },
  {
    title: 'More Than 300 Systems Built',
    paragraphs: [
      'I have built more than 300 systems, tools, applications, workflows, automations, and AI-enabled operating components.',
      'The hardest part is rarely adding another feature. It is knowing whether the feature belongs in the system, whether it addresses the real cause, and whether it gives the operator a clearer decision rather than another thing to maintain.',
    ],
  },
  {
    title: 'Becoming a Top 10 Percent Lovable Developer',
    paragraphs: [
      'I approached development as an operator first and then as a builder. Through volume, consistency, and complexity, I reached the top 10 percent of developers on Lovable.',
      'The distinction mattered because the work was not an exercise in producing screens. It was a way to turn operational experience into working software.',
    ],
  },
  {
    title: 'Loss Did Not Arrive One Event at a Time',
    paragraphs: [
      'Across recent years, I lost my father, my sister, my best friend, and a beloved family animal. Those losses are part of this story, but they are not presented here as spectacle.',
      'Grief changed the meaning of time. It reinforced something I had already learned through systems and service: hidden conditions still create measurable outcomes, whether or not anyone is ready to name them.',
    ],
  },
  {
    title: 'Why I Kept Building',
    paragraphs: [
      'I did not want to build another founder-dependent company, another disconnected tool, or another report that described problems but left the owner carrying the burden.',
      'I wanted something that connects evidence, protects the operator, preserves truth, and keeps working when the person carrying the company is tired, injured, overwhelmed, grieving, or absent.',
    ],
  },
  {
    title: 'The Pattern Became the Method',
    paragraphs: [
      'Military service, injury, the VA, fatherhood, construction, telecommunications, psychology, marketing, CRM, automation, cryptocurrency, AI, system-building, grief, and exploitation all became evidence.',
      'Across different environments, they pointed toward the same discipline: business forensics — the practice of connecting what happened, why it happened, what it affected, and what must happen next.',
    ],
  },
  {
    title: 'Why Aetheris Uses Forensic Language',
    paragraphs: [
      'Case file. Evidence. Findings. Exposure. Root cause. Investigation. Remediation. Recovery. Verification.',
      'This language is deliberate. Forensics begins with evidence and the reconstruction of what actually happened. It resists convenient assumptions and asks the system to account for its outcomes.',
    ],
  },
  {
    title: 'What Operator Means to Me',
    paragraphs: [
      'An operator is responsible for what happens next.',
      'Technology provides speed, scale, correlation, and memory. The operator provides judgment, context, leadership, protection, and accountability. Aetheris is designed to strengthen that responsibility, not replace it.',
    ],
  },
  {
    title: 'Why This Is Personal',
    paragraphs: [
      'Revenue leakage is not an abstract metric. It represents payroll, equipment, medical bills, projects, margin, and time with family.',
      'The point is not software. The point is protecting what the operator is sacrificing to build.',
    ],
  },
  {
    title: 'The Mandate',
    paragraphs: [
      'Aetheris exists to turn scattered business chaos into clear decisions, cleaner systems, and measurable action.',
      'The relationship network carries the same mandate: understand who matters, why they matter, and why now — then preserve the context required to act with judgment.',
    ],
  },
]

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
      <Link to="/" className="brand-mark" aria-label="Aetheris Intros Home">
        <img className="brand-logo" src={logoAsset.url} alt="Aetheris Intros logo" />
        <span className="brand-name">Aetheris<em>Intros</em></span>
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
          <span>AETHERIS INTROS</span>
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
        {chapters.map((chapter, index) => <section id={`chapter-${index + 1}`} className="founder-chapter" key={chapter.title}>
          <header><span>CHAPTER {String(index + 1).padStart(2, '0')}</span><i /></header>
          <h2>{chapter.title}</h2>
          {chapter.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          {index < chapters.length - 1 && <a className="founder-next" href={`#chapter-${index + 2}`}>Continue to chapter {String(index + 2).padStart(2, '0')} <ArrowRight size={14} /></a>}
        </section>)}

        <footer className="founder-closing">
          <Quote size={24} />
          <blockquote>“Find what is hidden.<br />Prove what is real.<br />Fix what is broken.<br />Verify the recovery.<br />Then build the system that keeps it from happening again.”</blockquote>
          <span>JOSEPH TONEY · FOUNDER, AETHERIS</span>
          <Link to="/" className="btn primary">Return to Aetheris Intros <ArrowRight size={14} /></Link>
        </footer>
      </article>
    </div>
  </main>
}