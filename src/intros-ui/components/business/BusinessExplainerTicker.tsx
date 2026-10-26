import './business-explainer-ticker.css'

/** Plain-language summary of the Business tools, shown as a slow scrolling line. */
const PHRASES = [
  'place to meet people who can actually help your business',
  'way to get warm introductions instead of cold emails',
  'simple CRM to keep track of your contacts and deals',
  'pipeline that shows which deals need your attention next',
  'private room to work on a deal with the other side',
  'reminder system so good relationships never go quiet',
  'marketplace to post what you need and offer what you do best',
  'meeting helper that prepares you before every call',
  'trusted list of providers recommended by real members',
  'home for referrals you give and receive',
] as const

export function BusinessExplainerTicker() {
  const items = PHRASES.map(p => <span key={p} className="bx-ticker-item">{p}<i aria-hidden="true">•</i></span>)
  return <section className="bx-ticker" aria-label="What Ask Intros is">
    <strong className="bx-ticker-label">Ask Intros is a:</strong>
    <div className="bx-ticker-window">
      <div className="bx-ticker-track">
        <div className="bx-ticker-run">{items}</div>
        <div className="bx-ticker-run" aria-hidden="true">{items}</div>
      </div>
    </div>
  </section>
}
