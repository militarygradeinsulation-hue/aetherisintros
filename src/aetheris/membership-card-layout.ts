/**
 * Where the member's details sit on the Ask Intros membership card. Shared by the in-app card
 * (text over public/membership/card.jpg), its PNG download, and the server-drawn email image,
 * so all three look the same. Coordinates are card pixels on the 1166 × 661 card artwork.
 */

/** The card inside the source photo; matches CARD_BOX in scripts/membership-card/build-assets.py. */
export const CARD_BOX = { x: 141, y: 169, w: 1166, h: 661 } as const

/** Type sizes in card pixels; match ATLAS_SIZES in the asset build. */
export const TYPE_SIZES = { large: 38, medium: 30, small: 18 } as const
export type TypeSize = keyof typeof TYPE_SIZES

export interface CardLine {
  text: string
  /** Left edge, card pixels. */
  x: number
  /** Top of the capital letters, card pixels. */
  capTop: number
  size: TypeSize
  /** Letter spacing in em. */
  tracking: number
}

export interface CardDetails { name: string; code: string; verifiedAt: string }

/** Measures a line's advance width in card pixels at a type size and tracking. */
export type Measure = (text: string, size: TypeSize, tracking: number) => number

const LEFT = 72
const SECOND_COLUMN = 420
/** The name stops short of the logo. */
const NAME_MAX_WIDTH = 628

/** Card lettering is engraved capitals: accents folded, unsupported characters dropped. */
export function cardLettering(value: string): string {
  return value
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'SS').replace(/[Ææ]/g, 'AE').replace(/[Øø]/g, 'O').replace(/[Łł]/g, 'L')
    .toUpperCase()
    .replace(/[^A-Z0-9 \-.,'&/]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** "08 OCT 2026", in UTC so every renderer prints the same day. */
export function cardDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return `${String(d.getUTCDate()).padStart(2, '0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** Fit the name beside the logo: tighten the spacing, then a smaller size, then first and last name only. */
export function fitName(name: string, measure: Measure): Pick<CardLine, 'text' | 'size' | 'tracking'> {
  const full = cardLettering(name)
  const words = full.split(' ')
  const candidates = words.length > 2 ? [full, `${words[0]} ${words[words.length - 1]}`] : [full]
  for (const text of candidates) {
    for (const [size, tracking] of [['large', 0.22], ['large', 0.12], ['medium', 0.16], ['medium', 0.08]] as const) {
      if (measure(text, size, tracking) <= NAME_MAX_WIDTH) return { text, size, tracking }
    }
  }
  // Still too long: cut it to fit at the smallest setting.
  let text = candidates[candidates.length - 1]!
  while (text.length > 1 && measure(text, 'medium', 0.08) > NAME_MAX_WIDTH) text = text.slice(0, -1)
  return { text: text.trim(), size: 'medium', tracking: 0.08 }
}

export function cardLines(card: CardDetails, measure: Measure): CardLine[] {
  const name = fitName(card.name, measure)
  const lines: CardLine[] = [
    { x: LEFT, capTop: 516, size: 'small', tracking: 0.42, text: 'MEMBERSHIP CODE' },
    { x: LEFT, capTop: 551, size: 'large', tracking: 0.2, text: cardLettering(card.code) },
    { x: SECOND_COLUMN, capTop: 516, size: 'small', tracking: 0.42, text: 'VERIFIED' },
    { x: SECOND_COLUMN, capTop: 551, size: 'large', tracking: 0.2, text: cardDate(card.verifiedAt) },
  ]
  // A smaller name keeps the same baseline as a full-size one.
  const capTop = name.size === 'large' ? 457 : 457 + (TYPE_SIZES.large - TYPE_SIZES[name.size]) * 0.64
  if (name.text) lines.unshift({ x: LEFT, capTop, size: name.size, tracking: name.tracking, text: name.text })
  return lines
}

/** Engraved metal: light at the top of the letters, warmer and darker at the foot. */
export const INK_TOP = [246, 239, 231] as const
export const INK_BOTTOM = [168, 157, 146] as const
