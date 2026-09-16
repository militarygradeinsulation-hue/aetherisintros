import { createFileRoute } from '@tanstack/react-router'

import Landing from '@/aetheris/Landing'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/')({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: 'Aetheris Intros — The Relationship Network for CEOs' },
      {
        name: 'description',
        content:
          'Aetheris Intros is the relationship network for CEOs. Who matters. Why they matter. Why now.',
      },
      { property: 'og:title', content: 'Aetheris Intros — The Relationship Network for CEOs' },
      {
        property: 'og:description',
        content: 'Who matters. Why they matter. Why now.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { property: 'og:url', content: 'https://intros.today/' },
    ],
    links: [{ rel: 'canonical', href: 'https://intros.today/' }],
  }),
  component: Landing,
})
