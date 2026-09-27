/**
 * Builds one account's expanded workspace.
 *
 * Everything the member already entered in the basic CRM carries through as the
 * real record it is. On top of that, a deterministic starter set is generated
 * from their own identity — their name, company, industry and location — so a new
 * account opens on a working workspace instead of twelve empty tables. Starter
 * rows are flagged so the workspace can label and filter them honestly.
 */
import {
  DEAL_STAGES, STAGE_PROBABILITY, orderTotal,
  type DealStage, type Ledger, type LeadSource, type LedgerActivity, type LedgerCompany,
  type LedgerContact, type LedgerDeal, type LedgerInventoryItem, type LedgerInvoice,
  type LedgerLead, type LedgerOrder, type LedgerOwner, type LedgerProduct, type LedgerVendor,
  type ProductCategory,
} from './types'

export interface LedgerIdentity {
  /** The signed-in account. Nothing generated here crosses accounts. */
  accountId: string
  name: string
  email: string
  company: string
  industry: string
  location: string
  title: string
}

export interface LedgerSourceCompany {
  id: string; name: string; industry: string; location: string; website: string
  employees: string; revenueBand: string; createdAt: string
}
export interface LedgerSourcePerson {
  id: string; fullName: string; email: string; phone: string; title: string
  companyId: string | null; companyName: string; lifecycle: string
  lastActivityAt: string | null; createdAt: string; source: string
}
export interface LedgerSourceOpportunity {
  id: string; name: string; companyId: string | null; personId: string | null
  amount: number; probability: number; status: string; stageName: string
  expectedCloseAt: string | null; createdAt: string
}
export interface LedgerSourceTask {
  id: string; title: string; status: string; priority: string
  dueAt: string | null; companyId: string | null; opportunityId: string | null
}

export interface LedgerSource {
  companies: LedgerSourceCompany[]
  people: LedgerSourcePerson[]
  opportunities: LedgerSourceOpportunity[]
  tasks: LedgerSourceTask[]
}

/* ------------------------------------------------------------ randomness */

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* --------------------------------------------------------------- vocabulary */

const FIRST = [
  'Amara', 'Lena', 'Idris', 'Sofia', 'Mateo', 'Nadia', 'Rowan', 'Priya', 'Kofi', 'Elena', 'Hugo',
  'Yuki', 'Bianca', 'Omar', 'Freya', 'Dante', 'Ines', 'Caleb', 'Maya', 'Tobias', 'Ruth', 'Zara',
  'Marcus', 'Odette', 'Silas', 'Noor', 'Anders', 'Talia', 'Emeka', 'Rafael', 'Cleo', 'Ivy',
]
const LAST = [
  'Vance', 'Okafor', 'Lindqvist', 'Moreau', 'Castellano', 'Ashworth', 'Nakamura', 'Ferreira',
  'Halloran', 'Sandoval', 'Whitfield', 'Baptiste', 'Reinhardt', 'Osei', 'Kovac', 'Ellington',
  'Marchetti', 'Devereaux', 'Aldridge', 'Villanueva', 'Brennan', 'Sato', 'Fontaine', 'Mercer',
]
const COMPANY_A = [
  'Helio', 'Northwind', 'Arclight', 'Vantage', 'Ironwood', 'Solace', 'Kestrel', 'Basalt',
  'Meridian', 'Lumen', 'Terrapin', 'Cadence', 'Halcyon', 'Verdant', 'Sable', 'Quarry',
  'Anvil', 'Cobalt', 'Fathom', 'Granite', 'Harbor', 'Juniper', 'Larkspur', 'Pennant',
]
const COMPANY_B = [
  'Industries', 'Systems', 'Group', 'Holdings', 'Partners', 'Works', 'Collective', 'Labs',
  'Analytics', 'Capital', 'Networks', 'Foundry', 'Advisory', 'Logistics',
]
const TITLES = [
  'Chief Operating Officer', 'VP Revenue Operations', 'Director of IT', 'Head of Supply Chain',
  'Chief Financial Officer', 'Procurement Lead', 'VP Sales', 'Head of Data', 'Founder',
  'Director of Customer Success', 'Chief Executive Officer', 'Operations Lead',
]
const SIZES = ['11-50', '51-200', '201-500', '501-1,000', '1,001-5,000', '5,000+']
const SOURCES: LeadSource[] = ['Inbound', 'Outbound', 'Referral', 'Event', 'Partner', 'Network intro']
const ACTIVITY_SUBJECTS = [
  'Follow up on pricing', 'Scope review call', 'Quarterly business review', 'Send proposal',
  'Technical deep dive', 'Procurement check-in', 'Renewal prep', 'Kickoff', 'Executive alignment',
  'Contract redlines', 'Reference call', 'Budget confirmation',
]
const DEAL_THEMES = [
  'expansion', 'annual renewal', 'pilot programme', 'rollout', 'retainer', 'platform licence',
  'advisory engagement', 'implementation',
]

