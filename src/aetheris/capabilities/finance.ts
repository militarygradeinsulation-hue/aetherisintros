import type { FindingRow } from './types'

type Money = Pick<FindingRow, 'id' | 'financial_low' | 'financial_high' | 'currency' | 'overlap_group' | 'status' | 'financial_classification'>

export interface Exposure {
  currency: string | null
  gross: number | null
  overlap: number | null
  normalized: number | null
  counted: number
  /** Why a total is not shown, when it is not. */
  reason?: string
}

/**
 * Gross = every open finding's upper bound. Findings sharing an overlap group
 * describe the same money, so the normalized figure counts only the largest per group.
 * Nothing is summed across currencies, and verified-loss / opportunity value are not mixed with exposure.
 */
export function normalizeExposure(rows: readonly Money[]): Exposure {
  const open = rows.filter(r => r.status === 'open' && r.financial_high != null && r.currency
    && r.financial_classification !== 'opportunity_value')
  if (!open.length) return { currency: null, gross: null, overlap: null, normalized: null, counted: 0, reason: 'No finding has a supported financial value yet.' }
  const currencies = new Set(open.map(r => r.currency))
  if (currencies.size > 1) return { currency: null, gross: null, overlap: null, normalized: null, counted: open.length, reason: 'Findings use more than one currency, so they are not added together.' }
  const gross = open.reduce((s, r) => s + (r.financial_high ?? 0), 0)
  const groups = new Map<string, number>()
  for (const r of open) {
    const key = r.overlap_group ?? `solo:${r.id}`
    groups.set(key, Math.max(groups.get(key) ?? 0, r.financial_high ?? 0))
  }
  const normalized = [...groups.values()].reduce((s, v) => s + v, 0)
  return { currency: [...currencies][0] ?? null, gross, overlap: gross - normalized, normalized, counted: open.length }
}

export function formatMoney(value: number | null, currency: string | null): string {
  if (value == null || !currency) return 'Unknown'
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value) }
  catch { return `${currency} ${Math.round(value).toLocaleString()}` }
}
