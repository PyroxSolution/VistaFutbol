import { useEffect, useRef, useState } from 'react'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'
import type { BoundingBox, Detection } from '../types'
import { detectAnyBall, detectCyanGoal } from '../lib/detector-hsv'

const TICK_MS = 140
const COCO_MIN_SCORE = 0.28
const BALL_HOLD_MS = 600
const GOAL_HOLD_MS = 800
const SMOOTH_ALPHA = 0.55
const BALL_CLASSES = new Set(['sports ball', 'frisbee', 'apple', 'orange', 'donut'])

export interface UseDetectorResult {
  ball: Detection | null
  goal: Detection | null
  modelReady: boolean
  modelError: string | null
  fps: number
  usingFallback: boolean
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

  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null)
  const fallbackRef = useRef(false)

  const ballTrackRef = useRef<{ box: BoundingBox; score: number; cls: string; lastSeen: number } | null>(null)
  const goalTrackRef = useRef<{ box: BoundingBox; score: number; cls: string; lastSeen: number } | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    ;(async () => {
      try {
        await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'))
        await tf.ready()
        const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' })
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
            let best: (typeof preds)[number] | undefined
            for (const p of preds) {
              if (!BALL_CLASSES.has(p.class)) continue
              const weight = p.class === 'sports ball' ? 1 : 0.85
              const eff = p.score * weight
              if (!best || eff > best.score) best = { ...p, score: eff }
            }
            if (best) {
              cocoBall = {
                bbox: { x: best.bbox[0], y: best.bbox[1], width: best.bbox[2], height: best.bbox[3] },
                score: best.score,
                class: best.class,
              }
            }
          } catch {
            /* swallow inference errors */
          }
        }

        hsvBall = detectAnyBall(video)
        rawGoal = detectCyanGoal(video)
      }

      let chosen: Detection | null = null
      let usedFallback = false

      if (cocoBall && hsvBall) {
        const overlap = iou(cocoBall.bbox, hsvBall.bbox)
        if (overlap > 0.2) {
          chosen = {
            bbox: {
              x: cocoBall.bbox.x * 0.65 + hsvBall.bbox.x * 0.35,
              y: cocoBall.bbox.y * 0.65 + hsvBall.bbox.y * 0.35,
              width: cocoBall.bbox.width * 0.65 + hsvBall.bbox.width * 0.35,
              height: cocoBall.bbox.height * 0.65 + hsvBall.bbox.height * 0.35,
            },
            score: Math.min(1, cocoBall.score * 0.7 + hsvBall.score * 0.5),
            class: cocoBall.class,
          }
        } else {
          chosen = cocoBall.score >= hsvBall.score ? cocoBall : hsvBall
          usedFallback = chosen === hsvBall
        }
      } else if (cocoBall) {
        chosen = cocoBall
      } else if (hsvBall) {
        chosen = hsvBall
        usedFallback = true
      }

      if (usedFallback !== fallbackRef.current) {
        fallbackRef.current = usedFallback
        setUsingFallback(usedFallback)
      }

      const now = performance.now()

      if (chosen) {
        const prev = ballTrackRef.current
        let next: BoundingBox = chosen.bbox
        if (prev && now - prev.lastSeen < BALL_HOLD_MS) {
          next = smooth(prev.box, chosen.bbox)
        }
        ballTrackRef.current = { box: next, score: chosen.score, cls: chosen.class, lastSeen: now }
        setBall({ bbox: next, score: chosen.score, class: chosen.class })
      } else {
        const prev = ballTrackRef.current
        if (prev && now - prev.lastSeen < BALL_HOLD_MS) {
          const age = (now - prev.lastSeen) / BALL_HOLD_MS
          const decayed = prev.score * (1 - age * 0.6)
          setBall({ bbox: prev.box, score: decayed, class: prev.cls })
        } else {
          if (prev) ballTrackRef.current = null
          setBall(null)
        }
      }

      if (rawGoal) {
        const prev = goalTrackRef.current
        let next: BoundingBox = rawGoal.bbox
        if (prev && now - prev.lastSeen < GOAL_HOLD_MS) {
          next = smooth(prev.box, rawGoal.bbox, 0.4)
        }
        goalTrackRef.current = { box: next, score: rawGoal.score, cls: rawGoal.class, lastSeen: now }
        setGoal({ bbox: next, score: rawGoal.score, class: rawGoal.class })
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

  return { ball, goal, modelReady, modelError, fps, usingFallback }
}
