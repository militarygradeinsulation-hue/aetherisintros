/**
 * The Ask Intros membership card on a member's profile: the card artwork with their name,
 * membership code and verification date, laid out exactly as on the emailed card
 * (membership-card-layout.ts). Other members see it as proof the member is verified; the
 * member can also download it.
 */
import { BadgeCheck, Download } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { sendMyMembershipCard } from '@/lib/membershipCard.functions'
import {
  CARD_BOX, cardLines, INK_BOTTOM, INK_TOP, TYPE_SIZES, type CardDetails, type CardLine, type Measure,
} from './membership-card-layout'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export interface MembershipCardRow { code: string; holder_name: string; verified_at: string; status: 'active' | 'revoked' }

const FAMILY = 'AskIntrosCard'
const FONT_URL = '/membership/card-font.woff2'
/** Card font metrics (em): cap height, and cap top below the line box top at line-height 1. */
const CAP_HEIGHT = 0.625
const CAP_OFFSET = 0.1935

let fontReady: Promise<void> | null = null
function loadCardFont(): Promise<void> {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return Promise.resolve()
  fontReady ??= new FontFace(FAMILY, `url(${FONT_URL}) format("woff2")`, { weight: '500' }).load()
    .then(face => { document.fonts.add(face) })
    .catch(() => undefined)
  return fontReady
}

let measureCtx: CanvasRenderingContext2D | null = null
const canvasMeasure: Measure = (text, size, tracking) => {
  measureCtx ??= typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
  const px = TYPE_SIZES[size]
  if (!measureCtx) return text.length * px * (0.62 + tracking)
  measureCtx.font = `500 ${px}px ${FAMILY}, "Cormorant Garamond", Georgia, serif`
  return measureCtx.measureText(text).width + Math.max(0, text.length - 1) * tracking * px
}

const cache = new Map<string, MembershipCardRow | null>()

/** A member's card as the viewer may see it: their own always, others' only while active. */
export function useMembershipCard(memberId: string | null | undefined): { card: MembershipCardRow | null; loading: boolean } {
  const [card, setCard] = useState<MembershipCardRow | null>(memberId ? cache.get(memberId) ?? null : null)
  const [loading, setLoading] = useState(!!memberId && !cache.has(memberId))
  useEffect(() => {
    // Showcase people have non-account ids and no card.
    if (!memberId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId)) { setLoading(false); return }
    let live = true
    void db.from('membership_cards').select('code, holder_name, verified_at, status').eq('user_id', memberId).maybeSingle()
      .then(({ data }: { data: MembershipCardRow | null }) => {
        cache.set(memberId, data ?? null)
        if (live) { setCard(data ?? null); setLoading(false) }
      })
    return () => { live = false }
  }, [memberId])
  return { card, loading }
}

