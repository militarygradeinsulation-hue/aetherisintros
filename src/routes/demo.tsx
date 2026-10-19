import { ClientOnly, createFileRoute } from '@tanstack/react-router'

import IntrosApp from '@/intros-ui/IntrosApp'
import { AetherisProviderRoot } from '@/aetheris/AetherisProviderRoot'

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
      { property: 'og:title', content: 'Ask Intros CEO Network — Guided Showcase' },
      { property: 'og:description', content: 'Explore the Ask Intros showcase: relationships, introductions and active memory for CEOs.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { property: 'og:url', content: 'https://askintros.vip/demo' },
    ],
    links: [{ rel: 'canonical', href: 'https://askintros.vip/demo' }],
  }),
  component: DemoRoute,
})

function DemoRoute() {
  return <ClientOnly fallback={null}>
    <AetherisProviderRoot mode="demo"><IntrosApp /></AetherisProviderRoot>
  </ClientOnly>
}
