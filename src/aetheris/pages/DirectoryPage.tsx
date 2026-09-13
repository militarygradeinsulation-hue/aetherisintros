import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Building2, Search } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Btn, Eyebrow, Head } from '../ui'

type Tab = 'people' | 'companies'

interface ContactRow {
  id: string
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

const place = (row: CompanyRow) => [row.city, row.region, row.country].filter(Boolean).join(', ')

/**
 * Starter lookup directory. Every row here is imported reference data or a
 * signed-up member — never generated. Only signed-in members can read it.
 */
export function DirectoryPage() {
  const [tab, setTab] = useState<Tab>('people')
  const [query, setQuery] = useState('')
  const [membersOnly, setMembersOnly] = useState(false)
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [counts, setCounts] = useState<{ people: number; companies: number; members: number }>({ people: 0, companies: 0, members: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let live = true
    void (async () => {
      const [people, comps, members] = await Promise.all([
        supabase.from('directory_contacts').select('id', { count: 'exact', head: true }),
        supabase.from('directory_companies').select('id', { count: 'exact', head: true }),
        supabase.from('directory_contacts').select('id', { count: 'exact', head: true }).eq('is_member', true),
      ])
      if (!live) return
      setCounts({ people: people.count ?? 0, companies: comps.count ?? 0, members: members.count ?? 0 })
    })()
    return () => { live = false }
  }, [])

  useEffect(() => {
    let live = true
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true)
        const term = query.trim()
        if (tab === 'people') {
          let q = supabase
            .from('directory_contacts')
            .select('id, full_name, title, company_name, industry, location, seniority, is_member')
            .order('is_member', { ascending: false })
            .limit(60)
          if (membersOnly) q = q.eq('is_member', true)
          if (term) q = q.or(`full_name.ilike.%${term}%,company_name.ilike.%${term}%,title.ilike.%${term}%,industry.ilike.%${term}%,location.ilike.%${term}%`)
          const { data } = await q
          if (live) setContacts((data ?? []) as ContactRow[])
        } else {
          let q = supabase
            .from('directory_companies')
            .select('id, name, industry, city, region, country, website')
            .order('name')
            .limit(60)
          if (term) q = q.or(`name.ilike.%${term}%,industry.ilike.%${term}%,city.ilike.%${term}%,country.ilike.%${term}%`)
          const { data } = await q
          if (live) setCompanies((data ?? []) as CompanyRow[])
        }
        if (live) setLoading(false)
      })()
    }, 250)
    return () => { live = false; clearTimeout(timer) }
  }, [query, tab, membersOnly])

  const proof = useMemo(
    () => `${counts.people.toLocaleString()} people · ${counts.companies.toLocaleString()} companies · ${counts.members.toLocaleString()} of them are members here`,
    [counts],
  )

  return <>
    <Head
      label="DIRECTORY"
      title="Look someone up before you ever reach out."
      copy="A reference directory of companies and people, so the network is useful on your first day. Members are marked. Reference records are lookup context only — no mass outreach, no exports, no cold sequences."
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

    {tab === 'people' && <section className="directory-list">
      {contacts.map(row => <article key={row.id} className="module directory-card">
        <div className="directory-mark">{initials(row.full_name)}</div>
        <div className="directory-body">
          <Eyebrow>{row.is_member ? 'MEMBER' : 'REFERENCE RECORD'}</Eyebrow>
          <h3>{row.full_name} {row.is_member && <BadgeCheck size={14} />}</h3>
          <small>{[row.title, row.company_name].filter(Boolean).join(' · ') || 'No stated role'}</small>
          <p>{[row.industry, row.location, row.seniority].filter(Boolean).join(' · ') || 'No further context on record.'}</p>
        </div>
      </article>)}
      {!loading && contacts.length === 0 && <p className="empty-state">Nobody matches that yet. Try a company, a city or a job title.</p>}
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
      {!loading && companies.length === 0 && <p className="empty-state">No company matches that yet. Try a shorter search.</p>}
    </section>}
  </>
}
