/**
 * Voice layer: read anything aloud, and talk to Ask Intros.
 * Uses the browser's own speech engine, so it works immediately and offline.
 */
import { useEffect, useRef, useState } from 'react'

export const voiceSpeeds = ['slow', 'normal', 'fast', 'fastest'] as const
export type VoiceSpeed = typeof voiceSpeeds[number]

export const voiceSpeedLabels: Record<VoiceSpeed, string> = {
  slow: 'Slow', normal: 'Normal', fast: 'Fast', fastest: 'Fastest',
}

const rateOf: Record<VoiceSpeed, number> = { slow: 0.8, normal: 1, fast: 1.25, fastest: 1.6 }

export interface VoiceSettings {
  /** Read-aloud controls are available and spoken output is allowed. */
  readAloud: boolean
  /** Speak every Ask Intros reply out loud. */
  speakReplies: boolean
  /** Hands-free back and forth with Ask Intros. */
  conversation: boolean
  /** Click any piece of the page to hear just that piece. */
  tapToRead: boolean
  voiceName: string
  speed: VoiceSpeed
}

const KEY = 'aetheris.voice.settings'

const defaults: VoiceSettings = {
  readAloud: true, speakReplies: true, conversation: false, tapToRead: false, voiceName: '', speed: 'normal',
}

let settings: VoiceSettings = defaults
let loaded = false
const settingListeners = new Set<() => void>()

function load(): VoiceSettings {
  if (loaded || typeof window === 'undefined') return settings
  loaded = true
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<VoiceSettings>
      settings = {
        ...defaults,
        ...parsed,
        speed: voiceSpeeds.includes(parsed.speed as VoiceSpeed) ? parsed.speed as VoiceSpeed : 'normal',
      }
    }
  } catch { /* keep defaults */ }
  return settings
}

export function readVoiceSettings(): VoiceSettings {
  return load()
}

export function setVoiceSettings(patch: Partial<VoiceSettings>) {
  settings = { ...load(), ...patch }
  try { window.localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* private mode */ }
  settingListeners.forEach(listener => listener())
}

/** Live voice settings, shared by every control in the product. */
export function useVoiceSettings(): [VoiceSettings, (patch: Partial<VoiceSettings>) => void] {
  const [value, setValue] = useState<VoiceSettings>(defaults)
  useEffect(() => {
    setValue(readVoiceSettings())
    const listener = () => setValue({ ...readVoiceSettings() })
    settingListeners.add(listener)
    return () => { settingListeners.delete(listener) }
  }, [])
  return [value, setVoiceSettings]
}

/* --------------------------------------------------------------- speaking */

export type ReaderState = 'idle' | 'speaking' | 'paused'

export interface ReaderSnapshot {
  state: ReaderState
  /** What is being read now, for the follow-along line. */
  current: string
  index: number
  total: number
  label: string
}

let segments: string[] = []
let index = 0
let state: ReaderState = 'idle'
let label = ''
let token = 0
const readerListeners = new Set<() => void>()

function announce() { readerListeners.add; readerListeners.forEach(listener => listener()) }

export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return []
  return window.speechSynthesis.getVoices()
}

function chosenVoice(): SpeechSynthesisVoice | null {
  const name = readVoiceSettings().voiceName
  if (!name) return null
  return listVoices().find(voice => voice.name === name) ?? null
}

function speakCurrent(run: number) {
  if (!speechSupported()) return
  const text = segments[index]
  if (run !== token) return
  if (text === undefined) { stopReading(); return }
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = chosenVoice()
  if (voice) utterance.voice = voice
  utterance.rate = rateOf[readVoiceSettings().speed]
  utterance.onend = () => {
    if (run !== token) return
    if (index + 1 < segments.length) { index += 1; announce(); speakCurrent(run) }
    else stopReading()
  }
  utterance.onerror = () => { if (run === token) stopReading() }
  state = 'speaking'
  announce()
  window.speechSynthesis.speak(utterance)
}

/** Read an ordered list of passages aloud, replacing anything being read now. */
export function readAloud(passages: string[], readingLabel = 'Reading') {
  if (!speechSupported()) return
  const clean = passages.map(item => item.replace(/\s+/g, ' ').trim()).filter(item => item.length > 1)
  stopReading()
  if (!clean.length) return
  segments = clean
  index = 0
  label = readingLabel
  token += 1
  window.speechSynthesis.cancel()
  speakCurrent(token)
}

export function stopReading() {
  token += 1
  segments = []
  index = 0
  state = 'idle'
  label = ''
  if (speechSupported()) window.speechSynthesis.cancel()
  announce()
}

export function pauseReading() {
  if (!speechSupported() || state !== 'speaking') return
  window.speechSynthesis.pause()
  state = 'paused'
  announce()
}

export function resumeReading() {
  if (!speechSupported() || state !== 'paused') return
  window.speechSynthesis.resume()
  state = 'speaking'
  announce()
}

export function skipSegment(step: 1 | -1) {
  if (!segments.length) return
  const next = index + step
  if (next < 0 || next >= segments.length) { stopReading(); return }
  index = next
  token += 1
  window.speechSynthesis.cancel()
  speakCurrent(token)
}

