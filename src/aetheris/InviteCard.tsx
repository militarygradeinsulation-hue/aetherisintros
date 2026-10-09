import { useEffect, useState } from 'react'
import { BadgeCheck, Copy, Link2, Share2, Users } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { myInviteCode, useAccess } from './access'

interface Referral { member_id: string; name: string; joined_at: string; approved: boolean; verified: boolean }

/**
 * The member's personal invite link, and who has joined with it. Whoever joins with it lands
 * in both networks.
 */
export function InviteCard() {
  const { access } = useAccess()
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState<'link' | 'code' | ''>('')
  const [referrals, setReferrals] = useState<Referral[]>([])
  useEffect(() => {
    if (!access.signedIn || access.status !== 'approved') return
    void myInviteCode().then(setCode).catch(() => setCode(''))
    void (supabase.rpc as unknown as (fn: string) => Promise<{ data: Referral[] | null }>)('my_referrals')
      .then(r => setReferrals(r.data ?? [])).catch(() => setReferrals([]))
  }, [access.signedIn, access.status])
  if (!code) return null
  const link = `${window.location.origin}/invite/${code}`
  const copy = (what: 'link' | 'code') => { void navigator.clipboard?.writeText(what === 'link' ? link : code); setCopied(what) }
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const share = () => void navigator.share({
    title: 'Join me on Ask Intros',
    text: 'I use Ask Intros for introductions between owners and CEOs. Here is my invite:',
    url: link,
  }).catch(() => undefined)
  const verified = referrals.filter(r => r.verified).length
  return <section className="module invite-card">
    <header><div><span className="eyebrow">YOUR PERSONAL INVITE</span><h3>Bring someone in. You join each other’s network.</h3></div></header>
    <p className="invite-copy">When they create an account with your link or code, you are connected both ways automatically.</p>
    <div className="invite-row"><Link2 size={14} /><span className="invite-value">{link}</span>
      {canShare && <button className="text-action" onClick={share}><Share2 size={13} /> Share</button>}
      <button className="text-action" onClick={() => copy('link')}><Copy size={13} /> {copied === 'link' ? 'Copied' : 'Copy link'}</button></div>
    <div className="invite-row"><span className="invite-label">CODE</span><span className="invite-value">{code}</span>
      <button className="text-action" onClick={() => copy('code')}><Copy size={13} /> {copied === 'code' ? 'Copied' : 'Copy code'}</button></div>
    {referrals.length > 0 && <div className="invite-referrals">
      <p><Users size={13} /> <b>{referrals.length}</b> joined with your invite{verified ? <> · <BadgeCheck size={13} /> <b>{verified}</b> verified</> : null}</p>
      <ul>{referrals.slice(0, 8).map(r => <li key={r.member_id}>{r.name}<small>{r.verified ? 'Verified' : r.approved ? 'Member' : 'Joining'} · {new Date(r.joined_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></li>)}</ul>
    </div>}
  </section>
}
