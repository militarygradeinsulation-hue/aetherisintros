/**
 * Draws a member's name, code and verification date onto the personalised band of the
 * emailed membership card. The band sits between two static images
 * (public/membership/email-top.jpg and email-bottom.jpg), so only this strip is drawn per
 * member. No image library: the band and glyph atlases are prebuilt PNGs.
 */
import {
  CARD_BOX, cardLines, INK_BOTTOM, INK_TOP, TYPE_SIZES, type CardDetails, type Measure, type TypeSize,
} from '@/aetheris/membership-card-layout'
import { ATLAS_PNG, BAND_META, BAND_PNG } from './assets.generated'
import { base64Bytes, decodePng, encodePng, type Raster } from './png'

type AtlasMeta = (typeof BAND_META)['atlases'][TypeSize]

let decoded: Promise<{ band: Raster; atlases: Record<TypeSize, Raster> }> | null = null
function assets() {
  decoded ??= (async () => {
    const [band, large, medium, small] = await Promise.all([
      decodePng(base64Bytes(BAND_PNG)),
      decodePng(base64Bytes(ATLAS_PNG.large)), decodePng(base64Bytes(ATLAS_PNG.medium)), decodePng(base64Bytes(ATLAS_PNG.small)),
    ])
    return { band, atlases: { large, medium, small } }
  })()
  return decoded
}

const glyphsOf = (size: TypeSize): AtlasMeta['glyphs'] => BAND_META.atlases[size].glyphs

/** Advance width in card pixels, from the atlas metrics (atlases are drawn at email scale). */
export const atlasMeasure: Measure = (text, size, tracking) => {
  const glyphs = glyphsOf(size) as Record<string, readonly number[]>
  let w = 0
  for (const ch of text) w += glyphs[ch]?.[2] ?? 0
  return w / BAND_META.scale + Math.max(0, text.length - 1) * tracking * TYPE_SIZES[size]
}

export async function renderCardBand(card: CardDetails): Promise<Uint8Array> {
  const { band, atlases } = await assets()
  const out: Raster = { ...band, data: band.data.slice() }
  const s = BAND_META.scale
  const W = out.width, H = out.height

  for (const line of cardLines(card, atlasMeasure)) {
    const meta = BAND_META.atlases[line.size]
    const atlas = atlases[line.size]
    const glyphs = meta.glyphs as Record<string, readonly number[]>
    const capHeight = meta.baseline - meta.capTop
    // Atlas row r lands on band row: top + r.
    const top = Math.round((CARD_BOX.y + line.capTop) * s - BAND_META.bandTop) - meta.capTop
    let pen = (CARD_BOX.x + line.x) * s
    const spacing = line.tracking * TYPE_SIZES[line.size] * s
    const shadow = Math.max(1, Math.round(s * 1.5))

    for (const ch of line.text) {
      const g = glyphs[ch]
      if (!g) continue
      const [ax, gw, advance, left] = g as [number, number, number, number]
      const gx = Math.round(pen + left)
      // Pass 0: a soft dark shadow under the letter (engraved look); pass 1: the metal.
      for (const pass of [0, 1] as const) {
        const ox = gx, oy = top + (pass === 0 ? shadow : 0)
        for (let r = 0; r < atlas.height; r++) {
          const y = oy + r
          if (y < 0 || y >= H) continue
          const t = Math.min(1, Math.max(0, (r - meta.capTop) / capHeight))
          for (let c = 0; c < gw; c++) {
            const x = ox + c
            if (x < 0 || x >= W) continue
            const a = atlas.data[r * atlas.width + ax + c]! / 255
            if (!a) continue
            const p = (y * W + x) * 3
            for (let k = 0; k < 3; k++) {
              const ink = pass === 0 ? 0 : INK_TOP[k]! + (INK_BOTTOM[k]! - INK_TOP[k]!) * t
              const alpha = pass === 0 ? a * 0.7 : a
              out.data[p + k] = Math.round(out.data[p + k]! * (1 - alpha) + ink * alpha)
            }
          }
        }
      }
      pen += advance + spacing
    }
  }
  return encodePng(out)
}
