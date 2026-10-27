// Column auto-match for contact and company imports.
// Exact aliases win first across all fields, then word-level matches; each column is used once.

export type MapTarget = 'people' | 'companies'

const norm = (h: string) => h.toLowerCase().replace(/[_\-./]+/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

const ALIASES: Record<MapTarget, Record<string, string[]>> = {
  people: {
    firstName: ['first name', 'firstname', 'first', 'given name', 'forename', 'fname'],
    lastName: ['last name', 'lastname', 'last', 'surname', 'family name', 'lname'],
    fullName: ['full name', 'fullname', 'name', 'contact name', 'contact', 'person', 'display name', 'person name'],
    email: ['email', 'email address', 'e mail', 'e mail address', 'work email', 'primary email', 'email 1 value', 'business email', 'personal email', 'mail'],
    phone: ['phone', 'phone number', 'mobile', 'mobile phone', 'mobile phone number', 'cell', 'telephone', 'tel', 'work phone', 'business phone', 'phone 1 value', 'primary phone'],
    title: ['title', 'job title', 'jobtitle', 'position', 'role', 'occupation', 'designation', 'organization title', 'headline'],
    companyName: ['company', 'company name', 'organization', 'organisation', 'organization name', 'organization 1 name', 'employer', 'account', 'account name', 'business', 'firm'],
    location: ['location', 'city', 'country', 'region', 'state', 'address', 'country region', 'city state'],
    linkedinUrl: ['linkedin', 'linkedin url', 'linkedin profile', 'profile url', 'linkedin profile url', 'url'],
    socials: ['twitter', 'x', 'twitter url', 'x url', 'instagram', 'facebook', 'tiktok', 'website', 'personal website', 'social', 'socials', 'social profiles'],
    notes: ['notes', 'note', 'comments', 'comment', 'description'],
  },
  companies: {
    name: ['company', 'company name', 'name', 'account', 'account name', 'organization', 'organisation', 'business'],
    domain: ['domain', 'company domain', 'company domain name'],
    website: ['website', 'website url', 'url', 'site', 'web'],
    industry: ['industry', 'sector', 'vertical'],
    location: ['location', 'city', 'country', 'hq', 'headquarters', 'address'],
    phone: ['phone', 'phone number', 'tel', 'telephone'],
    employees: ['employees', 'number of employees', 'headcount', 'size', 'company size'],
    revenueBand: ['revenue', 'revenue band', 'annual revenue'],
    notes: ['notes', 'note', 'comments', 'description'],
  },
}

// Words that, inside a header, point at a specific field (used when no exact alias matches).
const WORDS: Record<MapTarget, Array<[string, RegExp]>> = {
  people: [
    ['email', /\be ?mail\b/], ['phone', /\b(phone|mobile|cell|tel)\b/], ['linkedinUrl', /linkedin/],
    ['firstName', /\b(first|given)\b/], ['lastName', /\b(last|surname|family)\b/],
    ['companyName', /\b(company|organi[sz]ation|employer|account)\b/], ['title', /\b(title|position|role|job)\b/],
    ['socials', /\b(twitter|instagram|facebook|tiktok|social|website|youtube)\b/], ['location', /\b(city|country|location|region|state)\b/], ['notes', /\b(notes?|comments?)\b/], ['fullName', /\bname\b/],
  ],
  companies: [
    ['domain', /domain/], ['website', /\b(website|url)\b/], ['industry', /\b(industry|sector)\b/],
    ['employees', /\b(employees|headcount)\b/], ['revenueBand', /revenue/], ['phone', /\bphone\b/],
    ['location', /\b(city|country|location)\b/], ['name', /\b(company|name|account)\b/],
  ],
}

export function autoMapColumns(headers: string[], target: MapTarget, sample: string[][] = []): Record<string, number> {
  const h = headers.map(norm)
  const out: Record<string, number> = {}
  const used = new Set<number>()
  // Pass 1: exact aliases, in alias priority order.
  for (const [field, aliases] of Object.entries(ALIASES[target])) {
    for (const alias of aliases) {
      const i = h.findIndex((x, idx) => !used.has(idx) && x === alias)
      if (i >= 0) { out[field] = i; used.add(i); break }
    }
  }
  // Pass 2: keyword matches for anything still unmatched.
  for (const [field, re] of WORDS[target]) {
    if (field in out) continue
    const i = h.findIndex((x, idx) => !used.has(idx) && re.test(x))
    if (i >= 0) { out[field] = i; used.add(i) }
  }
  // Pass 3: read the cells themselves for columns with unhelpful headers ("Column 3", blanks).
  if (target === 'people' && sample.length) {
    const share = (i: number, re: RegExp) => {
      const vals = sample.map(r => (r[i] ?? '').trim()).filter(Boolean)
      return vals.length ? vals.filter(v => re.test(v)).length / vals.length : 0
    }
    const sniff: Array<[string, RegExp]> = [
      ['email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/],
      ['linkedinUrl', /linkedin\.com\//i],
      ['socials', /(twitter\.com|x\.com|instagram\.com|facebook\.com|tiktok\.com|youtube\.com)\//i],
      ['phone', /^\+?[\d\s().-]{7,20}$/],
      ['fullName', /^[A-Za-zÀ-ÿ'.-]+(\s+[A-Za-zÀ-ÿ'.-]+){1,3}$/],
    ]
    for (const [field, re] of sniff) {
      if (field in out) continue
      if (field === 'fullName' && ('firstName' in out || 'lastName' in out)) continue
      let best = -1, bestShare = 0
      headers.forEach((_, i) => { if (used.has(i)) return; const s = share(i, re); if (s > bestShare) { best = i; bestShare = s } })
      if (best >= 0 && bestShare >= 0.6) { out[field] = best; used.add(best) }
    }
  }
  // A "name" column alongside first/last names is the full name; without first/last it still is.
  return out
}