export function readerSnapshot(): ReaderSnapshot {
  return { state, current: segments[index] ?? '', index, total: segments.length, label }
}

/** Live reader state for the reading bar and speaker buttons. */
export function useReader(): ReaderSnapshot {
  const [snapshot, setSnapshot] = useState<ReaderSnapshot>({ state: 'idle', current: '', index: 0, total: 0, label: '' })
  useEffect(() => {
    const listener = () => setSnapshot(readerSnapshot())
    readerListeners.add(listener)
    listener()
    return () => { readerListeners.delete(listener) }
  }, [])
  return snapshot
}

/* -------------------------------------------------------- page extraction */

const SKIP = new Set(['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'CANVAS', 'SVG', 'SCRIPT', 'STYLE', 'KBD'])

function visible(node: HTMLElement) {
  if (node.getAttribute('aria-hidden') === 'true') return false
  const style = window.getComputedStyle(node)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  return node.offsetParent !== null || node.getClientRects().length > 0
}

function passageFrom(node: HTMLElement): string {
  const clone = node.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[aria-hidden="true"], canvas, svg, kbd, script, style').forEach(child => child.remove())
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** Ordered readable passages inside a region — headings, copy, list items, card text. */
export function passagesIn(root: HTMLElement | null): string[] {
  if (!root || typeof window === 'undefined') return []
  const out: string[] = []
  const seen = new Set<string>()
  const nodes = root.querySelectorAll<HTMLElement>('h1, h2, h3, h4, p, li, blockquote, dd, dt, figcaption, td, th')
  nodes.forEach(node => {
    if (SKIP.has(node.tagName)) return
    if (node.closest('[data-voice-skip="true"]')) return
    if (!visible(node)) return
    const text = passageFrom(node)
    if (text.length < 2 || seen.has(text)) return
    seen.add(text)
    out.push(text)
  })
  return out
}

/** Everything on the page the member is looking at. */
export function currentPagePassages(): string[] {
  if (typeof document === 'undefined') return []
  const sheet = document.querySelector<HTMLElement>('.sv-sheet, [role="dialog"]')
  const main = document.querySelector<HTMLElement>('main.content')
  const region = sheet && visible(sheet) ? sheet : main
  return passagesIn(region)
}

/** Text the member has highlighted, if any. */
export function selectedText(): string {
  if (typeof window === 'undefined') return ''
  return (window.getSelection()?.toString() ?? '').replace(/\s+/g, ' ').trim()
}

/** Read the selection when there is one, otherwise the whole page. */
export function readPageOrSelection(): 'selection' | 'page' | 'empty' {
  const selection = selectedText()
  if (selection.length > 1) { readAloud([selection], 'Reading your selection'); return 'selection' }
  const passages = currentPagePassages()
  if (!passages.length) return 'empty'
  readAloud(passages, 'Reading this page')
  return 'page'
}

/* ------------------------------------------------------------- dictation */

type RecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
}

function recognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const scope = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

export function dictationSupported() { return recognitionCtor() !== null }

export interface DictationApi {
  supported: boolean
  listening: boolean
  interim: string
  start: () => void
  stop: () => void
  toggle: () => void
}

/**
 * Microphone input. `onFinal` fires with a finished phrase.
 * With `keepOpen`, listening restarts itself until stopped — conversation mode.
 */
export function useDictation({ onFinal, keepOpen = false }: { onFinal: (text: string) => void; keepOpen?: boolean }): DictationApi {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const recognition = useRef<RecognitionLike | null>(null)
  const wanted = useRef(false)
  const handler = useRef(onFinal)
  const keep = useRef(keepOpen)
  handler.current = onFinal
  keep.current = keepOpen

  const stop = () => {
    wanted.current = false
    setListening(false)
    setInterim('')
    try { recognition.current?.stop() } catch { /* already stopped */ }
  }

  const start = () => {
    const Ctor = recognitionCtor()
    if (!Ctor) return
    wanted.current = true
    if (recognition.current) { try { recognition.current.abort() } catch { /* ignore */ } }
    const rec = new Ctor()
    recognition.current = rec
    rec.continuous = true
    rec.interimResults = true
    rec.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US'
    rec.onresult = event => {
      let live = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const text = result?.[0]?.transcript ?? ''
        if (result?.isFinal) {
          const phrase = text.trim()
          if (phrase) handler.current(phrase)
        } else live += text
      }
      setInterim(live.trim())
    }
    rec.onerror = () => { setListening(false) }
    rec.onend = () => {
      setInterim('')
      if (wanted.current && keep.current) { try { rec.start(); return } catch { /* fall through */ } }
      wanted.current = false
      setListening(false)
    }
    try { rec.start(); setListening(true) } catch { setListening(false) }
  }

  useEffect(() => () => { wanted.current = false; try { recognition.current?.abort() } catch { /* ignore */ } }, [])

  return {
    supported: dictationSupported(),
    listening,
    interim,
    start,
    stop,
    toggle: () => { if (listening) stop(); else start() },
  }
}

/** Words that always stop voice, whatever else was said. */
export function isStopPhrase(text: string) {
  return /^(stop|cancel|quiet|be quiet|stop reading|shut up|never mind)\b/i.test(text.trim())
}
