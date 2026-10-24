import React from 'react'
import { createRoot } from 'react-dom/client'
import { NetworkCommentComposer } from '../../src/aetheris/NetworkCommentComposer'

declare global {
  interface Window { commentCheck: { calls: string[]; finish: (value: boolean) => void; fail: () => void } }
}
window.commentCheck = { calls: [], finish: () => {}, fail: () => {} }
createRoot(document.getElementById('root')!).render(<NetworkCommentComposer onSubmit={text => {
  window.commentCheck.calls.push(text)
  return new Promise<boolean>((resolve, reject) => {
    window.commentCheck.finish = resolve
    window.commentCheck.fail = () => reject(new Error('private server detail must not reach the page'))
  })
}} />)
