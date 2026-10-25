import { publicStructuredData, serializeStructuredData } from '@/lib/public-search'

export function PublicStructuredData({ path, title, description }: { path: string; title: string; description: string }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(publicStructuredData(path, title, description)) }} />
}
