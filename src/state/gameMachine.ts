import type { PolarCoord } from '../types'

export type GameState =
  | 'idle'
  | 'ball:search'
  | 'ball:approach'
  | 'ball:kick-ready'
  | 'ball:kicked'
  | 'goal:search'
  | 'goal:approach'
  | 'goal:reached'

export interface MachineInput {
  cameraReady: boolean
  modelReady: boolean
  ballPolar: PolarCoord | null
  goalPolar: PolarCoord | null
  now: number
  enteredAt: number
  lastBallSeenAt: number
  lastGoalSeenAt: number
}

export const KICK_DISTANCE_M = 0.55
export const GOAL_REACH_DISTANCE_M = 0.7
export const BALL_GONE_GRACE_MS = 700
export const KICKED_HOLD_MS = 1200
export const GOAL_HOLD_MS = 4500
export const APPROACH_DWELL_MS = 800
export const TARGET_LOST_RESET_MS = 3000

export function nextState(state: GameState, i: MachineInput): GameState {
  switch (state) {
    case 'idle':
      return i.cameraReady && i.modelReady ? 'ball:search' : state

    case 'ball:search':
      return i.ballPolar ? 'ball:approach' : state

    case 'ball:approach':
      if (!i.ballPolar && i.now - i.lastBallSeenAt > TARGET_LOST_RESET_MS) {
        return 'ball:search'
      }
      if (i.now - i.enteredAt < APPROACH_DWELL_MS) return state
      if (i.ballPolar && i.ballPolar.distance < KICK_DISTANCE_M) return 'ball:kick-ready'
      return state

    case 'ball:kick-ready':
      if (i.ballPolar && i.ballPolar.distance > 1.2) return 'ball:kicked'
      if (!i.ballPolar && i.now - i.lastBallSeenAt > BALL_GONE_GRACE_MS) return 'ball:kicked'
      return state

    case 'ball:kicked':
      return i.now - i.enteredAt > KICKED_HOLD_MS ? 'goal:search' : state

    case 'goal:search':
      return i.goalPolar ? 'goal:approach' : state

    case 'goal:approach':
      if (!i.goalPolar && i.now - i.lastGoalSeenAt > TARGET_LOST_RESET_MS) {
        return 'goal:search'
      }
      if (i.now - i.enteredAt < APPROACH_DWELL_MS) return state
      if (i.goalPolar && i.goalPolar.distance < GOAL_REACH_DISTANCE_M) return 'goal:reached'
      return state

    case 'goal:reached':
      return i.now - i.enteredAt > GOAL_HOLD_MS ? 'ball:search' : state
  }
}

export function isBallPhase(s: GameState): boolean {
  return s === 'ball:search' || s === 'ball:approach' || s === 'ball:kick-ready'
}

export function isGoalPhase(s: GameState): boolean {
  return s === 'goal:search' || s === 'goal:approach'
}

export function stateLabel(s: GameState): string {
  switch (s) {
    case 'idle': return 'iniciando'
    case 'ball:search': return 'busca el balón'
    case 'ball:approach': return 'acércate al balón'
    case 'ball:kick-ready': return 'patea ahora'
    case 'ball:kicked': return 'pateaste'
    case 'goal:search': return 'busca la portería'
    case 'goal:approach': return 'acércate a la portería'
    case 'goal:reached': return '¡gol!'
  }
}
