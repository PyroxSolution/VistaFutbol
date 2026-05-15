import { useEffect, useState } from 'react'
import type { PolarCoord } from '../types'
import {
  isAudioReady,
  onAudioStateChange,
  playGoal,
  playKick,
  setAudioTarget,
} from '../lib/audio-engine'

export interface UseSpatialAudioResult {
  ready: boolean
  setTarget: (polar: PolarCoord | null) => void
  playGoal: () => void
  playKick: () => void
}

export function useSpatialAudio(): UseSpatialAudioResult {
  const [ready, setReady] = useState(isAudioReady())

  useEffect(() => {
    setReady(isAudioReady())
    const unsub = onAudioStateChange(() => setReady(isAudioReady()))
    return () => {
      unsub()
    }
  }, [])

  return { ready, setTarget: setAudioTarget, playGoal, playKick }
}
