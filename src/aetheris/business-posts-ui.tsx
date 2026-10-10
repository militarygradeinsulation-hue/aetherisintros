/**
 * Composer, badge, facts and contextual action for Need / Offer / Proof of work posts. Posting goes
 * through the existing `addPost` (persisted by `savePost`); the action opens the existing private
 * message thread with the author and never sends anything on the member's behalf.
 */
import { useEffect, useId, useState } from 'react'
import { CircleDot, ExternalLink, MessageSquareText } from 'lucide-react'

import {
  BUSINESS_CATEGORIES, BUSINESS_CURRENCIES, BUSINESS_KINDS, LIMITS, businessAction, businessFacts, canAct, isBusinessKind,
  validateBusinessDraft, type BusinessDraft, type FeedLane, type BusinessErrors, type BusinessKind,
} from './business-posts'
import { useNav } from './nav'
import type { Member, Post } from './social'
import { useNetwork } from './store'
import { Btn } from './ui'

const emptyDraft: BusinessDraft = { title: '', description: '', category: '', budgetMin: '', budgetMax: '', startingPrice: '', currency: '', deadline: '', availability: '', geography: '', links: '' }

export function BusinessBadge({ kind }: { kind: string }) {
  if (!isBusinessKind(kind)) return null
  return <span className={`signal-badge biz-badge biz-${kind.toLowerCase().replace(/\s+/g, '-')}`}>{kind}</span>
}

