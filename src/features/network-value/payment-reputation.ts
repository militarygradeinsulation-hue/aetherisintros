/**
 * Payment reputation privacy boundary. This does not verify invoices or publish
 * company ratings. Only immutable, server-verified, consented evidence may enter.
 * The eventual server uses a trusted business identity and dispute workflow.
 */
export type PaidInvoiceEvidence = {
  id: string
  payerBusinessId: string
  payeeBusinessId: string
  issuedAt: string
  paidAt: string
  verifiedAt: string
  verification: 'counterparty_confirmed' | 'processor_confirmed' | 'self_reported'
  status: 'confirmed' | 'disputed' | 'reversed' | 'pending'
  aggregateConsent: boolean
}

export type PaymentTimingBand = {
  payerBusinessId: string
  averageDaysToPay: number
  sampleBand: '5–9' | '10–24' | '25+'
  observedThrough: string
  calculation: 'Paid date minus invoice issue date'
}

const WINDOW_DAYS = 365
const MAX_DAYS = 730

/** Suppress cohorts with inadequate independent paid-invoice evidence. */
export function paymentTimingSummary(
  evidence: readonly PaidInvoiceEvidence[],
  payerBusinessId: string,
  now = new Date(),
): PaymentTimingBand | null {
  const clock = now.getTime()
  if (!Number.isFinite(clock)) return null
  const seen = new Set<string>()
  const perBusiness = evidence.flatMap(item => {
    if (item.payerBusinessId !== payerBusinessId || item.payerBusinessId === item.payeeBusinessId ||
        item.verification === 'self_reported' || item.status !== 'confirmed' || !item.aggregateConsent ||
        !item.id || !item.payeeBusinessId || seen.has(item.id) || !item.verifiedAt) return []
    const issued = Date.parse(item.issuedAt)
    const paid = Date.parse(item.paidAt)
    const verified = Date.parse(item.verifiedAt)
    if (![issued, paid, verified].every(Number.isFinite) ||
        paid < issued || verified < paid || paid > clock || verified > clock ||
        clock - paid > WINDOW_DAYS * 86400000 || paid - issued > MAX_DAYS * 86400000) return []
    seen.add(item.id)
    return [{ payee: item.payeeBusinessId, days: Math.ceil((paid - issued) / 86400000) }]
  })
  if (perBusiness.length < 5 || new Set(perBusiness.map(item => item.payee)).size < 3)
    return null
  const mean = perBusiness.reduce((sum, row) => sum + row.days, 0) / perBusiness.length
  return {
    payerBusinessId,
    averageDaysToPay: Math.round(mean * 10) / 10,
    sampleBand: perBusiness.length < 10 ? '5–9' : perBusiness.length < 25 ? '10–24' : '25+',
    observedThrough: now.toISOString().slice(0, 7),
    calculation: 'Paid date minus invoice issue date',
  }
}
