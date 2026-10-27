/** Public product identity. Keep titles, visible explanations and structured data aligned. */
export const PUBLIC_ORIGIN = 'https://askintros.vip'
export const PRODUCT_TITLE = 'Ask Intros | CEO & Executive Networking, Warm Introductions'
export const PRODUCT_DESCRIPTION = 'Ask Intros is the executive networking platform for CEOs, founders and business owners. Share what you need, discover who can help, and meet through warm, double opt-in introductions.'
export const PUBLIC_IMAGE = `${PUBLIC_ORIGIN}/ask-intros-social.jpg`

export function publicPageHead(title: string, description: string, path: string) {
  const url = new URL(path, PUBLIC_ORIGIN).href
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: 'index,follow,max-image-preview:large' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Ask Intros' },
      { property: 'og:url', content: url },
      { property: 'og:image', content: PUBLIC_IMAGE },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: PUBLIC_IMAGE },
    ],
    links: [{ rel: 'canonical', href: url }],
  }
}

/** Entity information only: no invented reviews, prices, certifications or search actions. */
export function publicStructuredData(path: string, title: string, description: string) {
  const url = new URL(path, PUBLIC_ORIGIN).href
  const organization = `${PUBLIC_ORIGIN}/#organization`
  const website = `${PUBLIC_ORIGIN}/#website`
  const graph: Record<string, unknown>[] = [
    { '@type': 'Organization', '@id': organization, name: 'Ask Intros', url: `${PUBLIC_ORIGIN}/`, logo: `${PUBLIC_ORIGIN}/ask-intros-logo-wide.jpg` },
    { '@type': 'WebSite', '@id': website, name: 'Ask Intros', url: `${PUBLIC_ORIGIN}/`, publisher: { '@id': organization }, inLanguage: 'en' },
    { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, description, isPartOf: { '@id': website }, about: { '@id': organization }, inLanguage: 'en', ...(path !== '/' ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}) },
  ]
  if (path !== '/') graph.push({
    '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ask Intros', item: `${PUBLIC_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: title.split(' | ')[0], item: url },
    ],
  })
  return { '@context': 'https://schema.org', '@graph': graph }
}

export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
