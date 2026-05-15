import type { PolarCoord } from '../types'
import { angleToClockHour } from './geometry'

export function narrateBallPosition(coord: PolarCoord): string {
  const hour = angleToClockHour(coord.angle)
  const meters = coord.distance.toFixed(1)
  return `Balón a ${meters} metros, dirección ${hour}`
}

export function narrateProximity(distance: number): string {
  if (distance < 0.5) return 'patea'
  if (distance < 1) return 'un metro'
  if (distance < 2) return 'dos metros'
  if (distance < 3) return 'tres metros'
  return `${distance.toFixed(0)} metros`
}

export function narrateGoal(): string {
  return '¡GOOOOL!'
}
