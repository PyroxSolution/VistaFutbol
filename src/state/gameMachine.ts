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
  ballVelocity: number
  now: number
  enteredAt: number
  lastBallSeenAt: number
  lastGoalSeenAt: number
  closeBallFrames: number
  approachBallFrames: number
  closeGoalFrames: number
}

export const KICK_DISTANCE_M = 0.5
export const KICK_EXIT_DISTANCE_M = 1.6
export const GOAL_REACH_DISTANCE_M = 0.7
export const BALL_GONE_GRACE_MS = 1000
export const KICKED_HOLD_MS = 1300
export const GOAL_HOLD_MS = 4500
export const APPROACH_DWELL_MS = 900
export const KICK_READY_MIN_HOLD_MS = 600
export const TARGET_LOST_RESET_MS = 1600
export const CLOSE_FRAMES_FOR_KICK = 5
export const APPROACH_FRAMES_TO_ENTER = 6
export const CLOSE_GOAL_FRAMES_FOR_REACH = 5
export const KICK_VELOCITY_THRESHOLD = 0.55

export function nextState(state: GameState, i: MachineInput): GameState {
  switch (state) {
    case 'idle':
      return i.cameraReady && i.modelReady ? 'ball:search' : state

    case 'ball:search':
      return i.ballPolar && i.approachBallFrames >= APPROACH_FRAMES_TO_ENTER
        ? 'ball:approach'
        : state

    case 'ball:approach':
      if (!i.ballPolar && i.now - i.lastBallSeenAt > TARGET_LOST_RESET_MS) {
        return 'ball:search'
      }
      if (i.now - i.enteredAt < APPROACH_DWELL_MS) return state
      if (
        i.ballPolar &&
        i.ballPolar.distance < KICK_DISTANCE_M &&
        i.closeBallFrames >= CLOSE_FRAMES_FOR_KICK
      ) {
        return 'ball:kick-ready'
      }
      return state

    case 'ball:kick-ready':
      if (i.now - i.enteredAt < KICK_READY_MIN_HOLD_MS) return state
      if (i.ballPolar && i.ballPolar.distance > KICK_EXIT_DISTANCE_M) return 'ball:kicked'
      if (!i.ballPolar && i.now - i.lastBallSeenAt > BALL_GONE_GRACE_MS) return 'ball:kicked'
      if (i.ballVelocity > KICK_VELOCITY_THRESHOLD) {
        if (!i.ballPolar) return 'ball:kicked'
        if (i.ballPolar.distance > KICK_DISTANCE_M * 1.5) return 'ball:kicked'
      }
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
      if (
        i.goalPolar &&
        i.goalPolar.distance < GOAL_REACH_DISTANCE_M &&
        i.closeGoalFrames >= CLOSE_GOAL_FRAMES_FOR_REACH
      ) {
        return 'goal:reached'
      }
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
