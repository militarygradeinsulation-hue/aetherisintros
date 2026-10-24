import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const crm=readFileSync(new URL('../../pages/CrmPage.tsx',import.meta.url),'utf8')
const bento=readFileSync(new URL('../../../components/ui/crm-overview-bento.tsx',import.meta.url),'utf8')

describe('canonical CRM bento integration',()=>{
 it('puts colored live-data panels on the actual CRM route, not just optional local ERP',()=>{
   expect(crm).toContain('<CrmOverviewBento')
   expect(crm).toContain('opportunities={opportunities}')
   expect(crm).toContain('stages={stages}')
   expect(crm).toContain('peopleCount={people.length}')
   expect(bento).toContain('Value entering the pipeline')
   expect(bento).toContain('noOpportunityData')
 })
 it('keeps private relationship data and no fake invoice/portfolio claims',()=>{
   expect(bento).toContain('No invented invoice or portfolio balances')
   expect(bento).toContain('status === "won"')
   expect(bento).toContain('status === "open"')
   expect(bento).not.toContain('Bitcoin')
   expect(bento).not.toContain('Rent')
 })
})
