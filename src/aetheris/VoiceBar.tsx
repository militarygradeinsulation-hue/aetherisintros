/** The reading bar: follow-along controls while Intros reads, plus read-on-tap. */
import { useEffect } from 'react'
import { Pause, Play, Rabbit, SkipForward, Square, Volume2, X } from 'lucide-react'
import {
  passagesIn, pauseReading, readAloud, resumeReading, skipSegment, stopReading,
  useReader, useVoiceSettings, voiceSpeedLabels, voiceSpeeds,
} from './voice'

// The modern member shell can nest an additional classic app shell that also
// mounts a VoiceBar. Keep a single document click listener to avoid double
// reads (and duplicate ElevenLabs synthesis charges) on one tap.
let readOnTapSubscribers = 0
function readTappedSection(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target) return
  if (target.closest('button, a, input, textarea, select, [role="button"], .voice-bar')) return
  const block = target.closest<HTMLElement>('article, li, section, p, h1, h2, h3, h4, blockquote')
  if (!block) return
  const passages = passagesIn(block)
  const text = passages.length ? passages : [(block.textContent ?? '').trim()]
  event.preventDefault()
  readAloud(text, 'Reading what you tapped')
}

export function VoiceBar() {
  const reader = useReader()
  const [voice, setVoice] = useVoiceSettings()
  const reading = reader.state !== 'idle'

  useEffect(() => {
    if (!voice.tapToRead) return
    readOnTapSubscribers++
    if (readOnTapSubscribers === 1) document.addEventListener('click', readTappedSection, true)
    return () => {
      readOnTapSubscribers = Math.max(0, readOnTapSubscribers - 1)
      if (!readOnTapSubscribers) document.removeEventListener('click', readTappedSection, true)
    }
  }, [voice.tapToRead])

  if (!reading && !voice.tapToRead && !reader.problem) return null

  return <div className="voice-bar" role="region" aria-label="Reading controls" data-voice-skip="true">
    <span className="voice-bar-mark" aria-hidden="true"><Volume2 size={14} /></span>
    <div className="voice-bar-state">
      <b>{reading ? reader.label : reader.problem ? 'Reading unavailable' : 'Read on tap'}</b>
      <small>{reading
        ? `${Math.min(reader.index + 1, reader.total)} of ${reader.total} · ${reader.current.slice(0, 90)}`
        : reader.problem || 'Click any paragraph or card to hear just that part.'}</small>
    </div>
    <div className="voice-bar-controls">
      {reading && (reader.state === 'paused'
        ? <button type="button" onClick={resumeReading} aria-label="Resume reading"><Play size={14} /></button>
        : <button type="button" onClick={pauseReading} aria-label="Pause reading"><Pause size={14} /></button>)}
      {reading && <button type="button" onClick={() => skipSegment(1)} aria-label="Next part"><SkipForward size={14} /></button>}
      <label className="voice-bar-speed">
        <Rabbit size={13} aria-hidden="true" />
        <select value={voice.speed} aria-label="Reading speed"
          onChange={event => setVoice({ speed: event.target.value as typeof voiceSpeeds[number] })}>
          {voiceSpeeds.map(option => <option key={option} value={option}>{voiceSpeedLabels[option]}</option>)}
        </select>
      </label>
      <button type="button" className={voice.tapToRead ? 'active' : ''} aria-pressed={voice.tapToRead}
        onClick={() => setVoice({ tapToRead: !voice.tapToRead })}>Read on tap</button>
      {reading && <button type="button" onClick={stopReading} aria-label="Stop reading"><Square size={13} /></button>}
      <button type="button" className="voice-bar-close" aria-label="Close reading tile"
        onClick={() => { stopReading(); setVoice({ tapToRead: false }) }}><X size={14} /></button>
    </div>
  </div>
}
