import type { Detection } from '../types'

const W = 160
const H = 120

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null

function ensure() {
  if (canvas && ctx) return
  canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  ctx = canvas.getContext('2d', { willReadFrequently: true })
}

interface HsvRange {
  hueMin: number
  hueMax: number
  satMin: number
  valMin: number
  minPixels: number
  className: string
}

const ORANGE: HsvRange = {
  hueMin: 8,
  hueMax: 35,
  satMin: 0.5,
  valMin: 0.4,
  minPixels: 30,
  className: 'orange-ball',
}

const CYAN: HsvRange = {
  hueMin: 165,
  hueMax: 215,
  satMin: 0.4,
  valMin: 0.35,
  minPixels: 50,
  className: 'cyan-goal',
}

function detectColor(video: HTMLVideoElement, range: HsvRange): Detection | null {
  if (!video.videoWidth) return null
  ensure()
  if (!canvas || !ctx) return null

  ctx.drawImage(video, 0, 0, W, H)
  const { data } = ctx.getImageData(0, 0, W, H)

  let minX = W
  let minY = H
  let maxX = 0
  let maxY = 0
  let count = 0

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const r = data[i] / 255
      const g = data[i + 1] / 255
      const b = data[i + 2] / 255
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const v = max
      const s = max === 0 ? 0 : (max - min) / max
      if (s < range.satMin || v < range.valMin) continue

      let h: number
      const d = max - min
      if (d === 0) h = 0
      else if (max === r) h = ((g - b) / d) % 6
      else if (max === g) h = (b - r) / d + 2
      else h = (r - g) / d + 4
      h *= 60
      if (h < 0) h += 360

      if (h < range.hueMin || h > range.hueMax) continue

      count++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  if (count < range.minPixels) return null

  const sx = video.videoWidth / W
  const sy = video.videoHeight / H

  return {
    bbox: {
      x: minX * sx,
      y: minY * sy,
      width: (maxX - minX) * sx,
      height: (maxY - minY) * sy,
    },
    score: Math.min(1, count / 600),
    class: range.className,
  }
}

export function detectOrangeBall(video: HTMLVideoElement): Detection | null {
  return detectColor(video, ORANGE)
}

export function detectCyanGoal(video: HTMLVideoElement): Detection | null {
  return detectColor(video, CYAN)
}
