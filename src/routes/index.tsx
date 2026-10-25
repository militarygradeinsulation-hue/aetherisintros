import { createFileRoute } from '@tanstack/react-router'
import Landing from '@/aetheris/Landing'
import { publicPageHead, PRODUCT_TITLE, PRODUCT_DESCRIPTION } from '@/lib/public-search'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/')({
  staticData: { sitemap: true },
  head: () => publicPageHead(PRODUCT_TITLE, PRODUCT_DESCRIPTION, '/'),
  component: Landing,
})
