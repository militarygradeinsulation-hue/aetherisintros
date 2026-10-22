import './executive-page-parity.css'
import { useCallback, useEffect, useState } from 'react'
import { Bookmark, BookmarkCheck, Lock } from 'lucide-react'
import { actOnExchange, exchangeKinds, listExchange, publishExchange, type ExchangeDraft, type ExchangeOpportunity } from '../exchange-client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useNav } from '../nav'
import { Eyebrow } from '../ui'
import { rpc, SignInRequired, useSessionUser } from './useSessionUser'

const isoDay = (d: Date) => d.toISOString().slice(0, 10)
const blank = (): ExchangeDraft => ({
  title: '', objective: '', kind: 'Partnership', whatIsNeeded: '', whatIsOffered: '', mutualValue: '',
  expiresOn: isoDay(new Date(Date.now() + 30 * 864e5)), visibility: 'network',
})

/** Client-side mirror of the publish rules; the database remains the authority. */
export function validateExchangeDraft(d: ExchangeDraft, now = new Date()): string | null {
  if (d.title.trim().length < 3 || d.title.trim().length > 140) return 'Title must be 3–140 characters.'
  if (d.objective.trim().length < 3 || d.objective.trim().length > 2000) return 'Objective must be 3–2000 characters.'
  if (!(exchangeKinds as readonly string[]).includes(d.kind)) return 'Choose a kind.'
  if (!d.whatIsNeeded.trim() || !d.whatIsOffered.trim() || !d.mutualValue.trim()) return 'Fill in needed, offered and mutual value.'
  if (d.visibility !== 'network' && d.visibility !== 'private') return 'Choose visibility.'
  const today = isoDay(now), max = isoDay(new Date(now.getTime() + 90 * 864e5))
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.expiresOn) || d.expiresOn <= today || d.expiresOn > max) return 'Closing date must be within the next 90 days.'
  return null
}

export function OpportunityExchangePage() {
  const { userId, ready } = useSessionUser()
  if (!ready) return <section className="executive-section aetheris-parity"><p className="og-note parity-empty">Loading…</p></section>
  if (!userId) return <div className="aetheris-parity"><SignInRequired what="the Opportunity Exchange" /></div>
  return <ExchangePanel userId={userId} />
}