function useCardFont() {
  const [ready, setReady] = useState(false)
  useEffect(() => { let live = true; void loadCardFont().then(() => { if (live) setReady(true) }); return () => { live = false } }, [])
  return ready
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`

/** The card itself; it scales to the width of its container. */
export function MembershipCardView({ card, className }: { card: CardDetails; className?: string }) {
  const fontReady = useCardFont()
  // Re-fit once the card font has loaded, so long names measure with the real letters.
  const lines = useMemo(() => cardLines(card, canvasMeasure), [card, fontReady]) // eslint-disable-line react-hooks/exhaustive-deps
  const gradient = `linear-gradient(180deg, rgb(${INK_TOP.join(',')}) 18%, rgb(${INK_BOTTOM.join(',')}) 82%)`
  return <figure
    className={`membership-card${className ? ` ${className}` : ''}`}
    aria-label={`Ask Intros membership card: ${card.name}, code ${card.code}, verified ${new Date(card.verifiedAt).toLocaleDateString()}`}
    style={{
      position: 'relative', margin: 0, width: '100%', aspectRatio: `${CARD_BOX.w} / ${CARD_BOX.h}`, containerType: 'inline-size',
      backgroundImage: 'url(/membership/card.jpg)', backgroundSize: 'cover', borderRadius: '2.1%/3.7%', overflow: 'hidden',
      boxShadow: '0 18px 40px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.35)',
    }}>
    {lines.map(line => <CardText key={`${line.x}-${line.capTop}`} line={line} gradient={gradient} />)}
  </figure>
}

function CardText({ line, gradient }: { line: CardLine; gradient: string }) {
  const px = TYPE_SIZES[line.size]
  return <span aria-hidden="true" style={{
    position: 'absolute', left: pct(line.x, CARD_BOX.w), top: pct(line.capTop - CAP_OFFSET * px, CARD_BOX.h),
    fontFamily: `${FAMILY}, "Cormorant Garamond", Georgia, serif`, fontWeight: 500, lineHeight: 1,
    fontSize: `${(px / CARD_BOX.w) * 100}cqw`, letterSpacing: `${line.tracking}em`, whiteSpace: 'nowrap',
    fontVariantNumeric: 'lining-nums', backgroundImage: gradient, WebkitBackgroundClip: 'text', backgroundClip: 'text',
    color: 'transparent', filter: 'drop-shadow(0 0.08cqw 0 rgba(0,0,0,.7))',
  }}>{line.text}</span>
}

/** Draws the card to a PNG at full artwork resolution, for the member to save. */
export async function cardPng(card: CardDetails): Promise<Blob> {
  await loadCardFont()
  const image = new Image()
  image.src = '/membership/card.jpg'
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = CARD_BOX.w; canvas.height = CARD_BOX.h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0, CARD_BOX.w, CARD_BOX.h)
  for (const line of cardLines(card, canvasMeasure)) {
    const px = TYPE_SIZES[line.size]
    ctx.font = `500 ${px}px ${FAMILY}, "Cormorant Garamond", Georgia, serif`
    const top = line.capTop, baseline = line.capTop + CAP_HEIGHT * px
    const ink = ctx.createLinearGradient(0, top, 0, baseline)
    ink.addColorStop(0, `rgb(${INK_TOP.join(',')})`)
    ink.addColorStop(1, `rgb(${INK_BOTTOM.join(',')})`)
    let pen = line.x
    for (const ch of line.text) {
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillText(ch, pen, baseline + 1.5)
      ctx.fillStyle = ink; ctx.fillText(ch, pen, baseline)
      pen += ctx.measureText(ch).width + line.tracking * px
    }
  }
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not draw the card'))), 'image/png'))
}

/**
 * Profile section: the member's card and a verified-and-trusted line. Nothing for members
 * without a card. The owner can download it and sees when a card has been revoked.
 */
export function MembershipCardPanel({ memberId }: { memberId: string }) {
  const { card } = useMembershipCard(memberId)
  const [busy, setBusy] = useState(false)
  const [own, setOwn] = useState(false)
  useEffect(() => { void supabase.auth.getSession().then(({ data }) => setOwn(data.session?.user.id === memberId)) }, [memberId])
  if (!card || (card.status !== 'active' && !own)) return null
  const details: CardDetails = { name: card.holder_name, code: card.code, verifiedAt: card.verified_at }
  const since = new Date(card.verified_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

  const download = async () => {
    setBusy(true)
    try {
      const url = URL.createObjectURL(await cardPng(details))
      const a = document.createElement('a')
      a.href = url; a.download = `ask-intros-membership-${card.code}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } finally { setBusy(false) }
  }

  return <section className="membership-card-panel" aria-label="Membership card">
    <MembershipCardView card={details} />
    <div className="membership-card-meta">
      {card.status === 'active'
        ? <p><BadgeCheck size={15} aria-hidden="true" /><b>Verified member</b><span>Identity and role reviewed by Ask Intros · since {since}</span></p>
        : <p className="revoked"><b>Card inactive</b><span>This card was revoked when your verification changed. It returns if you are verified again.</span></p>}
      <p className="membership-card-code"><span>Membership code</span><b>{card.code}</b></p>
      {own && card.status === 'active' && <button type="button" className="chip" disabled={busy} onClick={() => void download()}><Download size={14} /> {busy ? 'Preparing…' : 'Download card'}</button>}
    </div>
  </section>
}

/**
 * Mounted once in the signed-in app: emails the member their card if it is still waiting
 * (verified by any route since they last opened the app). Once per browser session.
 */
export function MembershipCardMailer() {
  useEffect(() => {
    const key = 'ask-intros:membership-card-checked'
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1') } catch { /* storage blocked: check anyway */ }
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void sendMyMembershipCard().catch(() => undefined)
    })
  }, [])
  return null
}
