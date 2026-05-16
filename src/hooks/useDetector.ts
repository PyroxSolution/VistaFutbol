import { useEffect, useRef, useState } from 'react'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'
import type { BoundingBox, Detection } from '../types'
import { detectAnyBall, detectCyanGoal } from '../lib/detector-hsv'

const TICK_MS = 140
const COCO_MIN_SCORE = 0.26
const COCO_HIGH_CONFIDENCE = 0.46
const HSV_SOLO_MIN_SCORE = 0.58
const BALL_HOLD_MS = 320
const GOAL_HOLD_MS = 700
const SMOOTH_ALPHA = 0.5
const AR_MIN = 0.6
const AR_MAX = 1.7
const MIN_SIDE_PX = 18

export interface UseDetectorResult {
  ball: Detection | null
  goal: Detection | null
  modelReady: boolean
  modelError: string | null
  fps: number
  usingFallback: boolean
  ballVelocity: number
}

function smooth(prev: BoundingBox, cur: BoundingBox, a = SMOOTH_ALPHA): BoundingBox {
  return {
    x: prev.x * (1 - a) + cur.x * a,
    y: prev.y * (1 - a) + cur.y * a,
    width: prev.width * (1 - a) + cur.width * a,
    height: prev.height * (1 - a) + cur.height * a,
  }
}

function iou(a: BoundingBox, b: BoundingBox): number {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  const w = Math.max(0, x2 - x1)
  const h = Math.max(0, y2 - y1)
  const inter = w * h
  const union = a.width * a.height + b.width * b.height - inter
  return union <= 0 ? 0 : inter / union
}

function isBallShape(bbox: BoundingBox): boolean {
  if (bbox.width < MIN_SIDE_PX || bbox.height < MIN_SIDE_PX) return false
  const ar = bbox.width / Math.max(1, bbox.height)
  return ar >= AR_MIN && ar <= AR_MAX
}

