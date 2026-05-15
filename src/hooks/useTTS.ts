import { cancelSpeech, isTTSSupported, speak } from '../lib/tts-engine'

export interface UseTTSResult {
  speak: (text: string, priority?: 'high' | 'low') => void
  cancel: () => void
  supported: boolean
}

export function useTTS(): UseTTSResult {
  return {
    speak,
    cancel: cancelSpeech,
    supported: isTTSSupported(),
  }
}
