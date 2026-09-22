/** Highlight any words and a small Read aloud button appears beside them. */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Volume2 } from 'lucide-react'
import { readAloud, selectedText } from './voice'

interface Spot { text: string; top: number; left: number }

export function SelectionReader() {
  const [spot, setSpot] = useState<Spot | null>(null)

  useEffect(() => {
    const update = () => {
      const selection = window.getSelection()
      const text = selectedText()
      if (!selection || selection.isCollapsed || text.length < 2) { setSpot(null); return }
      const range = selection.getRangeAt(0)
      const anchor = range.startContainer.parentElement
      if (anchor?.closest('.voice-bar, .selection-read, input, textarea')) { setSpot(null); return }
      const rect = range.getBoundingClientRect()
      if (!rect.width && !rect.height) { setSpot(null); return }
      setSpot({
        text,
        top: Math.max(8, rect.top - 44),
        left: Math.min(Math.max(12, rect.left + rect.width / 2 - 70), window.innerWidth - 160),
      })
    }
    const clear = (event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest('.selection-read')) return
      setSpot(null)
    }
    document.addEventListener('mouseup', update)
    document.addEventListener('keyup', update)
    document.addEventListener('selectionchange', update)
    document.addEventListener('mousedown', clear, true)
    window.addEventListener('scroll', () => setSpot(null), true)
    return () => {
      document.removeEventListener('mouseup', update)
      document.removeEventListener('keyup', update)
      document.removeEventListener('selectionchange', update)
      document.removeEventListener('mousedown', clear, true)
    }
  }, [])

  if (!spot || typeof document === 'undefined') return null

  const read = () => {
    readAloud([spot.text], 'Reading what you highlighted')
    window.getSelection()?.removeAllRanges()
    setSpot(null)
  }

  return createPortal(
    <button type="button" className="selection-read" style={{ top: spot.top, left: spot.left }} onClick={read}>
      <Volume2 size={13} /> Read aloud
    </button>,
    document.body,
  )
}
