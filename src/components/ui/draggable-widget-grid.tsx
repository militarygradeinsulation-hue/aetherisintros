'use client'

import * as React from 'react'
import { GripVertical } from 'lucide-react'
import { MotionConfig, motion, useDragControls, type PanInfo } from 'motion/react'

import { cn } from '@/lib/utils'

export type WidgetSize = 'sm' | 'wide' | 'tall' | 'lg'

export interface WidgetItem {
  id: string
  size: WidgetSize
  label?: string
}

interface DraggableWidgetGridProps {
  items?: WidgetItem[]
  onChange?: (items: WidgetItem[]) => void
  renderItem?: (item: WidgetItem, index: number) => React.ReactNode
  editable?: boolean
  maxColumns?: number
  cellSize?: number
  gap?: number
  radius?: number
  className?: string
}

const dimensions: Record<WidgetSize, { columns: number; rows: number }> = {
  sm: { columns: 1, rows: 1 },
  wide: { columns: 2, rows: 1 },
  tall: { columns: 1, rows: 2 },
  lg: { columns: 2, rows: 2 },
}

function reorder(items: WidgetItem[], from: number, to: number) {
  if (from === to || from < 0 || to < 0) return items
  const next = [...items]
  const [moved] = next.splice(from, 1)
  if (!moved) return items
  next.splice(to, 0, moved)
  return next
}

function Widget({ item, index, count, columns, editable, radius, onDrop, onKeyboardMove, children }: {
  item: WidgetItem
  index: number
  count: number
  columns: number
  editable: boolean
  radius: number
  onDrop: (id: string, point: { x: number; y: number }) => void
  onKeyboardMove: (id: string, delta: number) => void
  children: React.ReactNode
}) {
  const controls = useDragControls()
  const longPress = React.useRef<number | null>(null)
  const touchOrigin = React.useRef<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const size = dimensions[item.size]
  const spanColumns = Math.min(size.columns, columns)

  const clearPress = React.useCallback(() => {
    if (longPress.current !== null) window.clearTimeout(longPress.current)
    longPress.current = null
  }, [])

  React.useEffect(() => clearPress, [clearPress])

  const begin = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editable) return
    if (event.pointerType === 'touch') {
      clearPress()
      touchOrigin.current = { x: event.clientX, y: event.clientY }
      longPress.current = window.setTimeout(() => {
        controls.start(event.nativeEvent)
        longPress.current = null
      }, 350)
      return
    }
    event.preventDefault()
    controls.start(event.nativeEvent)
  }

  const finish = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    clearPress()
    touchOrigin.current = null
    setDragging(false)
    onDrop(item.id, info.point)
  }

  return <motion.div
    layout
    drag={editable}
    dragListener={false}
    dragControls={controls}
    dragMomentum={false}
    onDragEnd={finish}
    onDragStart={() => setDragging(true)}
    onPointerDown={begin}
    onPointerUp={clearPress}
    onPointerCancel={clearPress}
    onPointerMove={event => {
      if (event.pointerType !== 'touch' || longPress.current === null || !touchOrigin.current) return
      if (Math.hypot(event.clientX - touchOrigin.current.x, event.clientY - touchOrigin.current.y) > 8) clearPress()
    }}
    onKeyDown={event => {
      if (!editable || !event.altKey) return
      const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0
      if (!delta) return
      event.preventDefault()
      onKeyboardMove(item.id, delta)
    }}
    tabIndex={editable ? 0 : -1}
    role="listitem"
    aria-label={`${item.label ?? item.id}, position ${index + 1} of ${count}${editable ? '. Hold Alt and use arrow keys to move.' : ''}`}
    data-widget-id={item.id}
    data-widget-size={item.size}
    className={cn('draggable-widget', editable && 'is-editable', dragging && 'is-dragging')}
    style={{ gridColumn: `span ${spanColumns}`, gridRow: `span ${size.rows}`, borderRadius: radius }}
    whileDrag={{ scale: 1.015, zIndex: 20 }}
    transition={{ type: 'spring', stiffness: 360, damping: 34, mass: 0.7 }}
  >
    {editable && <span className="draggable-widget-grip" aria-hidden="true"><GripVertical size={15} /></span>}
    {children}
  </motion.div>
}

export function DraggableWidgetGrid({
  items = [], onChange, renderItem, editable = true, maxColumns = 4, cellSize = 180, gap = 16, radius = 8, className,
}: DraggableWidgetGridProps) {
  const root = React.useRef<HTMLDivElement>(null)
  const [columns, setColumns] = React.useState(1)

  React.useEffect(() => {
    const node = root.current
    if (!node) return
    const measure = () => setColumns(Math.max(1, Math.min(maxColumns, Math.floor((node.clientWidth + gap) / (cellSize + gap)))))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [cellSize, gap, maxColumns])

  const commit = React.useCallback((from: number, to: number) => {
    const next = reorder(items, from, to)
    if (next !== items) onChange?.(next)
  }, [items, onChange])

  const drop = (id: string, point: { x: number; y: number }) => {
    const from = items.findIndex(item => item.id === id)
    const candidates = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-widget-id]') ?? [])
      .filter(node => node.dataset['widgetId'] !== id)
    let target = -1
    let distance = Number.POSITIVE_INFINITY
    for (const node of candidates) {
      const rect = node.getBoundingClientRect()
      const value = Math.hypot(point.x - (rect.left + rect.width / 2), point.y - (rect.top + rect.height / 2))
      if (value < distance) {
        distance = value
        target = items.findIndex(item => item.id === node.dataset['widgetId'])
      }
    }
    if (target >= 0) commit(from, target)
  }

  return <MotionConfig reducedMotion="user">
    <div
      ref={root}
      className={cn('draggable-widget-grid', className)}
      role="list"
      aria-label={editable ? 'Customizable executive widgets' : 'Executive widgets'}
      data-editable={editable}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: `${cellSize}px`, gap }}
    >
      {items.map((item, index) => <Widget key={item.id} item={item} index={index} count={items.length} columns={columns} editable={editable} radius={radius}
        onDrop={drop} onKeyboardMove={(id, delta) => commit(items.findIndex(entry => entry.id === id), Math.max(0, Math.min(items.length - 1, index + delta)))}>
        {renderItem?.(item, index)}
      </Widget>)}
    </div>
  </MotionConfig>
}