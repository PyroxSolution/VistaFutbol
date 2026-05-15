import { useEffect, useRef, useState } from 'react'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'
import type { Detection } from '../types'
import { detectOrangeBall } from '../lib/detector-hsv'

const TICK_MS = 167

export interface UseDetectorResult {
  detection: Detection | null
  modelReady: boolean
  modelError: string | null
  fps: number
  usingFallback: boolean
}

export function useDetector(
  videoRef: React.RefObject<HTMLVideoElement>,
  enabled: boolean
): UseDetectorResult {
  const [detection, setDetection] = useState<Detection | null>(null)
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
      let found: Detection | null = null

      if (video && video.readyState >= 2) {
        const model = modelRef.current
        if (model) {
          try {
            const preds = await model.detect(video, 5, 0.25)
            const ball = preds.find((p) => p.class === 'sports ball')
            if (ball) {
              found = {
                bbox: {
                  x: ball.bbox[0],
                  y: ball.bbox[1],
                  width: ball.bbox[2],
                  height: ball.bbox[3],
                },
                score: ball.score,
                class: ball.class,
              }
            }
          } catch {
            /* swallow inference errors */
          }
        }

        if (found) {
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
              found = hsv
              if (!fallbackRef.current) {
                fallbackRef.current = true
                setUsingFallback(true)
              }
            }
          }
        }
      }

      if (cancelled) return
      setDetection(found)
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

  return { detection, modelReady, modelError, fps, usingFallback }
}
