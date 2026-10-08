/**
 * Just enough PNG for the membership card: read the 8-bit grey/RGB images produced by
 * scripts/membership-card/build-assets.py (filter 0 rows) and write an RGB image. Uses
 * node:zlib where the runtime has it, else the standard compression streams.
 */

export interface Raster { width: number; height: number; channels: 1 | 3; data: Uint8Array }

type Zlib = { deflateSync: (b: Uint8Array, o?: { level: number }) => Uint8Array; inflateSync: (b: Uint8Array) => Uint8Array }
let zlib: Promise<Zlib | null> | null = null
/** node:zlib where available (Node, Workers with nodejs_compat): several times faster than streams. */
const nodeZlib = () => (zlib ??= import('node:zlib').then(m => m as unknown as Zlib).catch(() => null))

async function pipe(bytes: Uint8Array, mode: 'deflate' | 'inflate'): Promise<Uint8Array> {
  const z = await nodeZlib()
  if (z) return new Uint8Array(mode === 'deflate' ? z.deflateSync(bytes, { level: 4 }) : z.inflateSync(bytes))
  const stream = mode === 'deflate' ? new CompressionStream('deflate') : new DecompressionStream('deflate')
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}

export function base64Bytes(value: string): Uint8Array {
  if (typeof atob === 'function') return Uint8Array.from(atob(value), c => c.charCodeAt(0))
  return new Uint8Array(Buffer.from(value, 'base64'))
}

const u32 = (b: Uint8Array, i: number) => ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0

export async function decodePng(bytes: Uint8Array): Promise<Raster> {
  let i = 8, width = 0, height = 0, channels: 1 | 3 = 3
  const idat: Uint8Array[] = []
  while (i < bytes.length) {
    const length = u32(bytes, i)
    const type = String.fromCharCode(...bytes.subarray(i + 4, i + 8))
    const body = bytes.subarray(i + 8, i + 8 + length)
    if (type === 'IHDR') {
      width = u32(body, 0); height = u32(body, 4)
      if (body[8] !== 8 || (body[9] !== 0 && body[9] !== 2) || body[12] !== 0) throw new Error('Unsupported card PNG')
      channels = body[9] === 0 ? 1 : 3
    } else if (type === 'IDAT') idat.push(body)
    i += 12 + length
  }
  const joined = new Uint8Array(idat.reduce((n, c) => n + c.length, 0))
  let o = 0
  for (const c of idat) { joined.set(c, o); o += c.length }
  const rows = await pipe(joined, 'inflate')
  const stride = width * channels
  const data = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    if (rows[y * (stride + 1)] !== 0) throw new Error('Unsupported card PNG filter')
    data.set(rows.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), y * stride)
  }
  return { width, height, channels, data }
}

const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function chunk(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + body.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, body.length)
  for (let k = 0; k < 4; k++) out[4 + k] = type.charCodeAt(k)
  out.set(body, 8)
  let c = 0xffffffff
  for (let k = 4; k < 8 + body.length; k++) c = CRC[(c ^ out[k]!) & 0xff]! ^ (c >>> 8)
  view.setUint32(8 + body.length, (c ^ 0xffffffff) >>> 0)
  return out
}

/** RGB raster to PNG. Each row uses the Sub filter, which suits photographic texture. */
export async function encodePng(raster: Raster): Promise<Uint8Array> {
  const { width, height, channels, data } = raster
  const stride = width * channels
  const rows = new Uint8Array((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    const at = y * (stride + 1)
    rows[at] = 1
    for (let x = 0; x < stride; x++) {
      const v = data[y * stride + x]!
      rows[at + 1 + x] = (v - (x >= channels ? data[y * stride + x - channels]! : 0)) & 0xff
    }
  }
  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, width); view.setUint32(4, height)
  header[8] = 8; header[9] = channels === 1 ? 0 : 2
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', await pipe(rows, 'deflate')),
    chunk('IEND', new Uint8Array(0)),
  ]
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}
