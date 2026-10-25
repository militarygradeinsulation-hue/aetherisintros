import { createFileRoute } from '@tanstack/react-router'
import { PublicProductPage } from '@/aetheris/PublicProductPage'
import { publicProductPages } from '@/aetheris/public-product-content'
import { publicPageHead } from '@/lib/public-search'

const page = publicProductPages[2]!
export const Route = createFileRoute('/active-memory')({
  staticData: { sitemap: true },
  head: () => publicPageHead(page.title, page.description, page.path),
  component: () => <PublicProductPage page={page} />,
})
