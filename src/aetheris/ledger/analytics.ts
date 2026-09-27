/**
 * Read-only rollups over one account's expanded workspace.
 * Every number here is derived from the ledger rows — nothing is invented.
 */
import { DEAL_STAGES, orderTotal, type Ledger } from './types'

const MONTH_KEY = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
const MONTH_LABEL = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(d)

export function lastMonths(anchor: Date, count: number) {
  const out: Array<{ key: string; label: string }> = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1))
    out.push({ key: MONTH_KEY(d), label: MONTH_LABEL(d) })
  }
  return out
}

export const openDeals = (l: Ledger) => l.deals.filter(d => !d.stage.startsWith('Closed'))

export function kpis(l: Ledger) {
  const now = new Date(l.builtAt)
  const open = openDeals(l)
  const won = l.deals.filter(d => d.stage === 'Closed Won')
  const lost = l.deals.filter(d => d.stage === 'Closed Lost')
  const windowStart = now.getTime() - 30 * 86400000
  const revenue30 = l.invoices
    .filter(i => i.status === 'Paid' && new Date(i.issuedAt).getTime() >= windowStart)
    .reduce((s, i) => s + i.amount, 0)
  const overdue = l.invoices.filter(i => i.status === 'Overdue')
  const lowStock = l.inventory.filter(i => i.onHand <= i.reorderPoint)
  return {
    pipeline: open.reduce((s, d) => s + d.value, 0),
    weighted: open.reduce((s, d) => s + (d.value * d.probability) / 100, 0),
    revenue30,
    winRate: won.length + lost.length ? (won.length / (won.length + lost.length)) * 100 : 0,
    openDealCount: open.length,
    overdueValue: overdue.reduce((s, i) => s + i.amount, 0),
    overdueCount: overdue.length,
    lowStockCount: lowStock.length,
    accounts: l.companies.length,
    openActivities: l.activities.filter(a => !a.done).length,
    avgDealSize: l.deals.length ? l.deals.reduce((s, d) => s + d.value, 0) / l.deals.length : 0,
  }
}

export function revenueByMonth(l: Ledger, months = 12) {
  const buckets = lastMonths(new Date(l.builtAt), months)
  const index = new Map(buckets.map(b => [b.key, { month: b.label, billed: 0, collected: 0, target: 0 }]))
  for (const invoice of l.invoices) {
    const row = index.get(MONTH_KEY(new Date(invoice.issuedAt)))
    if (!row) continue
    if (invoice.status !== 'Draft' && invoice.status !== 'Void') row.billed += invoice.amount
    if (invoice.status === 'Paid') row.collected += invoice.amount
  }
  const rows = [...index.values()]
  const avg = rows.reduce((s, r) => s + r.billed, 0) / Math.max(rows.length, 1)
  return rows.map(r => ({ ...r, target: Math.round(avg * 1.1) }))
}

export function pipelineByStage(l: Ledger) {
  return DEAL_STAGES.filter(s => !s.startsWith('Closed')).map(stage => {
    const rows = l.deals.filter(d => d.stage === stage)
    return { name: stage, count: rows.length, value: rows.reduce((s, d) => s + d.value, 0) }
  })
}

export function leadsBySource(l: Ledger) {
  const map = new Map<string, { name: string; leads: number; qualified: number; value: number }>()
  for (const lead of l.leads) {
    const row = map.get(lead.source) ?? { name: lead.source, leads: 0, qualified: 0, value: 0 }
    row.leads += 1
    if (lead.status === 'Qualified' || lead.status === 'Converted') row.qualified += 1
    row.value += lead.value
    map.set(lead.source, row)
  }
  return [...map.values()].sort((a, b) => b.leads - a.leads)
}

export function ownerLeaderboard(l: Ledger) {
  return l.users
    .filter(u => u.quota > 0)
    .map(user => {
      const deals = l.deals.filter(d => d.ownerId === user.id)
      const won = deals.filter(d => d.stage === 'Closed Won')
      const open = deals.filter(d => !d.stage.startsWith('Closed'))
      const closedValue = won.reduce((s, d) => s + d.value, 0)
      return {
        id: user.id,
        name: user.name,
        region: user.region,
        closedValue,
        pipeline: open.reduce((s, d) => s + d.value, 0),
        deals: deals.length,
        winRate: deals.length ? (won.length / deals.length) * 100 : 0,
        attainment: user.quota ? (closedValue / user.quota) * 100 : 0,
      }
    })
    .sort((a, b) => b.closedValue - a.closedValue)
}

