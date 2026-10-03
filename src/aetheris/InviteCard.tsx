import { useEffect, useState } from 'react'
import { Copy, Link2 } from 'lucide-react'
import { myInviteCode, useAccess } from './access'

/** The member's personal invite link. Whoever joins with it lands in both networks. */
export function InviteCard() {
  const { access } = useAccess()
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState<'link' | 'code' | ''>('')
  useEffect(() => {
    if (!access.signedIn || access.status !== 'approved') return
    void myInviteCode().then(setCode).catch(() => setCode(''))
  }, [access.signedIn, access.status])
  if (!code) return null
  const link = `${window.location.origin}/invite/${code}`
  const copy = (what: 'link' | 'code') => { void navigator.clipboard?.writeText(what === 'link' ? link : code); setCopied(what) }
  return <section className="module invite-card">
    <header><div><span className="eyebrow">YOUR PERSONAL INVITE</span><h3>Bring someone in. You join each other’s network.</h3></div></header>
    <p className="invite-copy">When they create an account with your link or code, you are connected both ways automatically.</p>
    <div className="invite-row"><Link2 size={14} /><span className="invite-value">{link}</span>
      <button className="text-action" onClick={() => copy('link')}><Copy size={13} /> {copied === 'link' ? 'Copied' : 'Copy link'}</button></div>
    <div className="invite-row"><span className="invite-label">CODE</span><span className="invite-value">{code}</span>
      <button className="text-action" onClick={() => copy('code')}><Copy size={13} /> {copied === 'code' ? 'Copied' : 'Copy code'}</button></div>
  </section>
}
