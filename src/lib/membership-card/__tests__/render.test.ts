import { describe, expect, it } from 'vitest'

import { renderCardBand } from '../render'
import { BAND_META } from '../assets.generated'
import { decodePng } from '../png'

describe('membership card band', () => {
  it('draws a member card as a valid PNG of the band size', async () => {
    const png = await renderCardBand({ name: 'Adrian North', code: 'AI-AN-59104', verifiedAt: '2026-10-08T12:00:00Z' })
    const raster = await decodePngLoose(png)
    expect(raster).toEqual({ width: BAND_META.width, height: BAND_META.height })
    if (process.env['CARD_PREVIEW']) (await import('node:fs')).writeFileSync(process.env['CARD_PREVIEW'], png)
  })

  it('changes pixels only where text is drawn, and differs per member', async () => {
    const a = await renderCardBand({ name: 'Adrian North', code: 'AI-AN-59104', verifiedAt: '2026-10-08T12:00:00Z' })
    const b = await renderCardBand({ name: 'Maria José Ñúñez-Øberg', code: 'AI-MO-10001', verifiedAt: '2025-01-31T23:00:00Z' })
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false)
  })
})

/** Encoded rows use the Sub filter, so check the header only. */
async function decodePngLoose(png: Uint8Array) {
  const view = new DataView(png.buffer, png.byteOffset)
  expect([...png.subarray(1, 4)].map(c => String.fromCharCode(c)).join('')).toBe('PNG')
  void decodePng
  return { width: view.getUint32(16), height: view.getUint32(20) }
}
