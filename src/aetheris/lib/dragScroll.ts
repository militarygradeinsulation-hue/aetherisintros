import { useEffect } from 'react'

/** Selectors for horizontal rows that can be grabbed and dragged with a mouse. */
const ROWS = [
  '[data-drag-scroll]', '.feed-tabs', '.state-filters', '.preference-tabs', '.lane-row',
  '.move-switch', '.topbar-actions', '.thread-list', '.feed-scope', '.room-stageline',
  '.mobile-nav', '.chip-row', '.tab-row',
].join(',')

/** Enables click-and-drag horizontal scrolling on every overflowing tab/filter row. */
export function useGrabScroll() {
  useEffect(() => {
    let row: HTMLElement | null = null
    let startX = 0
    let startScroll = 0
    let moved = false

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return
      const target = e.target as HTMLElement | null
      const candidate = target?.closest(ROWS) as HTMLElement | null
      if (!candidate) return
      if (target?.closest('input,textarea,select')) return
      if (candidate.scrollWidth - candidate.clientWidth < 6) return
      row = candidate
      startX = e.clientX
      startScroll = candidate.scrollLeft
      moved = false
      candidate.classList.add('is-grabbable')
    }

    const move = (e: PointerEvent) => {
      if (!row) return
      const dx = e.clientX - startX
      if (Math.abs(dx) > 4) {
        moved = true
        row.classList.add('is-grabbing')
        row.scrollLeft = startScroll - dx
        e.preventDefault()
      }
    }

    const finish = () => {
      row?.classList.remove('is-grabbing')
      row = null
    }

    const click = (e: MouseEvent) => {
      if (moved) { moved = false; e.preventDefault(); e.stopPropagation() }
    }

    document.addEventListener('pointerdown', down, true)
    document.addEventListener('pointermove', move, { passive: false })
    document.addEventListener('pointerup', finish, true)
    document.addEventListener('pointercancel', finish, true)
    document.addEventListener('click', click, true)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', finish, true)
      document.removeEventListener('pointercancel', finish, true)
      document.removeEventListener('click', click, true)
    }
  }, [])
}