const INDUSTRY_FALLBACK = 'Professional services'

/* Product catalogue shaped by what kind of business the member runs. */
function catalogueFor(industry: string): Array<[string, ProductCategory, number, number]> {
  const key = industry.toLowerCase()
  if (/manufactur|industrial|hardware|goods|retail|consumer|logistic/.test(key)) {
    return [
      ['Flagship unit', 'Goods', 4800, 2100],
      ['Standard unit', 'Goods', 2600, 1150],
      ['Spare parts kit', 'Goods', 740, 310],
      ['Installation', 'Services', 6200, 2900],
      ['Service plan — annual', 'Retainers', 14000, 4100],
      ['Extended warranty', 'Retainers', 5200, 1400],
      ['Onsite training', 'Programmes', 9800, 3600],
      ['Priority logistics', 'Services', 3100, 1650],
    ]
  }
  if (/health|clinic|care|medical|wellness/.test(key)) {
    return [
      ['Programme — core', 'Core offer', 18000, 5200],
      ['Programme — extended', 'Core offer', 32000, 9400],
      ['Clinical advisory retainer', 'Retainers', 12000, 3800],
      ['Team training cohort', 'Programmes', 21000, 7400],
      ['Compliance review', 'Services', 8600, 3100],
      ['Onboarding sprint', 'Services', 11500, 4900],
    ]
  }
  if (/financ|invest|capital|account|insur|legal|law/.test(key)) {
    return [
      ['Advisory retainer — monthly', 'Retainers', 16000, 4200],
      ['Transaction advisory', 'Core offer', 68000, 19000],
      ['Diligence review', 'Services', 34000, 11000],
      ['Portfolio review — quarterly', 'Retainers', 12500, 3400],
      ['Board programme', 'Programmes', 28000, 8800],
      ['Model build', 'Services', 9600, 3200],
    ]
  }
  if (/software|tech|saas|data|ai|platform|media|marketing|agency|creative/.test(key)) {
    return [
      ['Platform licence — annual', 'Core offer', 48000, 9600],
      ['Additional seats — 25 pack', 'Core offer', 11000, 2100],
      ['Managed service — monthly', 'Retainers', 14500, 5200],
      ['Implementation sprint', 'Services', 38000, 16000],
      ['Strategy programme', 'Programmes', 26000, 8400],
      ['Data migration', 'Services', 17500, 7600],
      ['Priority support', 'Retainers', 8200, 2400],
    ]
  }
  return [
    ['Core engagement', 'Core offer', 42000, 12000],
    ['Advisory retainer — monthly', 'Retainers', 13500, 3900],
    ['Strategy programme', 'Programmes', 24000, 7800],
    ['Implementation sprint', 'Services', 31000, 13500],
    ['Assessment', 'Services', 8800, 2900],
    ['Executive workshop', 'Programmes', 15600, 4800],
  ]
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'account'

/* ------------------------------------------------------------------ builder */

export function buildLedger(identity: LedgerIdentity, source: LedgerSource): Ledger {
  const rand = mulberry32(hash(identity.accountId || identity.email || identity.name || 'account'))
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!
  const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
  const chance = (p: number) => rand() < p

  const today = new Date()
  const DAY = 86400000
  const iso = (offsetDays: number) => new Date(today.getTime() + offsetDays * DAY).toISOString()

  const industry = (identity.industry || '').trim() || INDUSTRY_FALLBACK
  const country = (identity.location || '').split(',').pop()?.trim() || 'United States'
  const myCompany = (identity.company || '').trim() || `${identity.name.split(' ')[0] || 'Your'} & Co.`
  const domain = `${slug(myCompany)}.com`

  /* ---- the account's own team, led by them ---- */
  const me: LedgerOwner = {
    id: 'me',
    name: identity.name || 'You',
    email: identity.email || `you@${domain}`,
    role: 'Owner',
    region: identity.location || country,
    quota: 0,
    active: true,
  }
  const users: LedgerOwner[] = [me]
  const teamRoles: Array<[LedgerOwner['role'], number]> = [['Sales', int(900, 2400) * 1000], ['Sales', int(700, 1900) * 1000], ['Ops', 0], ['Finance', 0]]
  teamRoles.forEach(([role, quota], i) => {
    const name = `${pick(FIRST)} ${pick(LAST)}`
    users.push({
      id: `usr_${i + 1}`,
      name,
      email: `${slug(name.split(' ')[0] ?? 'team')}@${domain}`,
      role,
      region: country,
      quota,
      active: true,
      starter: true,
    } as LedgerOwner & { starter: boolean })
  })
  me.quota = users.reduce((s, u) => s + u.quota, 0) + int(1200, 3200) * 1000
  const sellers = users.filter(u => u.quota > 0)

  /* ---- companies: real ones first ---- */
  const companies: LedgerCompany[] = source.companies.map((c, i) => ({
    id: `cmp_real_${i + 1}`,
    crmId: c.id,
    name: c.name,
    industry: c.industry || industry,
    size: c.employees || pick(SIZES),
    country: c.location || country,
    website: c.website || `${slug(c.name)}.com`,
    tier: pick(['Strategic', 'Growth', 'Mid-Market', 'SMB'] as const),
    health: int(52, 96),
    arr: 0,
    ownerId: 'me',
    createdAt: c.createdAt || iso(-int(20, 400)),
  }))

  const starterCompanyCount = Math.max(6, 18 - companies.length)
  for (let i = 0; i < starterCompanyCount; i++) {
    const name = `${pick(COMPANY_A)} ${pick(COMPANY_B)}`
    companies.push({
      id: `cmp_${i + 1}`,
      name,
      industry,
      size: pick(SIZES),
      country,
      website: `${slug(name)}.com`,
      tier: pick(['Strategic', 'Growth', 'Mid-Market', 'SMB'] as const),
      health: int(40, 98),
      arr: int(18, 640) * 1000,
      ownerId: pick(sellers).id,
      createdAt: iso(-int(40, 800)),
      starter: true,
    })
  }

  const companyById = new Map(companies.map(c => [c.id, c]))
  const byCrmCompany = new Map(companies.filter(c => c.crmId).map(c => [c.crmId as string, c]))

  /* ---- contacts: real people first ---- */
  const splitName = (full: string) => {
    const parts = full.trim().split(/\s+/)
    return { first: parts[0] ?? 'Contact', last: parts.slice(1).join(' ') || '' }
  }
  const statusFor = (lifecycle: string): LedgerContact['status'] =>
    /customer|partner/i.test(lifecycle) ? 'Champion' : /lead|prospect/i.test(lifecycle) ? 'Active' : 'Active'

  const contacts: LedgerContact[] = source.people.map((p, i) => {
    const { first, last } = splitName(p.fullName)
    const company = p.companyId ? byCrmCompany.get(p.companyId) : undefined
    return {
      id: `con_real_${i + 1}`,
      crmId: p.id,
      firstName: first,
      lastName: last,
      email: p.email || `${slug(first)}@${slug(p.companyName || 'account')}.com`,
      phone: p.phone || '',
      title: p.title || '',
      companyId: company?.id ?? companies[0]?.id ?? 'cmp_1',
      ownerId: 'me',
      status: statusFor(p.lifecycle),
      lastTouch: p.lastActivityAt || p.createdAt || iso(-int(1, 60)),
      createdAt: p.createdAt || iso(-int(10, 300)),
    }
  })

  let contactSeq = 1
  for (const company of companies) {
    if (!company.starter) continue
    for (let i = 0; i < int(2, 4); i++) {
      const first = pick(FIRST)
      const last = pick(LAST)
      contacts.push({
        id: `con_${contactSeq++}`,
        firstName: first,
        lastName: last,
        email: `${slug(first)}.${slug(last)}@${company.website}`,
        phone: `+1 (${int(200, 989)}) ${int(200, 989)}-${int(1000, 9999)}`,
        title: pick(TITLES),
        companyId: company.id,
        ownerId: chance(0.7) ? company.ownerId : pick(sellers).id,
        status: pick(['Active', 'Active', 'Cold', 'Champion', 'Churned'] as const),
        lastTouch: iso(-int(0, 110)),
        createdAt: iso(-int(20, 600)),
        starter: true,
      })
    }
  }
  const contactsByCompany = new Map<string, LedgerContact[]>()
  for (const c of contacts) {
    const list = contactsByCompany.get(c.companyId) ?? []
    list.push(c)
    contactsByCompany.set(c.companyId, list)
  }

  /* ---- deals: real opportunities first ---- */
  const stageFor = (opp: LedgerSourceOpportunity): DealStage => {
    if (opp.status === 'won') return 'Closed Won'
    if (opp.status === 'lost') return 'Closed Lost'
    const named = DEAL_STAGES.find(s => s.toLowerCase() === (opp.stageName || '').toLowerCase())
    if (named) return named
    if (opp.probability >= 70) return 'Negotiation'
    if (opp.probability >= 45) return 'Proposal'
    if (opp.probability >= 25) return 'Qualification'
    return 'Discovery'
  }

  const deals: LedgerDeal[] = source.opportunities.map((o, i) => {
    const company = o.companyId ? byCrmCompany.get(o.companyId) : undefined
    const companyId = company?.id ?? companies[0]?.id ?? 'cmp_1'
    const stage = stageFor(o)
    return {
      id: `dl_real_${i + 1}`,
      crmId: o.id,
      name: o.name,
      companyId,
      contactId: contactsByCompany.get(companyId)?.[0]?.id ?? contacts[0]?.id ?? 'con_1',
      ownerId: 'me',
      stage,
      value: o.amount,
      probability: o.probability || STAGE_PROBABILITY[stage],
      closeDate: o.expectedCloseAt || iso(int(10, 120)),
      createdAt: o.createdAt || iso(-int(10, 200)),
      source: 'Referral',
    }
  })

  let dealSeq = 1
  for (const company of companies) {
    if (!company.starter) continue
    for (let i = 0; i < int(1, 3); i++) {
      const stage = pick(DEAL_STAGES)
      const closed = stage.startsWith('Closed')
      deals.push({
        id: `dl_${dealSeq++}`,
        name: `${company.name} — ${pick(DEAL_THEMES)}`,
        companyId: company.id,
        contactId: contactsByCompany.get(company.id)?.[0]?.id ?? contacts[0]?.id ?? 'con_1',
        ownerId: company.ownerId,
        stage,
        value: int(12, 420) * 1000,
        probability: STAGE_PROBABILITY[stage],
        closeDate: iso(closed ? -int(1, 200) : int(3, 180)),
        createdAt: iso(-int(20, 400)),
        source: pick(SOURCES),
        starter: true,
      })
    }
  }

  /* roll ARR onto real companies from their won deals */
  for (const company of companies) {
    if (company.starter) continue
    company.arr = deals
      .filter(d => d.companyId === company.id && d.stage === 'Closed Won')
      .reduce((s, d) => s + d.value, 0)
  }

  /* ---- leads ---- */
  const leads: LedgerLead[] = []
  for (let i = 0; i < 34; i++) {
    const first = pick(FIRST)
    const last = pick(LAST)
    const company = `${pick(COMPANY_A)} ${pick(COMPANY_B)}`
    leads.push({
      id: `led_${i + 1}`,
      name: `${first} ${last}`,
      email: `${slug(first)}@${slug(company)}.com`,
      company,
      source: pick(SOURCES),
      status: pick(['New', 'New', 'Working', 'Working', 'Qualified', 'Nurture', 'Disqualified', 'Converted'] as const),
      score: int(8, 98),
      value: int(6, 180) * 1000,
      ownerId: pick(sellers).id,
      createdAt: iso(-int(0, 150)),
      starter: true,
    })
  }

  /* ---- activities: real tasks first ---- */
  const activities: LedgerActivity[] = source.tasks.map((t, i) => ({
    id: `act_real_${i + 1}`,
    type: 'Task',
    subject: t.title,
    dueDate: t.dueAt || iso(int(0, 14)),
    done: t.status === 'done',
    ownerId: 'me',
    companyId: (t.companyId ? byCrmCompany.get(t.companyId)?.id : undefined) ?? companies[0]?.id ?? 'cmp_1',
    priority: t.priority === 'high' ? 'High' : t.priority === 'low' ? 'Low' : 'Normal',
  }))

  const starterDeals = deals.filter(d => d.starter)
  for (let i = 0; i < 46 && starterDeals.length; i++) {
    const deal = pick(starterDeals)
    const offset = int(-30, 24)
    activities.push({
      id: `act_${i + 1}`,
      type: pick(['Call', 'Meeting', 'Email', 'Task', 'Demo'] as const),
      subject: pick(ACTIVITY_SUBJECTS),
      dueDate: iso(offset),
      done: offset < 0 ? chance(0.75) : false,
      ownerId: deal.ownerId,
      companyId: deal.companyId,
      dealId: deal.id,
      priority: pick(['Low', 'Normal', 'Normal', 'High'] as const),
    })
  }

  /* ---- products, inventory ---- */
  const products: LedgerProduct[] = catalogueFor(industry).map(([name, category, price, cost], i) => ({
    id: `prd_${i + 1}`,
    sku: `${slug(myCompany).slice(0, 3).toUpperCase()}-${category.slice(0, 2).toUpperCase()}-${1000 + i * 7}`,
    name,
    category,
    price,
    cost,
    active: true,
  }))

  const locations = [identity.location || country, 'Central', 'Regional hub'].filter(Boolean).slice(0, 3)
  const inventory: LedgerInventoryItem[] = []
  let invSeq = 1
  for (const product of products) {
    for (const location of locations) {
      if (chance(0.3)) continue
      const reorderPoint = int(12, 70)
      inventory.push({
        id: `inv_${invSeq++}`,
        productId: product.id,
        location,
        onHand: chance(0.24) ? int(0, reorderPoint) : int(reorderPoint, reorderPoint + int(30, 220)),
        committed: int(0, 30),
        reorderPoint,
        leadTimeDays: int(4, 52),
      })
    }
  }

  /* ---- orders and invoices ---- */
  const orders: LedgerOrder[] = []
  for (let i = 0; i < 48; i++) {
    const company = pick(companies)
    const lines: LedgerOrder['lines'] = []
    for (let l = 0; l < int(1, 3); l++) {
      const product = pick(products)
      lines.push({ productId: product.id, qty: int(1, 8), unitPrice: product.price })
    }
    orders.push({
      id: `ord_${i + 1}`,
      number: `SO-${1200 + i}`,
      companyId: company.id,
      ownerId: company.ownerId,
      status: pick(['Draft', 'Confirmed', 'Confirmed', 'Packing', 'Shipped', 'Delivered', 'Delivered', 'Cancelled'] as const),
      createdAt: iso(-int(0, 330)),
      lines,
    })
  }

  const invoices: LedgerInvoice[] = []
  let invoiceSeq = 0
  for (const order of orders) {
    if (order.status === 'Draft' || order.status === 'Cancelled') continue
    const issuedOffset = -int(1, 300)
    invoices.push({
      id: `inv_doc_${++invoiceSeq}`,
      number: `INV-${2400 + invoiceSeq}`,
      companyId: order.companyId,
      orderId: order.id,
      status: pick(['Sent', 'Paid', 'Paid', 'Paid', 'Overdue', 'Draft', 'Void'] as const),
      issuedAt: iso(issuedOffset),
      dueAt: iso(issuedOffset + 30),
      amount: orderTotal(order),
    })
  }

  /* ---- vendors ---- */
  const vendors: LedgerVendor[] = Array.from({ length: 9 }, (_, i) => {
    const name = `${pick(COMPANY_A)} ${pick(['Supply', 'Cloud', 'Freight', 'Data', 'Advisory', 'Works'])}`
    return {
      id: `ven_${i + 1}`,
      name,
      category: pick(['Software', 'Logistics', 'Data', 'Goods', 'Professional'] as const),
      country,
      leadTimeDays: int(3, 60),
      onTimeRate: int(74, 100),
      spendYTD: int(12, 640) * 1000,
      status: pick(['Preferred', 'Approved', 'Approved', 'Under review'] as const),
    }
  })

  void companyById

  return {
    accountId: identity.accountId,
    builtAt: today.toISOString(),
    users,
    companies,
    contacts,
    leads,
    deals,
    activities,
    products,
    inventory,
    orders,
    invoices,
    vendors,
  }
}
