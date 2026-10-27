import { createFileRoute } from '@tanstack/react-router'
import { PublicProductPage } from '@/aetheris/PublicProductPage'
import { publicProductPages } from '@/aetheris/public-product-content'
import { publicPageHead } from '@/lib/public-search'

const page = publicProductPages[5]!
export const Route = createFileRoute('/ai-networking-assistant')({
  staticData: { sitemap: true },
  head: () => publicPageHead(page.title, page.description, page.path),
  component: () => <PublicProductPage page={page} />,
})
