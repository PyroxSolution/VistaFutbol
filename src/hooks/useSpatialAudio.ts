import type { PolarCoord } from '../types'

export interface UseSpatialAudioResult {
  play: (sound: 'beep' | 'kick' | 'goal', position?: PolarCoord) => void
  ready: boolean
}

export function useSpatialAudio(): UseSpatialAudioResult {
  // TODO M4: inicializar AudioContext, cargar HRTF, exponer play() con PannerNode
  return {
    play: () => {},
    ready: false,
  }
}
