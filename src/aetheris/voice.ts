/**
 * Voice layer: read anything aloud, and talk to Ask Intros.
 * Uses the browser's own speech engine, so it works immediately and offline.
 */
import { useEffect, useRef, useState } from 'react'
import { speakWithIntrosVoice } from '@/lib/voice.functions'

export const voiceSpeeds = ['slowest', 'slow', 'normal', 'fast', 'faster', 'fastest'] as const
export type VoiceSpeed = typeof voiceSpeeds[number]

export const voiceSpeedLabels: Record<VoiceSpeed, string> = {
  slowest: 'Slowest', slow: 'Slow', normal: 'Normal', fast: 'Fast', faster: 'Faster', fastest: 'Fastest',
}

const rateOf: Record<VoiceSpeed, number> = {
  slowest: 0.65, slow: 0.85, normal: 1, fast: 1.2, faster: 1.45, fastest: 1.75,
}

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
  readAloud: true, speakReplies: true, conversation: false, tapToRead: false, voiceName: 'intros-managed', speed: 'normal',
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
        voiceName: parsed.voiceName || 'intros-managed',
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
  const before = load()
  settings = { ...before, ...patch }
  try { window.localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* private mode */ }
  settingListeners.forEach(listener => listener())
  /* Speed and voice changes take effect on the words being read right now. */
  const changed = (patch.speed !== undefined && patch.speed !== before.speed)
    || (patch.voiceName !== undefined && patch.voiceName !== before.voiceName)
  if (changed) restartCurrent()
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
  /** Set when this device cannot speak, so the member is told instead of ignored. */
  problem: string
}

let segments: string[] = []
let index = 0
let state: ReaderState = 'idle'
let label = ''
let problem = ''
let token = 0
let activeAudio: HTMLAudioElement | null = null
let activeAudioUrl = ''
/** One audio element unlocked during the member's tap, so later playback is not blocked. */
let sharedAudio: HTMLAudioElement | null = null
const SILENCE = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XFz280948NMBWInljyzsNRFLPWdnZGWrddDsjK1unuSrVN9jJsK8KuQtQCtMBjCEtImISdNKJOopIpBFpNSMbIHCSRpRR5iakjTiyzLhchUUBwCgyKiweBv/7UsQbg8isVNoMPMjAAAA0gAAABEVFGmgqK////9bP/6XCykxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'
export function unlockAudio() {
  if (typeof window === 'undefined') return
  if (!sharedAudio) sharedAudio = new Audio()
  try {
    sharedAudio.src = SILENCE
    void sharedAudio.play().catch(() => { /* still allowed to try later */ })
  } catch { /* ignore */ }
  /* Wake the device voice too, so the fallback can speak after a wait. */
  if (speechSupported()) {
    try { window.speechSynthesis.resume() } catch { /* ignore */ }
  }
}
const readerListeners = new Set<() => void>()

function announce() { readerListeners.forEach(listener => listener()) }

export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Managed Intros speech works online; device speech remains the offline fallback. */
export function voiceOutputSupported() {
  return readVoiceSettings().voiceName === 'intros-managed' || speechSupported()
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return []
  return window.speechSynthesis.getVoices()
}

function chosenVoice(): SpeechSynthesisVoice | null {
  const name = readVoiceSettings().voiceName
  if (!name || name === 'intros-managed') return null
  return listVoices().find(voice => voice.name === name) ?? null
}

/** Voices that actually sound like a person, best first — device engines vary wildly. */
export function naturalVoices(): { name: string; lang: string; label: string }[] {
  const wanted = /^(en)/i
  const premium = /(natural|neural|enhanced|premium|siri|google|eloquence)/i
  const known = /(samantha|serena|daniel|karen|moira|alex|ava|allison|tessa|fiona|nicky|aaron|joelle|matilda|jamie|zoe)/i
  const scored = listVoices()
    .filter(item => wanted.test(item.lang || 'en'))
    .map(item => ({
      name: item.name,
      lang: item.lang,
      label: item.name.replace(/\s*\((?:enhanced|premium)\)/i, '').trim(),
      score: (premium.test(item.name) ? 4 : 0) + (known.test(item.name) ? 2 : 0) + (item.localService ? 1 : 0),
    }))
  scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
  const seen = new Set<string>()
  return scored
    .filter(item => (seen.has(item.label) ? false : (seen.add(item.label), true)))
    .map(({ name, lang, label }) => ({ name, lang, label }))
}

/** Best natural voice on this device, used when the member has not picked one. */
function bestVoice(): SpeechSynthesisVoice | null {
  const top = naturalVoices()[0]
  if (!top) return null
  return listVoices().find(item => item.name === top.name) ?? null
}

/** Re-speak the passage in progress so a new speed or voice is heard at once. */
function restartCurrent() {
  if (state === 'idle' || !segments.length) return
  token += 1
  stopActiveAudio()
  if (speechSupported()) window.speechSynthesis.cancel()
  void speakCurrent(token)
}

function stopActiveAudio() {
  if (activeAudio) {
    activeAudio.onended = null
    activeAudio.onerror = null
    activeAudio.pause()
    activeAudio.removeAttribute('src')
    activeAudio = null
  }
  if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl)
  activeAudioUrl = ''
}

