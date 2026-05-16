import type { BoundingBox, PolarCoord } from '../types'

const FOV_HORIZONTAL_DEG = 65
export const REFERENCE_BALL_DIAMETER_M = 0.22
export const REFERENCE_GOAL_WIDTH_M = 0.6

export function bboxToPolar(
  bbox: BoundingBox,
  frameWidth: number,
  frameHeight: number,
  referenceSize: number = REFERENCE_BALL_DIAMETER_M,
  useWidthOnly: boolean = false
): PolarCoord {
  const cx = bbox.x + bbox.width / 2
  const normalized = cx / frameWidth - 0.5
  const angleDeg = normalized * FOV_HORIZONTAL_DEG
  const angle = (angleDeg * Math.PI) / 180

  const focalPx = frameWidth / (2 * Math.tan((FOV_HORIZONTAL_DEG * Math.PI) / 360))
  const size = useWidthOnly ? bbox.width : Math.min(bbox.width, bbox.height)
  const distance = (referenceSize * focalPx) / Math.max(size, 1)

  void frameHeight
  return { angle, distance }
}

export function angleToClockHour(angleRad: number): number {
  const deg = (angleRad * 180) / Math.PI
  const hour = 12 + (deg / 30)
  const normalized = ((hour - 1) % 12) + 1
  return Math.round(normalized)
}

export function directionLabel(angleRad: number): string {
  const deg = (angleRad * 180) / Math.PI
  if (deg < -22) return 'a la izquierda'
  if (deg < -7) return 'media izquierda'
  if (deg > 22) return 'a la derecha'
  if (deg > 7) return 'media derecha'
  return 'al frente'
}

export function shortDirectionLabel(angleRad: number): string {
  const deg = (angleRad * 180) / Math.PI
  if (deg < -10) return 'izq'
  if (deg > 10) return 'der'
  return 'frente'
}