export function BusinessComposer() {
  const net = useNetwork()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<BusinessKind>('Need')
  const [draft, setDraft] = useState<BusinessDraft>(emptyDraft)
  const [errors, setErrors] = useState<BusinessErrors>({})
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const failed = (event: Event) => {
      if (!isBusinessKind((event as CustomEvent<{ kind?: string }>).detail?.kind)) return
      setNote({ tone: 'error', text: 'Your post could not be saved to the network. Check your connection and try again.' })
    }
    window.addEventListener('aetheris:post-failed', failed)
    return () => window.removeEventListener('aetheris:post-failed', failed)
  }, [])

  const set = (key: keyof BusinessDraft) => (event: { target: { value: string } }) => setDraft(current => ({ ...current, [key]: event.target.value }))
  const field = (key: keyof BusinessDraft, label: string, input: React.ReactNode) => {
    const fid = `${id}-${key}`
    return <div className="biz-field"><label htmlFor={fid}>{label}</label>{input}{errors[key] && <small id={`${fid}-err`} className="biz-error" role="alert">{errors[key]}</small>}</div>
  }
  const attrs = (key: keyof BusinessDraft) => ({ id: `${id}-${key}`, 'aria-invalid': errors[key] ? true : undefined, 'aria-describedby': errors[key] ? `${id}-${key}-err` : undefined })

  const submit = () => {
    const result = validateBusinessDraft(kind, draft)
    if (!result.ok) { setErrors(result.errors); setNote({ tone: 'error', text: 'Fix the highlighted fields and try again.' }); return }
    setErrors({})
    net.addPost(result.title, result.description, [], 'network', kind, result.details)
    setDraft(emptyDraft); setOpen(false); setNote({ tone: 'ok', text: `${kind} posted to your network.` })
  }

  return <section className="biz-composer social-composer" aria-label="Post a Need, Offer or Proof of work">
    <div className="signal-type-row" role="group" aria-label="Business post type">
      {BUSINESS_KINDS.map(item => <button key={item} type="button" aria-pressed={open && kind === item} className={open && kind === item ? 'active' : ''}
        onClick={() => { setKind(item); setErrors({}); setNote(null); setOpen(true) }}>{item === 'Proof of work' ? 'Share proof of work' : `Post a ${item}`}</button>)}
    </div>
    {open && <form className="social-composer-body biz-form" noValidate onSubmit={event => { event.preventDefault(); submit() }}>
      {field('title', 'Title', <input {...attrs('title')} value={draft.title} maxLength={LIMITS.titleMax} onChange={set('title')} placeholder={kind === 'Need' ? 'What do you need?' : kind === 'Offer' ? 'What are you offering?' : 'What did you deliver?'} />)}
      {field('description', 'Description', <textarea {...attrs('description')} rows={4} value={draft.description} maxLength={LIMITS.descriptionMax} onChange={set('description')} placeholder="Context, scope and what a useful response looks like. Do not include private information." />)}
      {field('category', 'Category', <select {...attrs('category')} value={draft.category} onChange={set('category')}><option value="">Choose a category</option>{BUSINESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>)}
      {kind === 'Need' && <>
        <div className="biz-row">
          {field('budgetMin', 'Budget from (optional)', <input {...attrs('budgetMin')} inputMode="decimal" value={draft.budgetMin} onChange={set('budgetMin')} />)}
          {field('budgetMax', 'Budget up to (optional)', <input {...attrs('budgetMax')} inputMode="decimal" value={draft.budgetMax} onChange={set('budgetMax')} />)}
        </div>
        {field('deadline', 'Deadline (optional)', <input {...attrs('deadline')} type="date" value={draft.deadline} onChange={set('deadline')} />)}
      </>}
      {kind === 'Offer' && <>
        {field('startingPrice', 'Starting price (optional)', <input {...attrs('startingPrice')} inputMode="decimal" value={draft.startingPrice} onChange={set('startingPrice')} />)}
        {field('availability', 'Availability (optional)', <input {...attrs('availability')} value={draft.availability} maxLength={LIMITS.short} onChange={set('availability')} placeholder="e.g. Taking new work from March" />)}
      </>}
      {kind !== 'Proof of work' && field('currency', 'Currency (needed with an amount)', <select {...attrs('currency')} value={draft.currency} onChange={set('currency')}><option value="">—</option>{BUSINESS_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select>)}
      {kind === 'Proof of work' && field('links', 'Portfolio links (https, one per line)', <textarea {...attrs('links')} rows={3} value={draft.links} onChange={set('links')} placeholder="https://" />)}
      {field('geography', 'Geography (optional)', <input {...attrs('geography')} value={draft.geography} maxLength={LIMITS.short} onChange={set('geography')} placeholder="e.g. Toronto, or remote within the EU" />)}
      <footer><Btn kind="quiet" onClick={() => { setOpen(false); setErrors({}) }}>Cancel</Btn><button type="submit" className="btn primary">Post {kind}</button></footer>
    </form>}
    {note && <small className={`signal-note${note.tone === 'error' ? ' biz-error' : ''}`} role={note.tone === 'error' ? 'alert' : 'status'}>{note.text}</small>}
  </section>
}

/** Facts and portfolio links under a business post's copy. Renders nothing for ordinary posts. */
export function BusinessDetailsView({ post }: { post: Post }) {
  const facts = businessFacts(post.kind, post.business)
  if (!facts.length && !post.business?.links?.length) return null
  return <div className="biz-details">
    {facts.length > 0 && <dl>{facts.map(f => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}
    {post.business?.links?.length ? <ul className="biz-links" aria-label="Portfolio links">{post.business.links.map(link => <li key={link}><a href={link} target="_blank" rel="noopener noreferrer nofollow"><ExternalLink size={13} aria-hidden /> {link.replace(/^https:\/\//, '')}</a></li>)}</ul> : null}
  </div>
}

/** Respond / request a quote / contact. Opens the member's private thread; the member writes the message. */
export function BusinessActionButton({ post, member }: { post: Post; member: Member | undefined }) {
  const net = useNetwork(); const nav = useNav()
  const action = businessAction(post.kind)
  if (!action || !canAct(post, member)) return null
  const done = net.postResponses.includes(post.id)
  return <button type="button" className="biz-action" onClick={() => { const thread = net.respondToPost(post.id, post.memberId); if (thread) nav.goToThread(thread) }}>
    <MessageSquareText size={16} aria-hidden />{done ? action.doneLabel : action.label}
  </button>
}

/** Loading, error and empty states for the feed. Shown only when no card is visible. */
export function FeedEmpty({ lane, hasAny }: { lane: FeedLane; hasAny: boolean }) {
  const net = useNetwork()
  if (!net.synced) return <section className="social-empty" role="status" aria-live="polite" aria-busy="true"><CircleDot size={22} aria-hidden /><h2>Loading your feed…</h2></section>
  if (net.feedError && !hasAny) return <section className="social-empty" role="alert"><CircleDot size={22} aria-hidden /><h2>The feed could not be loaded.</h2><p>Check your connection and reload the page. Your own posts are safe.</p></section>
  const business = lane === 'NEEDS' || lane === 'OFFERS' || lane === 'PROOF OF WORK'
  return <section className="social-empty"><CircleDot size={22} aria-hidden /><h2>{hasAny ? (business ? `No ${lane.toLowerCase()} posted yet.` : 'Nothing in this category yet.') : 'Your Signal Feed is ready.'}</h2>
    <p>{hasAny ? (business ? 'Post one above, or switch back to all Signals.' : 'Switch back to all Signals, or share one of your own in this category.') : 'Share what you are building, looking for, or able to help with. Relevant member Signals will appear here as the network grows.'}</p></section>
}
