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
  satMax?: number
  valMin: number
  valMax?: number
  minPixels: number
  minDensity: number
  className: string
}

const COLORFUL_BALL: HsvRange = {
  hueMin: 0,
  hueMax: 360,
  satMin: 0.55,
  valMin: 0.45,
  minPixels: 110,
  minDensity: 0.3,
  className: 'colorful-ball',
}

const WHITE_BALL: HsvRange = {
  hueMin: 0,
  hueMax: 360,
  satMin: 0,
  satMax: 0.3,
  valMin: 0.62,
  minPixels: 150,
  minDensity: 0.38,
  className: 'white-ball',
}

const CYAN_GOAL: HsvRange = {
  hueMin: 170,
  hueMax: 200,
  satMin: 0.55,
  valMin: 0.45,
  minPixels: 280,
  minDensity: 0.32,
  className: 'cyan-goal',
}

function detectBlob(video: HTMLVideoElement, range: HsvRange): Detection | null {
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
  let sumX = 0
  let sumY = 0

  const satMax = range.satMax ?? 1.01
  const valMax = range.valMax ?? 1.01
  const skipHue = range.hueMin <= 0 && range.hueMax >= 360

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
      if (s < range.satMin || s > satMax) continue
      if (v < range.valMin || v > valMax) continue

      if (!skipHue) {
        let h: number
        const d = max - min
        if (d === 0) h = 0
        else if (max === r) h = ((g - b) / d) % 6
        else if (max === g) h = (b - r) / d + 2
        else h = (r - g) / d + 4
        h *= 60
        if (h < 0) h += 360
        if (h < range.hueMin || h > range.hueMax) continue
      }

      count++
      sumX += x
      sumY += y
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  if (count < range.minPixels) return null

  const bw = maxX - minX
  const bh = maxY - minY

  if (bw < 10 || bh < 10) return null
  if (bw > W * 0.75 || bh > H * 0.75) return null

  const ar = bw / Math.max(1, bh)
  if (ar < 0.45 || ar > 2.2) return null

  const area = bw * bh
  const density = count / Math.max(1, area)
  if (density < range.minDensity) return null

  const cx = sumX / count
  const cy = sumY / count
  const bboxCx = minX + bw / 2
  const bboxCy = minY + bh / 2
  const centroidOffset =
    Math.sqrt((cx - bboxCx) ** 2 + (cy - bboxCy) ** 2) / Math.max(bw, bh)
  if (centroidOffset > 0.25) return null

  const sx = video.videoWidth / W
  const sy = video.videoHeight / H

  return {
    bbox: {
      x: minX * sx,
      y: minY * sy,
      width: bw * sx,
      height: bh * sy,
    },
    score: Math.min(1, density * 1.5),
    class: range.className,
  }
}

export function detectAnyBall(video: HTMLVideoElement): Detection | null {
  const colorful = detectBlob(video, COLORFUL_BALL)
  if (colorful) return colorful
  return detectBlob(video, WHITE_BALL)
}

export function detectCyanGoal(video: HTMLVideoElement): Detection | null {
  return detectBlob(video, CYAN_GOAL)
}
