import type { Detection } from '../types'

const W = 160
const H = 120

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null

function ensure(): boolean {
  if (canvas && ctx) return true
  canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const c = canvas.getContext('2d', { willReadFrequently: true })
  if (!c) return false
  ctx = c
  return true
}

interface HsvRange {
  hueMin: number
  hueMax: number
  satMin: number
  satMax?: number
  valMin: number
  valMax?: number
}

interface Blob {
  minX: number
  minY: number
  maxX: number
  maxY: number
  count: number
  sumX: number
  sumY: number
}

const COLORFUL: HsvRange = {
  hueMin: 0,
  hueMax: 360,
  satMin: 0.35,
  valMin: 0.3,
}

const BRIGHT: HsvRange = {
  hueMin: 0,
  hueMax: 360,
  satMin: 0,
  satMax: 0.3,
  valMin: 0.7,
}

const CYAN: HsvRange = {
  hueMin: 160,
  hueMax: 210,
  satMin: 0.4,
  valMin: 0.35,
}

function buildMask(data: Uint8ClampedArray, range: HsvRange, out: Uint8Array): void {
  const satMax = range.satMax ?? 1.01
  const valMax = range.valMax ?? 1.01
  const skipHue = range.hueMin <= 0 && range.hueMax >= 360

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = y * W + x
      const i = px * 4
      const r = data[i] / 255
      const g = data[i + 1] / 255
      const b = data[i + 2] / 255
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const v = max
      const s = max === 0 ? 0 : (max - min) / max

      if (s < range.satMin || s > satMax) { out[px] = 0; continue }
      if (v < range.valMin || v > valMax) { out[px] = 0; continue }

      if (!skipHue) {
        let h: number
        const d = max - min
        if (d === 0) h = 0
        else if (max === r) h = ((g - b) / d) % 6
        else if (max === g) h = (b - r) / d + 2
        else h = (r - g) / d + 4
        h *= 60
        if (h < 0) h += 360
        if (h < range.hueMin || h > range.hueMax) { out[px] = 0; continue }
      }

      out[px] = 1
    }
  }
}

function dilate(mask: Uint8Array, out: Uint8Array): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x
      if (mask[idx]) { out[idx] = 1; continue }
      let hit = 0
      if (x > 0 && mask[idx - 1]) hit = 1
      else if (x < W - 1 && mask[idx + 1]) hit = 1
      else if (y > 0 && mask[idx - W]) hit = 1
      else if (y < H - 1 && mask[idx + W]) hit = 1
      out[idx] = hit
    }
  }
}

const stack = new Int32Array(W * H)
const visited = new Uint8Array(W * H)

function findBlobs(mask: Uint8Array, minCount: number, maxBlobs = 6): Blob[] {
  visited.fill(0)
  const blobs: Blob[] = []

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const start = y * W + x
      if (!mask[start] || visited[start]) continue

      let sp = 0
      stack[sp++] = start
      visited[start] = 1

      let minX = x, maxX = x, minY = y, maxY = y, count = 0
      let sumX = 0, sumY = 0

      while (sp > 0) {
        const p = stack[--sp]
        const px = p % W
        const py = (p - px) / W
        count++
        sumX += px
        sumY += py
        if (px < minX) minX = px
        if (px > maxX) maxX = px
        if (py < minY) minY = py
        if (py > maxY) maxY = py

        if (px > 0) {
          const n = p - 1
          if (mask[n] && !visited[n]) { visited[n] = 1; stack[sp++] = n }
        }
        if (px < W - 1) {
          const n = p + 1
          if (mask[n] && !visited[n]) { visited[n] = 1; stack[sp++] = n }
        }
        if (py > 0) {
          const n = p - W
          if (mask[n] && !visited[n]) { visited[n] = 1; stack[sp++] = n }
        }
        if (py < H - 1) {
          const n = p + W
          if (mask[n] && !visited[n]) { visited[n] = 1; stack[sp++] = n }
        }
      }

      if (count >= minCount) {
        blobs.push({ minX, minY, maxX, maxY, count, sumX, sumY })
      }
    }
  }

  blobs.sort((a, b) => b.count - a.count)
  return blobs.slice(0, maxBlobs)
}

