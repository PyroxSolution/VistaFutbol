import type { PolarCoord } from '../types'

let ctx: AudioContext | null = null
let panner: PannerNode | null = null
let masterGain: GainNode | null = null
let target: PolarCoord | null = null
let loopId: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function onAudioStateChange(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function isAudioReady(): boolean {
  return ctx !== null && ctx.state === 'running'
}

export async function initAudio(): Promise<void> {
  if (ctx) {
    if (ctx.state === 'suspended') {
      await ctx.resume()
      emit()
    }
    return
  }
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) throw new Error('Web Audio no soportado en este navegador')
  ctx = new Ctor()

  masterGain = ctx.createGain()
  masterGain.gain.value = 0.7

  panner = ctx.createPanner()
  panner.panningModel = 'HRTF'
  panner.distanceModel = 'inverse'
  panner.refDistance = 0.5
  panner.maxDistance = 8
  panner.rolloffFactor = 1.4

  panner.connect(masterGain).connect(ctx.destination)

  if (ctx.listener.forwardX) {
    const now = ctx.currentTime
    ctx.listener.forwardX.setValueAtTime(0, now)
    ctx.listener.forwardY.setValueAtTime(0, now)
    ctx.listener.forwardZ.setValueAtTime(-1, now)
    ctx.listener.upX.setValueAtTime(0, now)
    ctx.listener.upY.setValueAtTime(1, now)
    ctx.listener.upZ.setValueAtTime(0, now)
  } else {
    ctx.listener.setOrientation(0, 0, -1, 0, 1, 0)
  }

  if (ctx.state === 'suspended') await ctx.resume()

  scheduleLoop()
  emit()
}

function setPannerPos(x: number, z: number) {
  if (!ctx || !panner) return
  const t = ctx.currentTime
  if (panner.positionX) {
    panner.positionX.setValueAtTime(x, t)
    panner.positionY.setValueAtTime(0, t)
    panner.positionZ.setValueAtTime(z, t)
  } else {
    panner.setPosition(x, 0, z)
  }
}

export function setAudioTarget(polar: PolarCoord | null): void {
  target = polar
  if (polar) {
    const x = Math.sin(polar.angle) * polar.distance
    const z = -Math.cos(polar.angle) * polar.distance
    setPannerPos(x, z)
  }
}

function blip() {
  if (!ctx || !panner || !target) return
  const now = ctx.currentTime
  const dist = Math.max(0.3, Math.min(target.distance, 8))
  const freq = Math.round(880 - (dist / 8) * 550)

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = freq

  const env = ctx.createGain()
  env.gain.setValueAtTime(0, now)
  env.gain.linearRampToValueAtTime(0.5, now + 0.008)
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.09)

  osc.connect(env).connect(panner)
  osc.start(now)
  osc.stop(now + 0.12)
}

function scheduleLoop() {
  if (loopId !== null) clearTimeout(loopId)
  if (target) blip()
  const dist = target?.distance ?? 5
  const clamped = Math.max(0.3, Math.min(dist, 6))
  const interval = Math.round(100 + (clamped / 6) * 700)
  loopId = setTimeout(scheduleLoop, interval)
}

export function playGoal(): void {
  if (!ctx) return
  const out = masterGain ?? ctx.destination
  const now = ctx.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((freq, i) => {
    const osc = ctx!.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const env = ctx!.createGain()
    const t = now + i * 0.11
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(0.4, t + 0.01)
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.32)
    osc.connect(env).connect(out)
    osc.start(t)
    osc.stop(t + 0.4)
  })
}

export function duckMaster(targetGain: number, duration = 0.05): void {
  if (!masterGain || !ctx) return
  const now = ctx.currentTime
  masterGain.gain.cancelScheduledValues(now)
  masterGain.gain.setValueAtTime(masterGain.gain.value, now)
  masterGain.gain.linearRampToValueAtTime(targetGain, now + duration)
}

export function playKick(): void {
  if (!ctx) return
  const out = masterGain ?? ctx.destination
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(120, now)
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.12)
  const env = ctx.createGain()
  env.gain.setValueAtTime(0, now)
  env.gain.linearRampToValueAtTime(0.55, now + 0.005)
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
  osc.connect(env).connect(out)
  osc.start(now)
  osc.stop(now + 0.22)
}