export function winLossByMonth(l: Ledger, months = 12) {
  const buckets = lastMonths(new Date(l.builtAt), months)
  const index = new Map(buckets.map(b => [b.key, { month: b.label, won: 0, lost: 0 }]))
  for (const deal of l.deals) {
    if (!deal.stage.startsWith('Closed')) continue
    const row = index.get(MONTH_KEY(new Date(deal.closeDate)))
    if (!row) continue
    if (deal.stage === 'Closed Won') row.won += 1
    else row.lost += 1
  }
  return [...index.values()]
}

export function revenueByCategory(l: Ledger) {
  const map = new Map<string, number>()
  for (const order of l.orders) {
    if (order.status === 'Cancelled' || order.status === 'Draft') continue
    for (const line of order.lines) {
      const product = l.products.find(p => p.id === line.productId)
      if (!product) continue
      map.set(product.category, (map.get(product.category) ?? 0) + line.qty * line.unitPrice)
    }
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }))
}

export function receivablesAging(l: Ledger) {
  const now = new Date(l.builtAt).getTime()
  const buckets = [
    { name: 'Current', value: 0 },
    { name: '1-30 days', value: 0 },
    { name: '31-60 days', value: 0 },
    { name: '60+ days', value: 0 },
  ]
  for (const invoice of l.invoices) {
    if (invoice.status === 'Paid' || invoice.status === 'Void' || invoice.status === 'Draft') continue
    const days = Math.round((now - new Date(invoice.dueAt).getTime()) / 86400000)
    const bucket = days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : 3
    buckets[bucket]!.value += invoice.amount
  }
  return buckets
}

export function tierCohorts(l: Ledger) {
  return ['Strategic', 'Growth', 'Mid-Market', 'SMB'].map(tier => {
    const rows = l.companies.filter(c => c.tier === tier)
    return {
      name: tier,
      accounts: rows.length,
      arr: rows.reduce((s, c) => s + c.arr, 0),
      health: Math.round(rows.reduce((s, c) => s + c.health, 0) / Math.max(rows.length, 1)),
      atRisk: rows.filter(c => c.health < 60).length,
    }
  })
}

export function marginTotals(l: Ledger) {
  const year = new Date(l.builtAt).getUTCFullYear()
  const revenueYTD = l.invoices
    .filter(i => i.status === 'Paid' && new Date(i.issuedAt).getUTCFullYear() === year)
    .reduce((s, i) => s + i.amount, 0)
  let revenue = 0
  let cost = 0
  for (const order of l.orders) {
    if (order.status === 'Cancelled' || order.status === 'Draft') continue
    for (const line of order.lines) {
      const product = l.products.find(p => p.id === line.productId)
      if (!product) continue
      revenue += line.qty * line.unitPrice
      cost += line.qty * product.cost
    }
  }
  return { revenueYTD, grossMargin: revenue ? ((revenue - cost) / revenue) * 100 : 0 }
}

export function ordersByMonth(l: Ledger, months = 12) {
  const buckets = lastMonths(new Date(l.builtAt), months)
  const index = new Map(buckets.map(b => [b.key, { month: b.label, count: 0, value: 0 }]))
  for (const order of l.orders) {
    const row = index.get(MONTH_KEY(new Date(order.createdAt)))
    if (!row || order.status === 'Cancelled') continue
    row.count += 1
    row.value += orderTotal(order)
  }
  return [...index.values()].map(r => ({ ...r, value: Math.round(r.value) }))
}

export function inventoryHealth(l: Ledger) {
  return l.inventory.map(item => {
    const product = l.products.find(p => p.id === item.productId)
    const available = item.onHand - item.committed
    const state: 'Healthy' | 'Low' | 'Critical' =
      available <= 0 ? 'Critical' : item.onHand <= item.reorderPoint ? 'Low' : 'Healthy'
    return {
      id: item.id,
      sku: product?.sku ?? '—',
      product: product?.name ?? '—',
      location: item.location,
      onHand: item.onHand,
      committed: item.committed,
      available,
      reorderPoint: item.reorderPoint,
      leadTimeDays: item.leadTimeDays,
      state,
      value: Math.round(item.onHand * (product?.cost ?? 0)),
    }
  })
}

export function inventoryByLocation(l: Ledger) {
  const map = new Map<string, { name: string; onHand: number; committed: number; belowReorder: number }>()
  for (const item of l.inventory) {
    const row = map.get(item.location) ?? { name: item.location, onHand: 0, committed: 0, belowReorder: 0 }
    row.onHand += item.onHand
    row.committed += item.committed
    if (item.onHand <= item.reorderPoint) row.belowReorder += 1
    map.set(item.location, row)
  }
  return [...map.values()]
}
