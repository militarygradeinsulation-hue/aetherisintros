import type { ReactNode } from 'react'

import { IntrosSystemFeatures } from '@/components/blocks/intros-system-features'
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
// The board keeps a stable layout across desktop and mobile, including
// long-press and keyboard reordering. It is the same grid used by the live
// member home, rather than a second, simplified dashboard implementation.
import { DraggableWidgetGrid, type WidgetItem, type WidgetSize } from '@/components/ui/widget-board'

export function IntrosSystemBento({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <BentoGrid className={`intros-system-bento ${className}`}>{children}</BentoGrid>
}

export { BentoGridItem }

export function IntrosWidgetGrid({ items, editable, onChange, renderItem, className = '', maxColumns = 4, cellSize = 176, gap = 14 }: {
  items: WidgetItem[]
  editable: boolean
  onChange: (items: WidgetItem[]) => void
  renderItem: (item: WidgetItem, size: WidgetSize) => ReactNode
  className?: string
  maxColumns?: number
  cellSize?: number
  gap?: number
}) {
  return <DraggableWidgetGrid items={items} editable={editable} onChange={onChange} renderItem={renderItem}
    maxColumns={maxColumns} cellSize={cellSize} gap={gap} radius={8} className={className} />
}

export function IntrosSystemGrid({ items, editable, onChange, renderItem, showFeatures = false }: {
  items: WidgetItem[]
  editable: boolean
  onChange: (items: WidgetItem[]) => void
  renderItem: (item: WidgetItem, size: WidgetSize) => ReactNode
  showFeatures?: boolean
}) {
  return <div className="intros-system-grid">
    <IntrosWidgetGrid items={items} editable={editable} onChange={onChange} renderItem={renderItem} />
    {showFeatures && <IntrosSystemFeatures compact />}
  </div>
}
