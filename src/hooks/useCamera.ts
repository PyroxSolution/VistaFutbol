import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseCameraOptions {
  facingMode?: 'user' | 'environment'
  width?: number
  height?: number
}

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>
  ready: boolean
  error: string | null
  start: () => Promise<void>
  stop: () => void
}

const FRIENDLY: Record<string, string> = {
  NotAllowedError: 'Necesito acceso a la cámara. Tócala otra vez y dale "Permitir".',
  NotFoundError: 'No encontré una cámara en este dispositivo.',
  NotReadableError: 'La cámara está ocupada por otra app. Ciérrala e intenta de nuevo.',
  OverconstrainedError: 'Esta cámara no soporta la resolución pedida.',
  SecurityError: 'La cámara solo funciona sobre HTTPS.',
}

export function useCamera(options: UseCameraOptions = {}): UseCameraResult {
  const { facingMode = 'environment', width = 1280, height = 720 } = options

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setReady(false)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: width },
          height: { ideal: height },
        },
      })
      streamRef.current = stream
      const v = videoRef.current
      if (!v) return
      v.srcObject = stream
      await v.play()
      setReady(true)
    } catch (e) {
      const name = e instanceof Error ? e.name : ''
      const msg = FRIENDLY[name] ?? (e instanceof Error ? e.message : 'No pude abrir la cámara.')
      setError(msg)
      setReady(false)
    }
  }, [facingMode, width, height])

  useEffect(() => () => stop(), [stop])

  return { videoRef, ready, error, start, stop }
}
