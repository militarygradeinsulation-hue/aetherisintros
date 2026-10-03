import { useEffect, useRef, useState } from 'react'
import { FileText, Paperclip, Download } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

/** Attachments travel inside the message text as [[file:<ref>|<name>|<mime>]].
 *  <ref> is a private storage path (live) or a local blob URL (demo). */
const MARK = /\[\[file:([^|\]]+)\|([^|\]]*)\|([^|\]]*)\]\]/g
const MAX = 50 * 1024 * 1024
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v)

export function attachmentPreview(text: string) {
  return text.replace(MARK, (_m, _r, name) => `📎 ${name}`)
}

export function AttachButton({ threadId, onSend }: { threadId: string; onSend: (text: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function pick(files: FileList | null) {
    if (!files?.length) return
    setError(''); setBusy(true)
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX) { setError(`${file.name} is over 50 MB.`); continue }
        const safe = file.name.replace(/[|\]\[]/g, '_')
        const { data } = await supabase.auth.getUser()
        let ref: string
        if (data.user && isUuid(threadId)) {
          const path = `${threadId}/${crypto.randomUUID()}-${safe.replace(/[^\w.\-]/g, '_')}`
          const { error: upErr } = await supabase.storage.from('dm-files').upload(path, file, { contentType: file.type || 'application/octet-stream' })
          if (upErr) { setError(`Couldn't send ${file.name}. Try again.`); continue }
          ref = path
        } else {
          ref = URL.createObjectURL(file)
        }
        onSend(`[[file:${ref}|${safe}|${file.type || 'application/octet-stream'}]]`)
      }
    } finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  return <>
    <input ref={input} type="file" multiple hidden accept="image/*,video/*,application/pdf,*/*" onChange={e => void pick(e.target.files)} />
    <button type="button" className="composer-attach" onClick={() => input.current?.click()} disabled={busy} aria-label="Attach a photo, video, PDF or file" title="Attach a photo, video, PDF or file">
      <Paperclip size={17} />
    </button>
    {busy && <span className="composer-attach-note">Sending…</span>}
    {error && <span className="composer-attach-note is-error">{error}</span>}
  </>
}

function Attachment({ ref_, name, mime }: { ref_: string; name: string; mime: string }) {
  const [url, setUrl] = useState<string | null>(ref_.startsWith('blob:') ? ref_ : null)
  useEffect(() => {
    if (ref_.startsWith('blob:')) return
    let off = false
    void supabase.storage.from('dm-files').createSignedUrl(ref_, 3600).then(({ data }) => { if (!off) setUrl(data?.signedUrl ?? null) })
    return () => { off = true }
  }, [ref_])
  if (!url) return <span className="msg-file">{name}</span>
  if (mime.startsWith('image/')) return <a href={url} target="_blank" rel="noreferrer"><img className="msg-media" src={url} alt={name} /></a>
  if (mime.startsWith('video/')) return <video className="msg-media" src={url} controls preload="metadata" />
  return <a className="msg-file" href={url} target="_blank" rel="noreferrer" download={name}>
    <FileText size={16} /><span>{name}</span><Download size={14} />
  </a>
}

export function MessageBody({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(MARK)) {
    if (m.index! > last) parts.push(text.slice(last, m.index))
    parts.push(<Attachment key={m.index} ref_={m[1]!} name={m[2]!} mime={m[3]!} />)
    last = m.index! + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}
