import { createFileRoute, Outlet } from '@tanstack/react-router'
import '@/aetheris/styles.css'
import '@/aetheris/public-news.css'

export const Route = createFileRoute('/news')({ component: () => <Outlet /> })