function base64Audio(value: string, contentType: string): Blob {
  const decoded = window.atob(value)
  const bytes = new Uint8Array(decoded.length)
  for (let position = 0; position < decoded.length; position += 1) bytes[position] = decoded.charCodeAt(position)
  return new Blob([bytes], { type: contentType })
}

function finishSegment(run: number) {
  if (run !== token) return
  if (index + 1 < segments.length) { index += 1; announce(); void speakCurrent(run) }
  else stopReading()
}

function speakWithDevice(text: string, run: number) {
  if (!speechSupported() || run !== token) {
    problem = 'This device has no fallback reading voice installed.'
    stopReading()
    announce()
    return
  }
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = chosenVoice() ?? bestVoice()
  if (voice) { utterance.voice = voice; utterance.lang = voice.lang }
  utterance.rate = rateOf[readVoiceSettings().speed]
  utterance.pitch = 1
  utterance.volume = 1
  utterance.onend = () => finishSegment(run)
  utterance.onerror = event => {
    if (run !== token) return
    const reason = (event as unknown as { error?: string })?.error ?? ''
    stopReading()
    if (reason && reason !== 'interrupted' && reason !== 'canceled') {
      problem = reason === 'not-allowed'
        ? 'Reading needs a tap first on this device. Press the speaker again.'
        : 'This device has no reading voice installed, so Intros cannot read aloud here.'
      announce()
    }
  }
  state = 'speaking'
  announce()
  /* Chrome drops a sentence spoken straight after cancel, so give it a beat. */
  window.setTimeout(() => {
    if (run !== token) return
    window.speechSynthesis.resume()
    window.speechSynthesis.speak(utterance)
  }, 60)
}

async function speakCurrent(run: number) {
  const text = segments[index]
  if (run !== token) return
  if (text === undefined) { stopReading(); return }
  state = 'speaking'
  announce()

  if (readVoiceSettings().voiceName !== 'intros-managed') {
    speakWithDevice(text, run)
    return
  }

  try {
    const { supabase } = await import('@/integrations/supabase/client')
    const { data: sessionData } = await supabase.auth.getSession()
    if (run !== token) return
    if (!sessionData.session) { speakWithDevice(text, run); return }
  } catch { speakWithDevice(text, run); return }

  try {
    const result = await speakWithIntrosVoice({ data: { text: text.slice(0, 1800) } })
    if (run !== token) return
    stopActiveAudio()
    activeAudioUrl = URL.createObjectURL(base64Audio(result.audio, result.contentType))
    const audio = sharedAudio ?? new Audio()
    audio.src = activeAudioUrl
    activeAudio = audio
    audio.playbackRate = rateOf[readVoiceSettings().speed]
    audio.onended = () => { stopActiveAudio(); finishSegment(run) }
    audio.onerror = () => {
      if (run !== token) return
      stopActiveAudio()
      problem = 'The Intros voice could not play, so your device voice is being used.'
      speakWithDevice(text, run)
    }
    await audio.play()
  } catch (error) {
    if (run !== token) return
    problem = error instanceof Error ? `${error.message} Using your device voice instead.` : 'The Intros voice is unavailable. Using your device voice instead.'
    announce()
    speakWithDevice(text, run)
  }
}

/** Read an ordered list of passages aloud, replacing anything being read now. */
export function readAloud(passages: string[], readingLabel = 'Reading') {
  if (!speechSupported() && readVoiceSettings().voiceName !== 'intros-managed') {
    problem = 'This browser cannot read aloud. Try Chrome, Edge or Safari.'
    announce()
    return
  }
  problem = ''
  unlockAudio()
  const clean = passages.map(item => item.replace(/\s+/g, ' ').trim()).filter(item => item.length > 1)
  stopReading()
  if (!clean.length) return
  segments = clean
  index = 0
  label = readingLabel
  token += 1
  if (speechSupported()) window.speechSynthesis.cancel()
  void speakCurrent(token)
}

export function stopReading() {
  token += 1
  segments = []
  index = 0
  state = 'idle'
  label = ''
  stopActiveAudio()
  if (speechSupported()) window.speechSynthesis.cancel()
  announce()
}

export function pauseReading() {
  if (state !== 'speaking') return
  if (activeAudio) activeAudio.pause()
  else if (speechSupported()) window.speechSynthesis.pause()
  state = 'paused'
  announce()
}

export function resumeReading() {
  if (state !== 'paused') return
  if (activeAudio) void activeAudio.play()
  else if (speechSupported()) window.speechSynthesis.resume()
  state = 'speaking'
  announce()
}

export function skipSegment(step: 1 | -1) {
  if (!segments.length) return
  const next = index + step
  if (next < 0 || next >= segments.length) { stopReading(); return }
  index = next
  token += 1
  stopActiveAudio()
  if (speechSupported()) window.speechSynthesis.cancel()
  void speakCurrent(token)
}

export function readerSnapshot(): ReaderSnapshot {
  return { state, current: segments[index] ?? '', index, total: segments.length, label, problem }
}

/** Live reader state for the reading bar and speaker buttons. */
export function useReader(): ReaderSnapshot {
  const [snapshot, setSnapshot] = useState<ReaderSnapshot>({ state: 'idle', current: '', index: 0, total: 0, label: '', problem: '' })
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
