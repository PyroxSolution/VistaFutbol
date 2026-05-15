import { useEffect, useRef, useState } from 'react'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'
import type { Detection } from '../types'
import { detectCyanGoal, detectOrangeBall } from '../lib/detector-hsv'

const TICK_MS = 167

export interface UseDetectorResult {
  ball: Detection | null
  goal: Detection | null
  modelReady: boolean
  modelError: string | null
  fps: number
  usingFallback: boolean
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
  const missCountRef = useRef(0)
  const fallbackRef = useRef(false)

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
      let foundBall: Detection | null = null
      let foundGoal: Detection | null = null

      if (video && video.readyState >= 2) {
        const model = modelRef.current
        if (model) {
          try {
            const preds = await model.detect(video, 5, 0.25)
            const b = preds.find((p) => p.class === 'sports ball')
            if (b) {
              foundBall = {
                bbox: { x: b.bbox[0], y: b.bbox[1], width: b.bbox[2], height: b.bbox[3] },
                score: b.score,
                class: b.class,
              }
            }
          } catch {
            /* swallow inference errors */
          }
        }

        if (foundBall) {
          missCountRef.current = 0
          if (fallbackRef.current) {
            fallbackRef.current = false
            setUsingFallback(false)
          }
        } else {
          missCountRef.current += 1
          if (missCountRef.current >= 3) {
            const hsv = detectOrangeBall(video)
            if (hsv) {
              foundBall = hsv
              if (!fallbackRef.current) {
                fallbackRef.current = true
                setUsingFallback(true)
              }
            }
          }
        }

        foundGoal = detectCyanGoal(video)
      }

      if (cancelled) return
      setBall(foundBall)
      setGoal(foundGoal)
      const now = performance.now()
      setFps(Math.round(1000 / (now - lastTick)))
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
