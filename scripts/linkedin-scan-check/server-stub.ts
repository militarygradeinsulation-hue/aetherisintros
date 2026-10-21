// In-browser stand-in for the scan server function: runs the same built-in reader the server
// falls back to, and records each call on window.__scans.
import { parseAuthorizedScan } from '../../src/aetheris/linkedin-scan'
import type { AdditionalEvidence } from '../../src/aetheris/professional-evidence'

const w = window as unknown as { __scans: Array<{ text: string; url: string }> }
w.__scans = []
export const scanLinkedInProfile = async ({ data }: { data: { text: string; url: string; nameHint?: string; evidence?: AdditionalEvidence[] } }) => {
  w.__scans.push({ text: data.text, url: data.url })
  await new Promise(r => setTimeout(r, 30))
  return parseAuthorizedScan(data.text, data.evidence ?? [], { ...(data.nameHint ? { nameHint: data.nameHint } : {}), url: data.url })
}
export const fetchLinkedInPhoto = async () => { throw new Error('not in this check') }
