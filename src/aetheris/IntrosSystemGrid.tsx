import type { ReactNode } from 'react'

import { IntrosSystemFeatures } from '@/components/blocks/intros-system-features'
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import { DraggableWidgetGrid, type WidgetItem } from '@/components/ui/draggable-widget-grid'

export function IntrosSystemBento({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <BentoGrid className={`intros-system-bento ${className}`}>{children}</BentoGrid>
}

export { BentoGridItem }

export function IntrosWidgetGrid({ items, editable, onChange, renderItem, className = '' }: {
  items: WidgetItem[]
  editable: boolean
  onChange: (items: WidgetItem[]) => void
  renderItem: (item: WidgetItem, index: number) => ReactNode
  className?: string
}) {
  return <DraggableWidgetGrid items={items} editable={editable} onChange={onChange} renderItem={renderItem}
    maxColumns={4} cellSize={176} gap={14} radius={8} className={className} />
}

export function IntrosSystemGrid({ items, editable, onChange, renderItem, showFeatures = false }: {
  items: WidgetItem[]
  editable: boolean
  onChange: (items: WidgetItem[]) => void
  renderItem: (item: WidgetItem, index: number) => ReactNode
  showFeatures?: boolean
}) {
  return <div className="intros-system-grid">
    <IntrosWidgetGrid items={items} editable={editable} onChange={onChange} renderItem={renderItem} />
    {showFeatures && <IntrosSystemFeatures compact />}
  </div>
}