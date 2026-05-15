export interface UseTTSResult {
  speak: (text: string, priority?: 'low' | 'high') => void
  ready: boolean
}

export function useTTS(): UseTTSResult {
  // TODO M5: usar SpeechSynthesis con voz es-MX, cola con prioridades
  return {
    speak: () => {},
    ready: false,
  }
}
