import { ClientOnly, createFileRoute } from '@tanstack/react-router'

import App from '@/aetheris/App'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/demo')({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: 'Ask Intros CEO Network — Guided Showcase' },
      {
        name: 'description',
        content:
          'Explore Ask Intros, the relationship network for CEOs. Who matters. Why they matter. Why now.',
      },
      { property: 'og:title', content: 'Ask Intros — The Relationship Network for CEOs' },
      { property: 'og:description', content: 'Who matters. Why they matter. Why now.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { property: 'og:url', content: 'https://intros.today/demo' },
    ],
    links: [{ rel: 'canonical', href: 'https://intros.today/demo' }],
  }),
  component: DemoRoute,
})

function DemoRoute() {
  return <ClientOnly fallback={null}>
    <App mode="demo" />
  </ClientOnly>
}
