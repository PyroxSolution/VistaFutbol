import { useEffect, useRef } from 'react'
import type { Detection } from '../types'

interface Props {
  detection: Detection | null
  videoRef: React.RefObject<HTMLVideoElement>
}

export function DetectionOverlay({ detection, videoRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return

    if (canvas.width !== vw) canvas.width = vw
    if (canvas.height !== vh) canvas.height = vh

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, vw, vh)

    if (!detection) return

    const { x, y, width, height } = detection.bbox
    ctx.strokeStyle = '#ff6b1a'
    ctx.lineWidth = Math.max(2, vw / 240)
    ctx.strokeRect(x, y, width, height)

    ctx.fillStyle = '#ff6b1a'
    ctx.beginPath()
    ctx.arc(x + width / 2, y + height / 2, Math.max(3, vw / 200), 0, Math.PI * 2)
    ctx.fill()
  }, [detection, videoRef])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
    />
  )
}
