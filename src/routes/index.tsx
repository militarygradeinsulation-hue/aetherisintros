import { createFileRoute } from '@tanstack/react-router'

import Landing from '@/aetheris/Landing'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/')({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: 'Aetheris Intros — Business networking without the spam' },
      {
        name: 'description',
        content:
          'Aetheris Intros is a private professional network where introductions need both sides to agree. No selling, no mass outreach, no bought attention. Founding 1,000 now open.',
      },
      { property: 'og:title', content: 'Aetheris Intros — Business networking without the spam' },
      {
        property: 'og:description',
        content: 'Know who matters. Know why now. A network that protects your attention.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { property: 'og:url', content: 'https://intros.today/' },
    ],
    links: [{ rel: 'canonical', href: 'https://intros.today/' }],
  }),
  component: Landing,
})