function ExchangePanel({ userId }: { userId: string }) {
  const nav = useNav()
  const [items, setItems] = useState<ExchangeOpportunity[]>([])
  const [tier, setTier] = useState<'basic' | 'executive' | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [interestFor, setInterestFor] = useState<ExchangeOpportunity | null>(null)
  const [interestNote, setInterestNote] = useState('')
  const [draft, setDraft] = useState<ExchangeDraft>(blank)

  const refresh = useCallback(async () => {
    try { setItems(await listExchange()); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load opportunities') }
  }, [])
  useEffect(() => {
    void refresh()
    void rpc('my_membership_tier').then(r => setTier(r.data === 'executive' ? 'executive' : 'basic'))
  }, [refresh])

  const run = async (task: () => Promise<unknown>, ok: string) => {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try { await task(); setNotice(ok); await refresh() }
    catch (e) { setError(e instanceof Error ? e.message : 'Action failed') }
    finally { setBusy(false) }
  }
  const field = <K extends keyof ExchangeDraft>(k: K) => (e: { target: { value: string } }) => setDraft(d => ({ ...d, [k]: e.target.value }))

  return <section className="executive-section aetheris-parity" aria-label="Opportunity Exchange">
    <header className="parity-head"><div>
    <Eyebrow>OPPORTUNITY EXCHANGE</Eyebrow>
    <h2>Real opportunities, shared with people who can act.</h2>
    <p className="og-note">Browse what members need and offer. Express interest privately; the owner decides what happens next.</p>
    </div></header>
    {error && <p role="alert" className="og-note">{error}</p>}
    {notice && <p role="status" className="og-note">{notice}</p>}

    <Tabs defaultValue="browse">
      <TabsList><TabsTrigger value="browse">Browse</TabsTrigger><TabsTrigger value="publish">Publish</TabsTrigger></TabsList>

      <TabsContent value="browse">
        {!items.length && <p className="og-note parity-empty">No opportunities are published yet.</p>}
        <div className="parity-grid">
          {items.map(o => {
            const mine = o.ownerId === userId
            return <article key={o.id} className="module parity-texture">
              <div className="parity-actions">
                <Badge className="parity-badge" variant="outline">{o.kind}</Badge><Badge className="parity-badge" variant={o.status === 'open' ? 'default' : 'secondary'}>{o.status}</Badge>
                {o.saved && <BookmarkCheck size={14} aria-label="Saved" />}
              </div>
              <h3>{o.title}</h3>
              <small className="og-note">{mine ? 'You' : 'Network member'} · closes {o.expiresOn}</small>
              <p>{o.objective}</p>
              <p><strong>Needed:</strong> {o.whatIsNeeded}</p>
              <p><strong>Offered:</strong> {o.whatIsOffered}</p>
              <p><strong>Mutual value:</strong> {o.mutualValue}</p>
              <div className="parity-actions">
                {mine ? <>
                  {o.status === 'open' && <span className="og-note">{o.interest.length} interested</span>}
                  {o.status !== 'closed' && <Button className="btn secondary" size="sm" variant="outline" disabled={busy} onClick={() => void run(() => actOnExchange(o.id, 'close'), 'Opportunity closed.')}>Close</Button>}
                </> : <>
                  <Button className="btn secondary" size="sm" variant="outline" disabled={busy} onClick={() => void run(() => actOnExchange(o.id, o.saved ? 'unsave' : 'save'), o.saved ? 'Removed from saved.' : 'Saved.')}>
                    <Bookmark size={13} /> {o.saved ? 'Unsave' : 'Save'}</Button>
                  <Button className="btn primary" size="sm" disabled={busy || o.status !== 'open'} onClick={() => { setInterestFor(o); setInterestNote('') }}>Express interest</Button>
                </>}
              </div>
            </article>
          })}
        </div>
      </TabsContent>

      <TabsContent value="publish">
        {tier === null && <p className="og-note">Checking membership…</p>}
        {tier === 'basic' && <article className="module parity-texture">
          <Eyebrow><Lock size={13} /> EXECUTIVE ONLY</Eyebrow>
          <p className="og-note">Publishing opportunities is available to Executive members.</p>
          <Button className="btn primary" onClick={() => nav.setPage('membership')}>Apply for Executive</Button>
        </article>}
        {tier === 'executive' && <form className="module" onSubmit={e => {
          e.preventDefault()
          const problem = validateExchangeDraft(draft)
          if (problem) { setError(problem); return }
          void run(async () => { await publishExchange({ ...draft, title: draft.title.trim() }); setDraft(blank()) }, 'Opportunity published.')
        }}>
          <label>Title<Input value={draft.title} maxLength={140} onChange={field('title')} required /></label>
          <label>Objective<Textarea value={draft.objective} maxLength={2000} onChange={field('objective')} required /></label>
          <label>Kind
            <select className="w-full rounded-md border bg-transparent p-2" value={draft.kind} onChange={field('kind')}>
              {exchangeKinds.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label>What is needed<Textarea value={draft.whatIsNeeded} onChange={field('whatIsNeeded')} required /></label>
          <label>What is offered<Textarea value={draft.whatIsOffered} onChange={field('whatIsOffered')} required /></label>
          <label>Mutual value<Textarea value={draft.mutualValue} onChange={field('mutualValue')} required /></label>
          <fieldset style={{ display: 'flex', gap: 16 }}><legend>Visibility</legend>
            {(['network', 'private'] as const).map(v => <label key={v}><input type="radio" name="visibility" checked={draft.visibility === v} onChange={() => setDraft(d => ({ ...d, visibility: v }))} /> {v === 'network' ? 'Network' : 'Private'}</label>)}
          </fieldset>
          <label>Closing date<Input type="date" value={draft.expiresOn} min={isoDay(new Date(Date.now() + 864e5))} max={isoDay(new Date(Date.now() + 90 * 864e5))} onChange={field('expiresOn')} required /></label>
          <Button className="btn primary" type="submit" disabled={busy}>Publish opportunity</Button>
        </form>}
      </TabsContent>
    </Tabs>

    <Dialog open={!!interestFor} onOpenChange={o => { if (!o) setInterestFor(null) }}>
      <DialogContent className="aetheris-parity !border-[var(--line-dark)] !bg-[var(--raised)] !text-[var(--soft)] !rounded-xl">
        <DialogHeader><DialogTitle>Interest in “{interestFor?.title}”</DialogTitle>
          <DialogDescription>Only the owner sees your note.</DialogDescription></DialogHeader>
        <Textarea value={interestNote} onChange={e => setInterestNote(e.target.value)} aria-label="Interest note" placeholder="Why you are a fit (at least 12 characters)" />
        <DialogFooter>
          <Button className="btn secondary" variant="outline" onClick={() => setInterestFor(null)}>Cancel</Button>
          <Button className="btn primary" disabled={busy || interestNote.trim().length < 12} onClick={() => { const o = interestFor!; setInterestFor(null); void run(() => actOnExchange(o.id, 'interest', interestNote.trim()), 'Interest sent.') }}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
}