interface ScoredBlob {
  blob: Blob
  score: number
  bw: number
  bh: number
}

function scoreBallBlob(blob: Blob, minCircularity: number): ScoredBlob | null {
  const bw = blob.maxX - blob.minX + 1
  const bh = blob.maxY - blob.minY + 1

  if (bw < 9 || bh < 9) return null
  if (bw > W * 0.7 || bh > H * 0.7) return null

  const ar = bw / bh
  if (ar < 0.62 || ar > 1.62) return null

  const expectedDisk = (Math.PI / 4) * bw * bh
  const circularity = blob.count / Math.max(1, expectedDisk)
  if (circularity < minCircularity) return null

  const cx = blob.sumX / blob.count
  const cy = blob.sumY / blob.count
  const boxCx = blob.minX + bw / 2
  const boxCy = blob.minY + bh / 2
  const offset = Math.hypot(cx - boxCx, cy - boxCy) / Math.max(bw, bh)
  if (offset > 0.18) return null

  const arPenalty = 1 - Math.min(1, Math.abs(ar - 1) * 0.8)
  const score = Math.min(1, circularity * 0.65 + arPenalty * 0.35)

  return { blob, score, bw, bh }
}

function blobToDetection(
  sb: ScoredBlob,
  className: string,
  video: HTMLVideoElement
): Detection {
  const sx = video.videoWidth / W
  const sy = video.videoHeight / H
  return {
    bbox: {
      x: sb.blob.minX * sx,
      y: sb.blob.minY * sy,
      width: sb.bw * sx,
      height: sb.bh * sy,
    },
    score: sb.score,
    class: className,
  }
}

const colorfulMask = new Uint8Array(W * H)
const colorfulDilated = new Uint8Array(W * H)
const brightMask = new Uint8Array(W * H)
const cyanMask = new Uint8Array(W * H)
const cyanDilated = new Uint8Array(W * H)

export function detectAnyBall(video: HTMLVideoElement): Detection | null {
  if (!video.videoWidth || !ensure() || !ctx) return null
  ctx.drawImage(video, 0, 0, W, H)
  const { data } = ctx.getImageData(0, 0, W, H)

  buildMask(data, COLORFUL, colorfulMask)
  dilate(colorfulMask, colorfulDilated)
  const colorBlobs = findBlobs(colorfulDilated, 55, 6)

  let best: ScoredBlob | null = null
  for (const b of colorBlobs) {
    const scored = scoreBallBlob(b, 0.55)
    if (scored && (!best || scored.score > best.score)) best = scored
  }

  if (best) return blobToDetection(best, 'hsv-color', video)

  buildMask(data, BRIGHT, brightMask)
  const brightBlobs = findBlobs(brightMask, 120, 4)
  for (const b of brightBlobs) {
    const scored = scoreBallBlob(b, 0.7)
    if (scored && (!best || scored.score > best.score)) best = scored
  }

  return best ? blobToDetection(best, 'hsv-bright', video) : null
}

export function detectCyanGoal(video: HTMLVideoElement): Detection | null {
  if (!video.videoWidth || !ensure() || !ctx) return null
  ctx.drawImage(video, 0, 0, W, H)
  const { data } = ctx.getImageData(0, 0, W, H)

  buildMask(data, CYAN, cyanMask)
  dilate(cyanMask, cyanDilated)
  const blobs = findBlobs(cyanDilated, 180, 4)

  let best: { b: Blob; bw: number; bh: number } | null = null
  for (const b of blobs) {
    const bw = b.maxX - b.minX + 1
    const bh = b.maxY - b.minY + 1
    if (bw < 14 || bh < 14) continue
    if (bw > W * 0.85 || bh > H * 0.85) continue
    const ar = bw / bh
    if (ar < 0.25 || ar > 4.5) continue
    if (!best || b.count > best.b.count) best = { b, bw, bh }
  }

  if (!best) return null

  const sx = video.videoWidth / W
  const sy = video.videoHeight / H
  const density = best.b.count / Math.max(1, best.bw * best.bh)

  return {
    bbox: {
      x: best.b.minX * sx,
      y: best.b.minY * sy,
      width: best.bw * sx,
      height: best.bh * sy,
    },
    score: Math.min(1, density * 1.2),
    class: 'cyan-goal',
  }
}
