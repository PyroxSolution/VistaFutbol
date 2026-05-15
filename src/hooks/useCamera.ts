import { useEffect, useRef, useState } from 'react'

export interface UseCameraOptions {
  facingMode?: 'user' | 'environment'
  width?: number
  height?: number
}

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>
  ready: boolean
  error: string | null
}

export function useCamera(_options: UseCameraOptions = {}): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null!)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // TODO M1: implementar getUserMedia, asignar stream a videoRef, manejar permisos
    void setReady
    void setError
  }, [])

  return { videoRef, ready, error }
}