export function useDetector(
  videoRef: React.RefObject<HTMLVideoElement>,
  enabled: boolean
): UseDetectorResult {
  const [ball, setBall] = useState<Detection | null>(null)
  const [goal, setGoal] = useState<Detection | null>(null)
  const [modelReady, setModelReady] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [fps, setFps] = useState(0)
  const [usingFallback, setUsingFallback] = useState(false)
  const [ballVelocity, setBallVelocity] = useState(0)

  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null)
  const fallbackRef = useRef(false)

  const ballTrackRef = useRef<{ box: BoundingBox; score: number; cls: string; lastSeen: number } | null>(null)
  const goalTrackRef = useRef<{ box: BoundingBox; score: number; cls: string; lastSeen: number } | null>(null)
  const lastCentroidRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const velocityEmaRef = useRef(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    ;(async () => {
      try {
        await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'))
        await tf.ready()
        const model = await cocoSsd.load({ base: 'mobilenet_v2' })
        if (cancelled) return
        modelRef.current = model
        setModelReady(true)
      } catch (e) {
        if (cancelled) return
        setModelError(e instanceof Error ? e.message : 'No pude cargar el modelo')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let lastTick = performance.now()
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      if (cancelled) return
      const t0 = performance.now()

      const video = videoRef.current
      let cocoBall: Detection | null = null
      let hsvBall: Detection | null = null
      let rawGoal: Detection | null = null

      if (video && video.readyState >= 2) {
        const model = modelRef.current
        if (model) {
          try {
            const preds = await model.detect(video, 10, COCO_MIN_SCORE)
            let best: { bbox: BoundingBox; score: number; class: string } | null = null
            for (const p of preds) {
              if (p.class !== 'sports ball') continue
              const bbox: BoundingBox = {
                x: p.bbox[0],
                y: p.bbox[1],
                width: p.bbox[2],
                height: p.bbox[3],
              }
              if (!isBallShape(bbox)) continue
              if (!best || p.score > best.score) {
                best = { bbox, score: p.score, class: p.class }
              }
            }
            if (best) cocoBall = best
          } catch {
            /* swallow inference errors */
          }
        }

        const rawHsv = detectAnyBall(video)
        if (rawHsv && isBallShape(rawHsv.bbox)) hsvBall = rawHsv

        rawGoal = detectCyanGoal(video)
      }

      let chosen: Detection | null = null
      let usedFallback = false

      if (cocoBall && hsvBall) {
        const overlap = iou(cocoBall.bbox, hsvBall.bbox)
        if (overlap > 0.18) {
          chosen = {
            bbox: {
              x: cocoBall.bbox.x * 0.65 + hsvBall.bbox.x * 0.35,
              y: cocoBall.bbox.y * 0.65 + hsvBall.bbox.y * 0.35,
              width: cocoBall.bbox.width * 0.65 + hsvBall.bbox.width * 0.35,
              height: cocoBall.bbox.height * 0.65 + hsvBall.bbox.height * 0.35,
            },
            score: Math.min(1, cocoBall.score * 0.75 + hsvBall.score * 0.4),
            class: cocoBall.class,
          }
        } else if (cocoBall.score >= COCO_HIGH_CONFIDENCE) {
          chosen = cocoBall
        } else if (hsvBall.score >= HSV_SOLO_MIN_SCORE) {
          chosen = hsvBall
          usedFallback = true
        }
      } else if (cocoBall && cocoBall.score >= COCO_HIGH_CONFIDENCE) {
        chosen = cocoBall
      } else if (hsvBall && hsvBall.score >= HSV_SOLO_MIN_SCORE) {
        chosen = hsvBall
        usedFallback = true
      }

      if (usedFallback !== fallbackRef.current) {
        fallbackRef.current = usedFallback
        setUsingFallback(usedFallback)
      }

      const now = performance.now()
      const frameW = video?.videoWidth ?? 1
      const frameH = video?.videoHeight ?? 1

      if (chosen) {
        const cx = (chosen.bbox.x + chosen.bbox.width / 2) / Math.max(1, frameW)
        const cy = (chosen.bbox.y + chosen.bbox.height / 2) / Math.max(1, frameH)
        const last = lastCentroidRef.current
        if (last && now - last.t < 500) {
          const dt = Math.max(0.04, (now - last.t) / 1000)
          const v = Math.hypot(cx - last.x, cy - last.y) / dt
          velocityEmaRef.current = velocityEmaRef.current * 0.55 + v * 0.45
        } else {
          velocityEmaRef.current = 0
        }
        lastCentroidRef.current = { x: cx, y: cy, t: now }

        const prev = ballTrackRef.current
        let nextBox: BoundingBox = chosen.bbox
        if (prev && now - prev.lastSeen < BALL_HOLD_MS) {
          nextBox = smooth(prev.box, chosen.bbox)
        }
        ballTrackRef.current = { box: nextBox, score: chosen.score, cls: chosen.class, lastSeen: now }
        setBall({ bbox: nextBox, score: chosen.score, class: chosen.class })
      } else {
        const prev = ballTrackRef.current
        if (prev && now - prev.lastSeen < BALL_HOLD_MS) {
          const age = (now - prev.lastSeen) / BALL_HOLD_MS
          const decayed = prev.score * (1 - age * 0.7)
          setBall({ bbox: prev.box, score: decayed, class: prev.cls })
        } else {
          if (prev) ballTrackRef.current = null
          setBall(null)
          lastCentroidRef.current = null
        }
        velocityEmaRef.current *= 0.7
      }

      setBallVelocity(velocityEmaRef.current)

      if (rawGoal) {
        const prev = goalTrackRef.current
        let nextBox: BoundingBox = rawGoal.bbox
        if (prev && now - prev.lastSeen < GOAL_HOLD_MS) {
          nextBox = smooth(prev.box, rawGoal.bbox, 0.4)
        }
        goalTrackRef.current = { box: nextBox, score: rawGoal.score, cls: rawGoal.class, lastSeen: now }
        setGoal({ bbox: nextBox, score: rawGoal.score, class: rawGoal.class })
      } else {
        const prev = goalTrackRef.current
        if (prev && now - prev.lastSeen < GOAL_HOLD_MS) {
          setGoal({ bbox: prev.box, score: prev.score * 0.85, class: prev.cls })
        } else {
          if (prev) goalTrackRef.current = null
          setGoal(null)
        }
      }

      if (cancelled) return
      setFps(Math.round(1000 / Math.max(1, now - lastTick)))
      lastTick = now

      const elapsed = performance.now() - t0
      timeoutId = setTimeout(tick, Math.max(0, TICK_MS - elapsed))
    }

    tick()

    return () => {
      cancelled = true
      if (timeoutId !== null) clearTimeout(timeoutId)
    }
  }, [enabled, videoRef])

  return { ball, goal, modelReady, modelError, fps, usingFallback, ballVelocity }
}
