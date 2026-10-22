import { describe, expect, it } from 'vitest'
import { selectDirectoryMembers, directoryDistribution, type DirectoryFilters } from '../directory-model'
import { NETWORK_MEMBERS } from '../networkData'

const source = NETWORK_MEMBERS[0]
if (!source) throw new Error('Missing directory fixture')
const a = { ...source, id: 'a', name: 'Actual Founder', company: 'Real Co', location: 'London', industry: 'Climate', roleType: 'founder' as const, tier: 'Core' as const, matchScore: 40, mutualConnectionsCount: 3, focusAreas: ['Energy'] }
const b = { ...source, id: 'b', name: 'Actual Investor', company: 'Other Co', location: 'Boston', industry: 'Finance', roleType: 'investor' as const, tier: 'Extended' as const, matchScore: 80, mutualConnectionsCount: 1, focusAreas: ['Infrastructure'] }
const filters: DirectoryFilters = { keyword: '', roles: [], city: 'All', industry: 'All', tier: 'All', sort: 'relevance' }
describe('authorized directory presentation', () => {
  it('retains caller order for relevance without mutating input', () => { const rows=[a,b]; expect(selectDirectoryMembers(rows,filters).map(m=>m.id)).toEqual(['a','b']); expect(rows).toEqual([a,b]); })
  it('matches trimmed case-insensitive keywords in supplied identity and focus', () => { expect(selectDirectoryMembers([a,b],{...filters,keyword:'  INFRASTRUCTURE  '})).toEqual([b]); })
  it('combines role, tier, city and industry filters', () => { expect(selectDirectoryMembers([a,b],{...filters,roles:['founder'],tier:'Core',city:'London',industry:'Climate'})).toEqual([a]); expect(selectDirectoryMembers([a,b],{...filters,roles:['investor'],tier:'Core'})).toEqual([]); })
  it('sorts fit and mutuals by supplied values', () => { expect(selectDirectoryMembers([a,b],{...filters,sort:'match'})).toEqual([b,a]); expect(selectDirectoryMembers([a,b],{...filters,sort:'mutuals'})).toEqual([a,b]); })
  it('counts only nonempty supplied locations without invented geography', () => { expect(directoryDistribution([a,b,{...a,id:'c'},{...b,id:'d',location:''}], 'location')).toEqual([['London',2],['Boston',1]]); })
})