import type { Detection } from '../types'

export interface UseDetectorResult {
  detections: Detection[]
  modelReady: boolean
  fps: number
}

export function useDetector(_videoEl: HTMLVideoElement | null): UseDetectorResult {
  // TODO M2: cargar coco-ssd, correr inferencia cada 200ms,
  //          filtrar clase 'sports ball', fallback a detector HSV si no detecta
  return { detections: [], modelReady: false, fps: 0 }
}
