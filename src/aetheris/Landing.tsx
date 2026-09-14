import logoAsset from '@/assets/aetheris-logo.jpg.asset.json'
import { ArrowRight, Eye, LockKeyhole, Network } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import landingPortraitAsset from '@/assets/aetheris-home-portrait.jpg.asset.json'

import overviewFilmAsset from '@/assets/aetheris-intros-overview.mp4.asset.json'
import introVideoAsset from '@/assets/aetheris-intro-video.mp4.asset.json'
import { isLiveMember, useAccess } from './access'

/**
 * Public front page. A signed-in member never sees the marketing page or any
 * showcase entry point: they are handed straight to their real network.
 */
export default function Landing() {
  const { access } = useAccess()
  const navigate = useNavigate()
  const member = isLiveMember(access)
  useEffect(() => {
    if (!access.loading && member) navigate({ to: '/app', replace: true })
  }, [access.loading, member, navigate])
  if (member) return <main className="landing landing-handoff"><p>Opening your network…</p></main>
  return <LandingPage signedIn={access.signedIn} />
}

function LandingPage({ signedIn }: { signedIn: boolean }) {
  const showDemo = !signedIn
  const demoBtn = (label: string, cls: string) => showDemo
    ? <Link to="/demo" className={cls}>{label} <ArrowRight size={15} /></Link>
    : null
  const accountBtn = (cls: string) => <Link to={signedIn ? '/app' : '/early-access'} className={cls}>{signedIn ? 'Enter your network' : 'Create an account'}</Link>
  return <main className="landing"><header className="landing-nav"><div className="brand-mark"><img className="brand-logo" src={logoAsset.url} alt="Aetheris Intros logo" /><span className="brand-name">Aetheris<em>Intros</em></span></div><nav><a href="#film">Watch</a><a href="#method">Method</a><a href="#intelligence">Intelligence</a></nav>{demoBtn('Demo the system', 'btn primary') ?? accountBtn('btn primary')}</header><section className="landing-hero"><div className="landing-copy"><span className="folio">WHY ME · WHY THEM · WHY NOW</span><h1>Aetheris<br/><em>Intros</em></h1><h2>Real business networking.<br/>No selling. No spam.</h2><p>A place where professionals and quiet intelligence work cohesively. Aetheris understands people, context, trust, timing and what you are trying to move—then helps you make the right introduction for both sides.</p><div className="landing-actions">{demoBtn('Demo the system', 'btn primary')}{accountBtn(showDemo ? 'btn ghost' : 'btn primary')}<span>{showDemo ? 'Explore freely. Join to use it for real.' : 'Real people. Real context. Real introductions.'}</span></div></div><div className="landing-visual"><img src={landingPortraitAsset.url} alt="A professional in quiet thought beside hard window light" width={597} height={804}/><div className="portrait-caption"><span>PEOPLE × CONTEXT × OPPORTUNITY</span><p>More context. Better introductions. Stronger outcomes.</p></div><div className="blueprint-cross">+</div></div></section><section className="landing-film" id="film"><div className="landing-film-copy"><span>WATCH FIRST</span><h2>See how Aetheris Intros works.</h2><p>A short walk through the platform: how context is captured, how the right people surface at the right time, and how introductions happen with both sides agreeing.</p><ul><li>Why me, why them, why now—explained, never guessed</li><li>Double opt-in introductions, never cold outreach</li><li>Memory that keeps relationships alive between conversations</li></ul><div className="landing-actions">{demoBtn('Demo the system', 'btn primary')}{accountBtn(showDemo ? 'btn ghost' : 'btn primary')}</div></div><div className="landing-film-videos"><figure><video src={overviewFilmAsset.url} controls preload="metadata" playsInline poster={landingPortraitAsset.url}><track kind="captions"/></video><figcaption>Platform overview · 2 min</figcaption></figure><figure><video src={introVideoAsset.url} controls preload="metadata" playsInline><track kind="captions"/></video><figcaption>Aetheris Intros · from the founder</figcaption></figure></div></section><section className="landing-intelligence" id="intelligence"><div className="editorial-statement"><span>THE PREMISE</span><h2>A network should protect your attention.</h2><p>No mass outreach, paid access to your inbox or engagement bait. Aetheris surfaces a relationship only when relevance, mutual value and timing justify the conversation.</p></div><div className="landing-preview"><header><span><i/>INTELLIGENCE LIVE</span><small>Private by default</small></header><div className="preview-graph"><div className="preview-origin"><Eye size={18}/></div>{['Mina','Adrian','Nolan','Celeste'].map((x,i)=><span className={`preview-node n${i+1}`} key={x}><i/>{x}</span>)}</div><footer><div><span>STRONGEST SIGNAL</span><strong>Mina Park · 86</strong></div><ArrowRight size={18}/></footer></div></section><section className="landing-method" id="method"><header><span>THE INTROS METHOD</span><h2>From need to trusted action.</h2></header><div>{['Diagnose','Map','Score','Connect','Compound'].map((x,i)=><article key={x}><span>0{i+1}</span><h3>{x}</h3><p>{['Clarify the outcome before searching for people.','Build a living graph of context and trust.','Rank mutual value, timing and credibility.','Recommend the smallest intelligent next move.','Let every conversation improve the memory.'][i]}</p></article>)}</div></section><section className="landing-close"><Network size={22}/><h2>{showDemo ? <>Explore the complete system first.<br/><em>Create an account when you are ready to use it for real.</em></> : <>Your account is ready.<br/><em>Real people. Real context. Real introductions.</em></>}</h2><div className="landing-close-actions">{demoBtn('Open the demo', 'btn primary')}{accountBtn(showDemo ? 'btn ghost' : 'btn primary')}</div></section><footer className="landing-foot"><div className="brand-mark"><img className="brand-logo" src={logoAsset.url} alt="Aetheris Intros logo" /><span className="brand-name">Aetheris<em>Intros</em></span></div><span><LockKeyhole size={12}/>No spam. No selling your attention. Private by default.</span><span>© 2026 Aetheris</span></footer></main>
}
