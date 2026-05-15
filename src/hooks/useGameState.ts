import { useEffect, useRef, useState } from 'react'
import { playGoal, playKick } from '../lib/audio-engine'
import { vibrate } from '../lib/haptics'
import { angleToClockHour } from '../lib/geometry'
import { speak } from '../lib/tts-engine'
import { nextState, type GameState } from '../state/gameMachine'
import type { PolarCoord } from '../types'

export interface UseGameStateInput {
  cameraReady: boolean
  modelReady: boolean
  ballPolar: PolarCoord | null
  goalPolar: PolarCoord | null
}

export function useGameState(input: UseGameStateInput): GameState {
  const [state, setState] = useState<GameState>('idle')

  const inputRef = useRef(input)
  const stateRef = useRef(state)
  const enteredAtRef = useRef(performance.now())
  const lastBallSeenAtRef = useRef(0)
  const lastGoalSeenAtRef = useRef(0)

  useEffect(() => {
    inputRef.current = input
    const now = performance.now()
    if (input.ballPolar) lastBallSeenAtRef.current = now
    if (input.goalPolar) lastGoalSeenAtRef.current = now
  }, [input])

  useEffect(() => {
    stateRef.current = state
    enteredAtRef.current = performance.now()
    runEnterEffects(state)
  }, [state])

  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current
      const i = inputRef.current
      const next = nextState(s, {
        cameraReady: i.cameraReady,
        modelReady: i.modelReady,
        ballPolar: i.ballPolar,
        goalPolar: i.goalPolar,
        now: performance.now(),
        enteredAt: enteredAtRef.current,
        lastBallSeenAt: lastBallSeenAtRef.current,
        lastGoalSeenAt: lastGoalSeenAtRef.current,
      })
      if (next !== s) setState(next)
    }, 80)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (state !== 'ball:approach' && state !== 'goal:approach') return

    let intervalId: ReturnType<typeof setInterval> | null = null

    const narrate = () => {
      const i = inputRef.current
      if (state === 'ball:approach' && i.ballPolar) {
        const m = Math.max(0, Math.round(i.ballPolar.distance))
        speak(`balón a ${m} metros, hora ${angleToClockHour(i.ballPolar.angle)}`, 'low')
      } else if (state === 'goal:approach' && i.goalPolar) {
        const m = Math.max(0, Math.round(i.goalPolar.distance))
        speak(`portería a ${m} metros, hora ${angleToClockHour(i.goalPolar.angle)}`, 'low')
      }
    }

    const startId = setTimeout(() => {
      narrate()
      intervalId = setInterval(narrate, 3500)
    }, 1200)

    return () => {
      clearTimeout(startId)
      if (intervalId !== null) clearInterval(intervalId)
    }
  }, [state])

  return state
}

function runEnterEffects(state: GameState) {
  switch (state) {
    case 'ball:search':
      speak('busca el balón', 'high')
      break
    case 'ball:approach':
      speak('balón detectado', 'high')
      break
    case 'ball:kick-ready':
      vibrate([200, 60, 200, 60, 200])
      speak('patea ahora', 'high')
      break
    case 'ball:kicked':
      vibrate(400)
      playKick()
      speak('buen tiro', 'high')
      break
    case 'goal:search':
      speak('busca la portería', 'high')
      break
    case 'goal:approach':
      speak('portería detectada', 'high')
      break
    case 'goal:reached':
      vibrate([100, 60, 100, 60, 100, 60, 600])
      playGoal()
      speak('¡gol, gol, gol!', 'high')
      break
    case 'idle':
      break
  }
}
