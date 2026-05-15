import { useMemo } from 'react'
import type { PlatformCapabilities } from '../types'

export function usePlatformCapabilities(): PlatformCapabilities {
  return useMemo(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    const isAndroid = /Android/.test(ua)
    const hasVibration =
      typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
    const hasSpatialAudio =
      typeof window !== 'undefined' && typeof (window as unknown as { AudioContext?: unknown }).AudioContext !== 'undefined'
    const hasDeviceOrientation =
      typeof window !== 'undefined' && 'DeviceOrientationEvent' in window

    return {
      hasVibration,
      hasSpatialAudio,
      hasDeviceOrientation,
      isIOS,
      isAndroid,
    }
  }, [])
}
