import type { Ledger } from './types'
import { kpis, marginTotals, pipelineByStage, receivablesAging, revenueByCategory, revenueByMonth } from './analytics'
import type { FinanceBentoData } from '@/components/ui/finance-bento'

/** Read-only adapter. Caller supplies its own filtered, account-scoped ledger. */
export function financeBentoFromLedger(ledger:Ledger):FinanceBentoData {
 const m=kpis(ledger)
 return {
  history:revenueByMonth(ledger,12),
  pipeline:pipelineByStage(ledger),
  categories:revenueByCategory(ledger),
  receivables:receivablesAging(ledger),
  kpis:{pipeline:m.pipeline,weighted:m.weighted,revenue30:m.revenue30,overdueValue:m.overdueValue,
   overdueCount:m.overdueCount,winRate:m.winRate,grossMargin:marginTotals(ledger).grossMargin},
 }
}
