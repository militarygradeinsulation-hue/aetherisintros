import { describe, expect, it } from 'vitest'
import { paymentTimingSummary, type PaidInvoiceEvidence } from './payment-reputation'
const now = new Date('2026-10-25T12:00:00Z')
const invoice = (n: number, overrides: Partial<PaidInvoiceEvidence> = {}): PaidInvoiceEvidence => ({
  id: 'inv' + n, payerBusinessId: 'verified-gc', payeeBusinessId: 'sub' + (n % 3),
  issuedAt: '2026-09-01T00:00:00Z', paidAt: '2026-10-01T00:00:00Z', verifiedAt: '2026-10-02T00:00:00Z',
  verification: 'counterparty_confirmed', status: 'confirmed', aggregateConsent: true, ...overrides,
})
describe('payment reputation aggregate privacy', () => {
  it('never publishes a small or self-reported sample', () => {
    expect(paymentTimingSummary([0,1,2,3].map(i=>invoice(i)), 'verified-gc', now)).toBeNull()
    expect(paymentTimingSummary([0,1,2,3,4].map(i=>invoice(i,{verification:'self_reported'})), 'verified-gc', now)).toBeNull()
  })
  it('requires three independent payee businesses to suppress gaming', () => {
    expect(paymentTimingSummary([0,1,2,3,4].map(i=>invoice(i,{payeeBusinessId:'one-sub'})), 'verified-gc', now)).toBeNull()
  })
  it('shows only the average, sample band and observed month, never invoice detail', () => {
    const result = paymentTimingSummary([0,1,2,3,4].map(i=>invoice(i)), 'verified-gc', now)
    expect(result).toEqual({
      payerBusinessId:'verified-gc', averageDaysToPay:30, sampleBand:'5–9',
      observedThrough:'2026-10', calculation:'Paid date minus invoice issue date'
    })
    expect(JSON.stringify(result)).not.toMatch(/inv\d|sub\d/)
  })
  it('excludes unpaid, disputed, reversed, duplicate, withdrawn consent and future records', () => {
    const rows = [0,1,2,3,4].map(i=>invoice(i))
    rows[0] = invoice(0,{status:'disputed'})
    rows[1] = invoice(1,{aggregateConsent:false})
    rows[2] = invoice(2,{paidAt:'2026-11-01T00:00:00Z',verifiedAt:'2026-11-02T00:00:00Z'})
    expect(paymentTimingSummary(rows, 'verified-gc',now)).toBeNull()
  })
  it('rejects payer self-reports and impossible payment dates', () => {
    const rows = [0,1,2,3,4].map(i=>invoice(i))
    rows[0] = invoice(0,{issuedAt:'2026-10-20T00:00:00Z'})
    rows[1] = invoice(1,{payeeBusinessId:'verified-gc'})
    expect(paymentTimingSummary(rows,'verified-gc',now)).toBeNull()
  })
})
