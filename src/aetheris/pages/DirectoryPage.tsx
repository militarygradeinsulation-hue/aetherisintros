import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, BadgeCheck, Building2, Search, X } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import {
  EMPTY_FILTERS, PAGE_SIZE, activeFilterCount, groupFacets, memberContext, searchArgs, totalOf,
  type DirectoryFilters, type FacetGroups, type FacetRow, type MemberSearchRow,
} from '../directory-filters'
import { Btn, Eyebrow, Head } from '../ui'
import { useNetwork } from '../store'
import { useNav } from '../nav'

type Tab = 'people' | 'companies'

interface ContactRow {
  id: string
  user_id: string | null
  full_name: string
  title: string
  company_name: string
  industry: string
  location: string
  seniority: string
  is_member: boolean
}

interface CompanyRow {
  id: string
  name: string
  industry: string
  city: string
  region: string
  country: string
  website: string
}

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase() || 'M'

const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
const NO_FACETS: FacetGroups = { industry: [], location: [], expertise: [] }

const place = (row: CompanyRow) => [row.city, row.region, row.country].filter(Boolean).join(', ')

/**
 * Starter lookup directory. Every row here is imported reference data or a
 * signed-up member — never generated. Only signed-in members can read it.
 */
export function DirectoryPage() {
  const net = useNetwork()
  const nav = useNav()
  const [tab, setTab] = useState<Tab>('people')
  const [query, setQuery] = useState('')
  const [membersOnly, setMembersOnly] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [counts, setCounts] = useState<{ people: number; companies: number; members: number }>({ people: 0, companies: 0, members: 0 })
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [filters, setFilters] = useState<DirectoryFilters>(EMPTY_FILTERS)
  const [facets, setFacets] = useState<FacetGroups>(NO_FACETS)
  const [found, setFound] = useState<MemberSearchRow[]>([])
  const [page, setPage] = useState(0)
  const memberSearch = tab === 'people' && membersOnly
  const setFilter = <K extends keyof DirectoryFilters>(key: K, value: DirectoryFilters[K]) => setFilters(f => ({ ...f, [key]: value }))
  const filterCount = activeFilterCount(filters)

  useEffect(() => {
    let live = true
    void db.rpc('member_directory_facets').then(({ data }: { data: FacetRow[] | null }) => { if (live) setFacets(groupFacets(data)) })
    return () => { live = false }
  }, [])

  // Members: one structured search on the server (only fields members can already see).
  useEffect(() => { setPage(0) }, [filters, memberSearch])
  useEffect(() => {
    if (!memberSearch) return
    let live = true
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true)
        const { data, error } = await db.rpc('search_members', searchArgs({ ...filters, query }, page))
        if (!live) return
        setLoadError(error ? 'The directory could not be loaded. Sign in with a verified membership to search it.' : '')
        const rows = (data ?? []) as MemberSearchRow[]
        setFound(prev => (page === 0 ? rows : [...prev, ...rows.filter(r => !prev.some(p => p.id === r.id))]))
        setLoading(false)
      })()
    }, 250)
    return () => { live = false; clearTimeout(timer) }
  }, [memberSearch, filters, query, page])
  useEffect(() => { setPage(0) }, [query])
  const foundTotal = page === 0 ? totalOf(found) : Math.max(totalOf(found), found.length)

  useEffect(() => {
    let live = true
    void (async () => {
      const { data: authData } = await supabase.auth.getUser()
      const [people, comps, members] = await Promise.all([
        supabase.from('directory_contacts').select('id', { count: 'exact', head: true }),
        supabase.from('directory_companies').select('id', { count: 'exact', head: true }),
        supabase.from('directory_contacts').select('id', { count: 'exact', head: true }).eq('is_member', true),
      ])
      if (!live) return
      setCurrentUserId(authData.user?.id ?? null)
      setCounts({ people: people.count ?? 0, companies: comps.count ?? 0, members: members.count ?? 0 })
    })()
    return () => { live = false }
  }, [])

  useEffect(() => {
    if (memberSearch) return
    let live = true
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true)
        const term = query.trim()
        if (tab === 'people') {
          let q = supabase
            .from('directory_contacts')
            .select('id, user_id, full_name, title, company_name, industry, location, seniority, is_member')
            .order('is_member', { ascending: false })
            .limit(60)
          if (membersOnly) q = q.eq('is_member', true)
          if (term) q = q.or(`full_name.ilike.%${term}%,company_name.ilike.%${term}%,title.ilike.%${term}%,industry.ilike.%${term}%,location.ilike.%${term}%`)
          const { data, error } = await q
          if (live) setLoadError(error ? 'The directory could not be loaded. Sign in with a verified membership to search it.' : '')
          if (live) setContacts((data ?? []) as ContactRow[])
        } else {
          let q = supabase
            .from('directory_companies')
            .select('id, name, industry, city, region, country, website')
            .order('name')
            .limit(60)
          if (term) q = q.or(`name.ilike.%${term}%,industry.ilike.%${term}%,city.ilike.%${term}%,country.ilike.%${term}%`)
          const { data, error } = await q
          if (live) setLoadError(error ? 'The directory could not be loaded. Sign in with a verified membership to search it.' : '')
          if (live) setCompanies((data ?? []) as CompanyRow[])
        }
        if (live) setLoading(false)
      })()
    }, 250)
    return () => { live = false; clearTimeout(timer) }
  }, [query, tab, membersOnly, memberSearch])

  const proof = useMemo(
    () => `${counts.people.toLocaleString()} people · ${counts.companies.toLocaleString()} companies · ${counts.members.toLocaleString()} of them are members here`,
    [counts],
  )

  return <>
    <Head
      label="DIRECTORY"
      title="Every member, clearly searchable."
      copy="Find everyone who has joined Ask Intros by name, company, role, industry or location, then open their full profile. Reference records remain available separately for context."
      proof={proof}
      action={<Btn kind="secondary" onClick={() => setMembersOnly(m => !m)}>{membersOnly ? 'Show everyone' : 'Members only'}</Btn>}
    />

    <div className="filter-chips">
      {(['people', 'companies'] as Tab[]).map(t =>
        <button key={t} className={`chip ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
          {t === 'people' ? 'People' : 'Companies'}
        </button>)}
    </div>

    <label className="need-search"><Search size={14} /> Search the directory
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={tab === 'people' ? 'Name, company, title, city' : 'Company, industry, city'}
      />
    </label>

    {memberSearch && <section className="dir-filters" aria-label="Filter members">
      <label>Industry
        <select value={filters.industry} onChange={e => setFilter('industry', e.target.value)}>
          <option value="">Any industry</option>
          {facets.industry.map(f => <option key={f.value} value={f.value}>{f.value} ({f.members})</option>)}
        </select>
      </label>
      <label>Location
        <input list="dir-locations" value={filters.location} maxLength={120} onChange={e => setFilter('location', e.target.value)} placeholder="City or region" />
        <datalist id="dir-locations">{facets.location.map(f => <option key={f.value} value={f.value}>{`${f.members} members`}</option>)}</datalist>
      </label>
      <label>Can help with
        <input list="dir-expertise" value={filters.expertise} maxLength={80} onChange={e => setFilter('expertise', e.target.value)} placeholder="Pricing, hiring, exits" />
        <datalist id="dir-expertise">{facets.expertise.map(f => <option key={f.value} value={f.value}>{`${f.members} members`}</option>)}</datalist>
      </label>
      <label>Looking for
        <input value={filters.lookingFor} maxLength={200} onChange={e => setFilter('lookingFor', e.target.value)} placeholder="Investors, a CFO, partners" />
      </label>
      <label className="dir-check">
        <input type="checkbox" checked={filters.verifiedOnly} onChange={e => setFilter('verifiedOnly', e.target.checked)} /> Verified only
      </label>
      {filterCount > 0 && <button type="button" className="dir-clear" onClick={() => setFilters(EMPTY_FILTERS)}><X size={12} /> Clear {filterCount}</button>}
      <p className="dir-note">Search covers the profile details members already see. Hidden profiles and email addresses are never searchable. Filter lists only show values at least three members share.</p>
    </section>}

    {loadError && <p className="empty-state" role="alert">{loadError}</p>}

    {memberSearch && !loadError && <section className="directory-list">
      {found.length > 0 && <small className="dir-count">{foundTotal.toLocaleString()} {foundTotal === 1 ? 'member' : 'members'}</small>}
      {found.map(row => {
        const member = net.members.find(person => person.id === row.id)
        const isMe = row.id === currentUserId
        return <article key={row.id} className="module directory-card directory-member">
          <div className="directory-mark">{row.initials || initials(row.name)}</div>
          <div className="directory-body">
            <Eyebrow>{isMe ? 'YOUR PROFILE' : row.verified ? 'VERIFIED MEMBER' : 'MEMBER'}</Eyebrow>
            <h3>{row.name} {row.verified && <BadgeCheck size={14} aria-label="Verified" />}</h3>
            <small>{[row.title, row.company].filter(Boolean).join(' · ') || 'No stated role'}</small>
            <p>{memberContext(row) || 'No further context on record.'}</p>
            {row.can_help_with && <p className="dir-line"><b>Can help with</b> {row.can_help_with}</p>}
            {row.looking_for && <p className="dir-line"><b>Looking for</b> {row.looking_for}</p>}
            {isMe
              ? <Btn kind="secondary" onClick={() => nav.setPage('profile')}>View my profile <ArrowUpRight size={13} /></Btn>
              : member && <Btn kind="secondary" onClick={() => nav.openMember(member)}>View profile <ArrowUpRight size={13} /></Btn>}
          </div>
        </article>
      })}
      {!loading && found.length === 0 && <p className="empty-state">{filterCount || query.trim()
        ? 'No members match those filters. Remove one or try a broader location.'
        : 'No members are listed yet. Invite someone you trust from Introductions.'}</p>}
      {found.length < foundTotal && <Btn kind="secondary" onClick={() => setPage(p => p + 1)}>{loading ? 'Loading…' : `Show ${Math.min(PAGE_SIZE, foundTotal - found.length)} more`}</Btn>}
    </section>}

    {tab === 'people' && !membersOnly && <section className="directory-list">
      {contacts.map(row => {
        const member = row.user_id ? net.members.find(person => person.id === row.user_id) : undefined
        const isMe = Boolean(row.user_id && row.user_id === currentUserId)
        return <article key={row.id} className={`module directory-card ${row.is_member ? 'directory-member' : ''}`}>
        <div className="directory-mark">{initials(row.full_name)}</div>
        <div className="directory-body">
          <Eyebrow>{isMe ? 'YOUR PROFILE' : row.is_member ? 'AETHERIS MEMBER' : 'REFERENCE RECORD'}</Eyebrow>
          <h3>{row.full_name} {row.is_member && <BadgeCheck size={14} />}</h3>
          <small>{[row.title, row.company_name].filter(Boolean).join(' · ') || 'No stated role'}</small>
          <p>{[row.industry, row.location, row.seniority].filter(Boolean).join(' · ') || 'No further context on record.'}</p>
          {isMe
            ? <Btn kind="secondary" onClick={() => nav.setPage('profile')}>View my profile <ArrowUpRight size={13} /></Btn>
            : member
              ? <Btn kind="secondary" onClick={() => nav.openMember(member)}>View profile <ArrowUpRight size={13} /></Btn>
              : row.is_member && <small className="directory-profile-note">Profile setup is not finished yet.</small>}
        </div>
      </article>})}
      {!loading && !loadError && contacts.length === 0 && <p className="empty-state">Nobody matches that yet. Try a company, a city or a job title.</p>}
    </section>}

    {tab === 'companies' && <section className="directory-list">
      {companies.map(row => <article key={row.id} className="module directory-card">
        <div className="directory-mark"><Building2 size={16} /></div>
        <div className="directory-body">
          <Eyebrow>{row.industry || 'INDUSTRY NOT STATED'}</Eyebrow>
          <h3>{row.name}</h3>
          <small>{place(row) || 'Location not on record'}</small>
          {row.website && <p>{row.website}</p>}
        </div>
      </article>)}
      {!loading && !loadError && companies.length === 0 && <p className="empty-state">No company matches that yet. Try a shorter search.</p>}
    </section>}
  </>
}
