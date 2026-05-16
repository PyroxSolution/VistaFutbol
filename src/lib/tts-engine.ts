import { duckMaster } from './audio-engine'

const DUCKED_GAIN = 0.18
const NORMAL_GAIN = 0.7

let voice: SpeechSynthesisVoice | null = null
let speaking = false
let queue: Array<{ text: string }> = []
let lastSpoken = ''
const subscribers = new Set<(text: string) => void>()

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

export function speak(text: string, priority: 'high' | 'low' = 'low'): void {
  if (!isTTSSupported()) return

  if (priority === 'high') {
    window.speechSynthesis.cancel()
    speaking = false
    queue = []
  } else if (speaking) {
    return
  }

  queue.push({ text })
  next()
}

export function cancelSpeech(): void {
  if (!isTTSSupported()) return
  window.speechSynthesis.cancel()
  speaking = false
  queue = []
  duckMaster(NORMAL_GAIN)
}

function next() {
  if (speaking || queue.length === 0) return
  const { text } = queue.shift()!

  const u = new SpeechSynthesisUtterance(text)
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? 'es-MX'
  u.rate = 1.1
  u.pitch = 1.0
  u.volume = 1.0

  u.onstart = () => duckMaster(DUCKED_GAIN)
  u.onend = () => {
    speaking = false
    duckMaster(NORMAL_GAIN)
    next()
  }
  u.onerror = () => {
    speaking = false
    duckMaster(NORMAL_GAIN)
    next()
  }

  speaking = true
  emitSpoken(text)
  window.speechSynthesis.speak(u)
}
