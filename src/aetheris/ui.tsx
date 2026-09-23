/** Shared editorial primitives used by every platform surface. */
import { Volume2, VolumeX } from 'lucide-react'
import { AvatarImage } from './avatar'
import { portraitFor } from './portraits'
import type { Member } from './social'
import { currentPagePassages, readAloud, speechSupported, stopReading, useReader, useVoiceSettings } from './voice'

/** Speaker button: reads one passage, one section, or the whole page. */
export function ReadButton({ passages, label = 'Read aloud', className = '' }: {
  passages: string[] | (() => string[]); label?: string; className?: string
}) {
  const reader = useReader()
  const [voice] = useVoiceSettings()
  if (!speechSupported() || !voice.readAloud) return null
  const speaking = reader.state !== 'idle'
  return <button type="button" className={`read-btn ${speaking ? 'active' : ''} ${className}`}
    aria-label={speaking ? 'Stop reading' : label} title={speaking ? 'Stop reading' : label}
    onClick={() => {
      if (speaking) { stopReading(); return }
      const list = typeof passages === 'function' ? passages() : passages
      readAloud(list, label)
    }}>
    {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
  </button>
}

export function Glyph({ size = 18 }: { size?: number }) {
  return <span className="aetheris-glyph" style={{ width: size, height: size }} aria-hidden="true"><i /><b /></span>
}

export function Btn({ children, kind = 'primary', onClick, disabled = false, className = '' }: {
  children: React.ReactNode; kind?: 'primary' | 'secondary' | 'quiet'; onClick?: () => void; disabled?: boolean; className?: string
}) {
  return <button type="button" className={`btn ${kind} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>
}

export function Eyebrow({ children, signal = false }: { children: React.ReactNode; signal?: boolean }) {
  return <span className={`eyebrow ${signal ? 'signal' : ''}`}>{children}</span>
}

export function Numeral({ value, of = '/100' }: { value: number; of?: string }) {
  return <div className="editorial-score"><strong>{value}</strong><span>{of}</span></div>
}

export function Head({ label, title, copy, proof, action }: {
  label: string; title: string; copy: string; proof?: string; action?: React.ReactNode
}) {
  return <header className="page-title">
    <div><Eyebrow>{label}</Eyebrow><h1>{title}</h1><p>{copy}</p>
      {proof && <small className="page-proof"><Glyph size={12} />{proof}</small>}</div>
    <div className="page-title-actions" data-voice-skip="true">
      <ReadButton passages={currentPagePassages} label="Read this page aloud" />
      {action}
    </div>
  </header>
}

export function Face({ person, large = false, portrait = false }: { person: { id: string; name: string; initials: string; avatarUrl?: string | undefined }; large?: boolean; portrait?: boolean }) {
  const image = person.avatarUrl ?? portraitFor(person.id)
  return <span className={`person-avatar ${large ? 'large' : ''} ${portrait ? 'portrait' : ''}`} data-person-portrait={person.id} aria-label={person.name}>
    <span className="avatar-initials" aria-hidden="true">{person.initials}</span>
    {image && <AvatarImage source={image} alt="" width={1024} height={1280} />}
  </span>
}

export function Meter({ label, value }: { label: string; value: number }) {
  return <div className="meter"><span>{label}</span><i><b style={{ width: `${Math.max(4, Math.min(100, value))}%` }} /></i><em>{value}</em></div>
}

export function Why({ children }: { children: React.ReactNode }) {
  return <p className="why-intros"><Glyph size={11} /><span><b>Why Intros thinks this.</b> {children}</span></p>
}

export function initialsOf(name: string) {
  return name.split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

export function memberById(members: Member[], id: string) {
  return members.find(m => m.id === id)
}
