import { createFileRoute } from '@tanstack/react-router'

import Landing from '@/aetheris/Landing'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/')({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: 'Ask Intros — The Relationship Network for CEOs' },
      {
        name: 'description',
        content:
          'Ask Intros is the relationship network for CEOs. Who matters. Why they matter. Why now.',
      },
      { property: 'og:title', content: 'Ask Intros — The Relationship Network for CEOs' },
      {
        property: 'og:description',
        content: 'Who matters. Why they matter. Why now.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { property: 'og:url', content: 'https://askintros.vip/' },
      { property: 'og:image', content: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&h=630&q=80' },
      { name: 'twitter:image', content: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&h=630&q=80' },
    ],
    links: [{ rel: 'canonical', href: 'https://askintros.vip/' }],
  }),
  component: Landing,
})
