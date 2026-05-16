import { useEffect, useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useDetector } from '../hooks/useDetector'
import { useSpatialAudio } from '../hooks/useSpatialAudio'
import { useGameState } from '../hooks/useGameState'
import { DetectionOverlay } from './DetectionOverlay'
import { GoalCelebration } from './GoalCelebration'
import { angleToClockHour, bboxToPolar } from '../lib/geometry'
import { isBallPhase, isGoalPhase, stateLabel } from '../state/gameMachine'
import { subscribeToSpeech, getLastSpoken } from '../lib/tts-engine'

interface Props {
  onExit: () => void
  width?: number
  height?: number
}

export function CameraView({ onExit, width, height }: Props) {
  const { videoRef, ready, error, start } = useCamera({ facingMode: 'environment', width, height })
  const { ball, goal, modelReady, modelError, fps, usingFallback } = useDetector(videoRef, ready)
  const audio = useSpatialAudio()
  const [spoken, setSpoken] = useState(getLastSpoken())

  useEffect(() => {
    void start()
  }, [start])

  useEffect(() => {
    return subscribeToSpeech((t) => setSpoken(t))
  }, [])

  const video = videoRef.current
  const ballPolar =
    ball && video && video.videoWidth
      ? bboxToPolar(ball.bbox, video.videoWidth, video.videoHeight)
      : null
  const goalPolar =
    goal && video && video.videoWidth
      ? bboxToPolar(goal.bbox, video.videoWidth, video.videoHeight)
      : null

  const { state: gameState, reset } = useGameState({
    cameraReady: ready,
    modelReady,
    ballPolar,
    goalPolar,
  })

  const ballPhase = isBallPhase(gameState)
  const goalPhase = isGoalPhase(gameState)
  const activePolar = ballPhase ? ballPolar : goalPhase ? goalPolar : null
  const activeDetection = ballPhase ? ball : goalPhase ? goal : null

  useEffect(() => {
    audio.setTarget(activePolar)
  }, [activePolar?.angle, activePolar?.distance, audio])

  useEffect(() => {
    return () => audio.setTarget(null)
  }, [audio])

  const objective = ballPhase ? 'balón' : goalPhase ? 'portería' : '—'
  const isKickReady = gameState === 'ball:kick-ready'

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {ready && <DetectionOverlay ball={ball} goal={goal} videoRef={videoRef} />}

      {ready && (
        <div
          className={`absolute inset-x-0 top-0 h-[2px] bg-cancha-500 ${isKickReady ? 'animate-pulse-fast' : ''}`}
        />
      )}

      <div
        className={`absolute inset-x-12 top-28 bottom-52 pointer-events-none transition-opacity ${isKickReady ? 'opacity-100' : 'opacity-80'}`}
      >
        <Bracket pos="tl" />
        <Bracket pos="tr" />
        <Bracket pos="bl" />
        <Bracket pos="br" />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-5">
        <div className="space-y-2.5">
          <Datum label="objetivo" value={objective} accent={ballPhase || goalPhase} />
          <Datum
            label="señal"
            value={activeDetection ? `${Math.round(activeDetection.score * 100)}%` : '—'}
          />
          <Datum
            label="distancia"
            value={activePolar ? `${activePolar.distance.toFixed(1)} m` : '—'}
          />
          <Datum
            label="dirección"
            value={activePolar ? `h${angleToClockHour(activePolar.angle)}` : '—'}
          />
          <Datum
            label="audio"
            value={audio.ready ? (activePolar ? '3d activo' : '3d standby') : 'off'}
            accent={audio.ready && !!activePolar}
          />
          <Datum
            label="modo"
            value={usingFallback ? 'color' : modelReady ? 'ia' : 'cargando'}
          />
          <Datum label="fps" value={fps ? String(fps) : '—'} />
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={onExit}
            className="-mr-2 -mt-1 px-3 py-2 text-xs font-medium uppercase tracking-widest text-white/80 active:text-white"
          >
            salir
          </button>
          <button
            onClick={reset}
            className="rounded-full border border-white/25 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-white/85 active:bg-white/10"
          >
            reset
          </button>
        </div>
      </div>

      {(error || modelError) && (
        <div className="absolute inset-x-5 bottom-44 rounded-lg border border-red-800/60 bg-red-950/95 p-5 backdrop-blur">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-red-400">
            {error ? 'permiso requerido' : 'modelo no cargó'}
          </p>
          <p className="text-sm leading-snug text-white">{error ?? modelError}</p>
          {error && (
            <button
              onClick={() => start()}
              className="mt-4 text-sm font-semibold text-cancha-500 active:text-cancha-400"
            >
              reintentar →
            </button>
          )}
        </div>
      )}

      <div className="absolute inset-x-5 bottom-8">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
          fase · {gameState}
        </p>
        <p
          className={`text-xl font-bold leading-tight ${isKickReady ? 'text-cancha-500' : 'text-white'}`}
        >
          {stateLabel(gameState)}
        </p>
        {spoken && (
          <p
            key={spoken}
            className="mt-3 max-w-[85%] text-2xl font-black leading-[1.05] tracking-tight text-white/95 animate-fade-up"
          >
            “{spoken}”
          </p>
        )}
      </div>

      {gameState === 'goal:reached' && <GoalCelebration />}
    </div>
  )
}

function Datum({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold ${accent ? 'text-cancha-500' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

function Bracket({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const map = {
    tl: 'top-0 left-0 border-t-2 border-l-2',
    tr: 'top-0 right-0 border-t-2 border-r-2',
    bl: 'bottom-0 left-0 border-b-2 border-l-2',
    br: 'bottom-0 right-0 border-b-2 border-r-2',
  } as const
  return <div className={`absolute h-7 w-7 border-cancha-500/70 ${map[pos]}`} />
}
