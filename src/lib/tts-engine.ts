import { duckMaster, setBlipsMuted } from './audio-engine'

const DUCKED_GAIN = 0.05
const NORMAL_GAIN = 0.7

let voice: SpeechSynthesisVoice | null = null
let speaking = false
let queue: Array<{ text: string }> = []
let lastSpoken = ''
const subscribers = new Set<(text: string) => void>()
let watchdogId: ReturnType<typeof setTimeout> | null = null
let primed = false

export function subscribeToSpeech(cb: (text: string) => void): () => void {
  subscribers.add(cb)
  return () => {
    subscribers.delete(cb)
  }
}

export function getLastSpoken(): string {
  return lastSpoken
}

function emitSpoken(text: string) {
  lastSpoken = text
  for (const cb of subscribers) cb(text)
}

function pickBest(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return (
    voices.find((v) => v.lang === 'es-MX') ??
    voices.find((v) => v.lang === 'es-US') ??
    voices.find((v) => v.lang === 'es-419') ??
    voices.find((v) => v.lang === 'es-ES') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('es')) ??
    null
  )
}

function loadVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const v = pickBest(window.speechSynthesis.getVoices())
  if (v) voice = v
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoice()
  window.speechSynthesis.addEventListener('voiceschanged', loadVoice)
}

export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function primeTTS(): void {
  if (!isTTSSupported() || primed) return
  primed = true
  try {
    const u = new SpeechSynthesisUtterance('vamos')
    if (voice) u.voice = voice
    u.lang = voice?.lang ?? 'es-MX'
    u.volume = 0.01
    u.rate = 1.4
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {
    /* ignore */
  }
}

function clearWatchdog() {
  if (watchdogId !== null) {
    clearTimeout(watchdogId)
    watchdogId = null
  }
}

function unstick() {
  speaking = false
  setBlipsMuted(false)
  duckMaster(NORMAL_GAIN)
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
  next()
}

export function speak(text: string, priority: 'high' | 'low' = 'low'): void {
  if (!isTTSSupported()) return

  if (priority === 'high') {
    if (speaking || queue.length > 0) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* ignore */
      }
      speaking = false
      queue = []
      setBlipsMuted(false)
      duckMaster(NORMAL_GAIN)
      clearWatchdog()
    }
  } else if (speaking) {
    return
  }

  queue.push({ text })
  next()
}

export function cancelSpeech(): void {
  if (!isTTSSupported()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
  speaking = false
  queue = []
  setBlipsMuted(false)
  duckMaster(NORMAL_GAIN)
  clearWatchdog()
}

function next() {
  if (speaking || queue.length === 0) return
  const { text } = queue.shift()!

  const u = new SpeechSynthesisUtterance(text)
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? 'es-MX'
  u.rate = 1.0
  u.pitch = 1.0
  u.volume = 1.0

  u.onstart = () => {
    setBlipsMuted(true)
    duckMaster(DUCKED_GAIN)
  }
  u.onend = () => {
    clearWatchdog()
    speaking = false
    setBlipsMuted(false)
    duckMaster(NORMAL_GAIN)
    next()
  }
  u.onerror = () => {
    clearWatchdog()
    speaking = false
    setBlipsMuted(false)
    duckMaster(NORMAL_GAIN)
    next()
  }

  speaking = true
  emitSpoken(text)

  setBlipsMuted(true)
  duckMaster(DUCKED_GAIN)

  try {
    window.speechSynthesis.speak(u)
  } catch {
    unstick()
    return
  }

  const estMs = Math.max(1500, text.length * 90 + 800)
  clearWatchdog()
  watchdogId = setTimeout(() => {
    if (speaking) unstick()
  }, estMs)
}
