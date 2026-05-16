import type { Detection } from '../types'

const W = 240
const H = 180

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
  satMin: 0.32,
  valMin: 0.28,
}

const BRIGHT: HsvRange = {
  hueMin: 0,
  hueMax: 360,
  satMin: 0,
  satMax: 0.32,
  valMin: 0.68,
}

const CYAN: HsvRange = {
  hueMin: 168,
  hueMax: 200,
  satMin: 0.45,
  valMin: 0.4,
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

function dilate8(mask: Uint8Array, out: Uint8Array): void {
  for (let y = 0; y < H; y++) {
    const rowMid = y * W
    const rowTop = y > 0 ? rowMid - W : -1
    const rowBot = y < H - 1 ? rowMid + W : -1
    for (let x = 0; x < W; x++) {
      const idx = rowMid + x
      if (mask[idx]) { out[idx] = 1; continue }
      const xL = x - 1
      const xR = x + 1
      let hit = 0
      if (rowTop >= 0) {
        if (xL >= 0 && mask[rowTop + xL]) hit = 1
        else if (mask[rowTop + x]) hit = 1
        else if (xR < W && mask[rowTop + xR]) hit = 1
      }
      if (!hit) {
        if (xL >= 0 && mask[rowMid + xL]) hit = 1
        else if (xR < W && mask[rowMid + xR]) hit = 1
      }
      if (!hit && rowBot >= 0) {
        if (xL >= 0 && mask[rowBot + xL]) hit = 1
        else if (mask[rowBot + x]) hit = 1
        else if (xR < W && mask[rowBot + xR]) hit = 1
      }
      out[idx] = hit
    }
  }
}

function orMasks(a: Uint8Array, b: Uint8Array, out: Uint8Array): void {
  for (let i = 0; i < a.length; i++) out[i] = a[i] | b[i]
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

function lumVariance(data: Uint8ClampedArray, blob: Blob): number {
  let sum = 0
  let sumSq = 0
  let n = 0
  const step = 2
  for (let y = blob.minY; y <= blob.maxY; y += step) {
    for (let x = blob.minX; x <= blob.maxX; x += step) {
      const i = (y * W + x) * 4
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      sum += l
      sumSq += l * l
      n++
    }
  }
  if (n === 0) return 0
  const mean = sum / n
  return sumSq / n - mean * mean
}

function scoreBallBlob(blob: Blob, minCircularity: number, arRange: [number, number]): ScoredBlob | null {
  const bw = blob.maxX - blob.minX + 1
  const bh = blob.maxY - blob.minY + 1

  if (bw < 12 || bh < 12) return null
  if (bw > W * 0.7 || bh > H * 0.7) return null

  const ar = bw / bh
  if (ar < arRange[0] || ar > arRange[1]) return null

  const expectedDisk = (Math.PI / 4) * bw * bh
  const circularity = blob.count / Math.max(1, expectedDisk)
  if (circularity < minCircularity) return null

  const cx = blob.sumX / blob.count
  const cy = blob.sumY / blob.count
  const boxCx = blob.minX + bw / 2
  const boxCy = blob.minY + bh / 2
  const offset = Math.hypot(cx - boxCx, cy - boxCy) / Math.max(bw, bh)
  if (offset > 0.2) return null

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

const maskA = new Uint8Array(W * H)
const colorfulMask = new Uint8Array(W * H)
const colorfulDilated = new Uint8Array(W * H)
const brightMask = new Uint8Array(W * H)
const brightDilated = new Uint8Array(W * H)
const fusedMask = new Uint8Array(W * H)
const fusedDilated = new Uint8Array(W * H)
const cyanMask = new Uint8Array(W * H)
const cyanDilated = new Uint8Array(W * H)

function pickBest(
  data: Uint8ClampedArray,
  mask: Uint8Array,
  minBlobPx: number,
  minCircularity: number,
  arRange: [number, number],
  minLumVar: number
): ScoredBlob | null {
  const blobs = findBlobs(mask, minBlobPx, 6)
  let best: ScoredBlob | null = null
  for (const b of blobs) {
    const scored = scoreBallBlob(b, minCircularity, arRange)
    if (!scored) continue
    if (lumVariance(data, b) < minLumVar) continue
    if (!best || scored.score > best.score) best = scored
  }
  return best
}

export function detectAnyBall(video: HTMLVideoElement): Detection | null {
  if (!video.videoWidth || !ensure() || !ctx) return null
  ctx.drawImage(video, 0, 0, W, H)
  const { data } = ctx.getImageData(0, 0, W, H)

  buildMask(data, COLORFUL, colorfulMask)
  dilate8(colorfulMask, maskA)
  dilate8(maskA, colorfulDilated)

  buildMask(data, BRIGHT, brightMask)
  dilate8(brightMask, maskA)
  dilate8(maskA, brightDilated)

  orMasks(colorfulDilated, brightDilated, fusedMask)
  dilate8(fusedMask, fusedDilated)

  const fusedBest = pickBest(data, fusedDilated, 160, 0.6, [0.62, 1.62], 180)
  if (fusedBest && fusedBest.score >= 0.66) {
    return blobToDetection(fusedBest, 'hsv-fused', video)
  }

  const colorBest = pickBest(data, colorfulDilated, 90, 0.55, [0.6, 1.65], 120)
  if (colorBest) return blobToDetection(colorBest, 'hsv-color', video)

  if (fusedBest) return blobToDetection(fusedBest, 'hsv-fused', video)

  const brightBest = pickBest(data, brightDilated, 220, 0.7, [0.62, 1.62], 180)
  return brightBest ? blobToDetection(brightBest, 'hsv-bright', video) : null
}

export function detectCyanGoal(video: HTMLVideoElement): Detection | null {
  if (!video.videoWidth || !ensure() || !ctx) return null
  ctx.drawImage(video, 0, 0, W, H)
  const { data } = ctx.getImageData(0, 0, W, H)

  buildMask(data, CYAN, cyanMask)
  dilate8(cyanMask, cyanDilated)
  const blobs = findBlobs(cyanDilated, 380, 4)

  let best: { b: Blob; bw: number; bh: number } | null = null
  for (const b of blobs) {
    const bw = b.maxX - b.minX + 1
    const bh = b.maxY - b.minY + 1
    if (bw < 20 || bh < 20) continue
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
