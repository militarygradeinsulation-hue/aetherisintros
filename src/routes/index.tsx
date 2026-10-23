import { createFileRoute } from '@tanstack/react-router'

import { Vision } from './vision'
import '@/aetheris/styles.css'

const description = 'Share what you need, discover relevant business connections, and request introductions with mutual consent.'

export const Route = createFileRoute('/')({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: 'Ask Intros — One Connected System for CEOs' },
      {
        name: 'description',
        content:
          description,
      },
      { property: 'og:title', content: 'Ask Intros — The Relationship Network for CEOs' },
      {
        property: 'og:description',
        content: description,
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:description', content: description },
      { property: 'og:url', content: 'https://askintros.vip/' },
    ],
    links: [{ rel: 'canonical', href: 'https://askintros.vip/' }],
  }),
  component: Vision,
})
