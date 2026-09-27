/**
 * Full CRM/ERP record shapes for the expanded workspace.
 *
 * These are a superset view over the account's own operating data: companies and
 * people carried through from the basic CRM, plus the trading records (products,
 * inventory, orders, invoices, vendors) the expanded workspace needs.
 */

export type ID = string

export type LedgerOwner = {
  id: ID
  name: string
  email: string
  role: 'Owner' | 'Admin' | 'Sales' | 'Ops' | 'Finance' | 'Viewer'
  region: string
  quota: number
  active: boolean
}

export type LedgerCompany = {
  id: ID
  name: string
  industry: string
  size: string
  country: string
  website: string
  tier: 'Strategic' | 'Growth' | 'Mid-Market' | 'SMB'
  health: number
  arr: number
  ownerId: ID
  createdAt: string
  /** Set when this row mirrors a record entered in the basic CRM. */
  crmId?: ID
}

export type LedgerContact = {
  id: ID
  firstName: string
  lastName: string
  email: string
  phone: string
  title: string
  companyId: ID
  ownerId: ID
  status: 'Active' | 'Cold' | 'Champion' | 'Churned'
  lastTouch: string
  createdAt: string
  crmId?: ID
}

export type LeadSource = 'Inbound' | 'Outbound' | 'Referral' | 'Event' | 'Partner' | 'Network intro'

export type LedgerLead = {
  id: ID
  name: string
  email: string
  company: string
  source: LeadSource
  status: 'New' | 'Working' | 'Qualified' | 'Nurture' | 'Disqualified' | 'Converted'
  score: number
  value: number
  ownerId: ID
  createdAt: string
}

export const DEAL_STAGES = [
  'Discovery',
  'Qualification',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
] as const
export type DealStage = (typeof DEAL_STAGES)[number]

export const STAGE_PROBABILITY: Record<DealStage, number> = {
  Discovery: 15,
  Qualification: 30,
  Proposal: 55,
  Negotiation: 75,
  'Closed Won': 100,
  'Closed Lost': 0,
}

export type LedgerDeal = {
  id: ID
  name: string
  companyId: ID
  contactId: ID
  ownerId: ID
  stage: DealStage
  value: number
  probability: number
  closeDate: string
  createdAt: string
  source: LeadSource
  crmId?: ID
}

export type LedgerActivity = {
  id: ID
  type: 'Call' | 'Meeting' | 'Email' | 'Task' | 'Demo'
  subject: string
  dueDate: string
  done: boolean
  ownerId: ID
  companyId: ID
  dealId?: ID
  priority: 'Low' | 'Normal' | 'High'
}

export type ProductCategory = 'Core offer' | 'Retainers' | 'Programmes' | 'Services' | 'Goods'

export type LedgerProduct = {
  id: ID
  sku: string
  name: string
  category: ProductCategory
  price: number
  cost: number
  active: boolean
}

export type LedgerInventoryItem = {
  id: ID
  productId: ID
  location: string
  onHand: number
  committed: number
  reorderPoint: number
  leadTimeDays: number
}

export type OrderLine = { productId: ID; qty: number; unitPrice: number }

export type LedgerOrder = {
  id: ID
  number: string
  companyId: ID
  ownerId: ID
  status: 'Draft' | 'Confirmed' | 'Packing' | 'Shipped' | 'Delivered' | 'Cancelled'
  createdAt: string
  lines: OrderLine[]
}

export type LedgerInvoice = {
  id: ID
  number: string
  companyId: ID
  orderId: ID
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Void'
  issuedAt: string
  dueAt: string
  amount: number
}

export type LedgerVendor = {
  id: ID
  name: string
  category: 'Software' | 'Logistics' | 'Data' | 'Goods' | 'Professional'
  country: string
  leadTimeDays: number
  onTimeRate: number
  spendYTD: number
  status: 'Preferred' | 'Approved' | 'Under review'
}

export type Ledger = {
  /** Identity this ledger was built for; a different account never reads it. */
  accountId: string
  builtAt: string
  users: LedgerOwner[]
  companies: LedgerCompany[]
  contacts: LedgerContact[]
  leads: LedgerLead[]
  deals: LedgerDeal[]
  activities: LedgerActivity[]
  products: LedgerProduct[]
  inventory: LedgerInventoryItem[]
  orders: LedgerOrder[]
  invoices: LedgerInvoice[]
  vendors: LedgerVendor[]
}

export function orderTotal(order: LedgerOrder): number {
  return order.lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0)
}
