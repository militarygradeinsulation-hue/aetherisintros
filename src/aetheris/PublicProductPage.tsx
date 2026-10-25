import { Link } from '@tanstack/react-router'
import { AskIntrosLockup } from './AskIntrosLockup'
import { AppearanceToggle } from './AppearanceToggle'
import { PublicStructuredData } from './PublicStructuredData'
import { publicProductPages, type PublicProductPage as Page } from './public-product-content'
import './public-product-page.css'

export function PublicProductPage({ page }: { page: Page }) {
  return <main className="public-product-page">
    <PublicStructuredData path={page.path} title={page.title} description={page.description} />
    <a className="public-product-skip" href="#product-explanation">Skip to explanation</a>
    <header className="public-product-header">
      <Link to="/" aria-label="Ask Intros home"><AskIntrosLockup variant="compact" /></Link>
      <div><AppearanceToggle /><Link to="/demo">Explore the demo</Link></div>
    </header>
    <article id="product-explanation">
      <nav className="public-product-breadcrumb" aria-label="Breadcrumb"><Link to="/">Ask Intros</Link><span aria-hidden="true">/</span><span>{page.path === '/how-it-works' ? 'How it works' : page.path === '/warm-introductions' ? 'Warm introductions' : 'Active Memory'}</span></nav>
      <p className="public-product-kicker">WHY ME. WHY THEM. WHY NOW.</p>
      <h1>{page.heading}</h1>
      <p className="public-product-summary">{page.summary}</p>
      {page.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map(text => <p key={text}>{text}</p>)}</section>)}
      <section className="public-product-questions" aria-labelledby="product-questions"><h2 id="product-questions">Common questions</h2>
        {page.questions.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
      </section>
      <aside className="public-product-next"><h2>Explore Ask Intros</h2><p>See the interface, read the membership options, or create your profile.</p><div><Link to="/demo">Explore the demo</Link><Link to="/early-access">Membership options</Link><Link to="/auth" search={{ mode: 'signup' }}>Create an account</Link></div></aside>
    </article>
    <footer><nav aria-label="Learn about Ask Intros">{publicProductPages.filter(item => item.path !== page.path).map(item => <Link key={item.path} to={item.path}>{item.path === '/how-it-works' ? 'How it works' : item.path === '/warm-introductions' ? 'Warm introductions' : 'Active Memory'}</Link>)}<Link to="/founder-story">Founder story</Link></nav><Link to="/">Ask Intros</Link></footer>
  </main>
}
