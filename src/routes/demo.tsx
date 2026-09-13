import { ClientOnly, createFileRoute, Link } from '@tanstack/react-router'

import App from '@/aetheris/App'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/demo')({
  head: () => ({
    meta: [
      { title: 'Guided showcase — Aetheris Intros' },
      {
        name: 'description',
        content:
          'A guided showcase of Aetheris Intros using illustrative example people. Every member in the live network is a real, approved professional.',
      },
      { property: 'og:title', content: 'Guided showcase — Aetheris Intros' },
      { property: 'og:description', content: 'See how relationship context, timing and double opt-in introductions work.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: DemoRoute,
})

function DemoRoute() {
  return <ClientOnly fallback={null}>
    <App mode="demo" />
  </ClientOnly>
}
