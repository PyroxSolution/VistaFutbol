import { useEffect } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useDetector } from '../hooks/useDetector'
import { DetectionOverlay } from './DetectionOverlay'
import { angleToClockHour, bboxToPolar } from '../lib/geometry'

interface Props {
  onExit: () => void
}

export function CameraView({ onExit }: Props) {
  const { videoRef, ready, error, start } = useCamera({ facingMode: 'environment' })
  const { detection, modelReady, modelError, fps, usingFallback } = useDetector(videoRef, ready)

  useEffect(() => {
    void start()
  }, [start])

  const video = videoRef.current
  const polar =
    detection && video && video.videoWidth
      ? bboxToPolar(detection.bbox, video.videoWidth, video.videoHeight)
      : null

  const statusText = error
    ? 'error'
    : !ready
      ? 'cámara…'
      : !modelReady
        ? 'cargando ia…'
        : detection
          ? usingFallback
            ? 'detectado · color'
            : 'detectado'
          : 'buscando'

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {ready && <DetectionOverlay detection={detection} videoRef={videoRef} />}

      {ready && <div className="absolute inset-x-0 top-0 h-[2px] bg-cancha-500" />}

      <div className="absolute inset-x-12 top-28 bottom-36 pointer-events-none">
        <Bracket pos="tl" />
        <Bracket pos="tr" />
        <Bracket pos="bl" />
        <Bracket pos="br" />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-5">
        <div className="space-y-2.5">
          <Datum label="estado" value={statusText} accent={!!detection} />
          <Datum label="señal" value={detection ? `${Math.round(detection.score * 100)}%` : '—'} />
          <Datum label="distancia" value={polar ? `${polar.distance.toFixed(1)} m` : '—'} />
          <Datum label="dirección" value={polar ? `h${angleToClockHour(polar.angle)}` : '—'} />
          <Datum label="fps" value={fps ? String(fps) : '—'} />
        </div>
        <button
          onClick={onExit}
          className="-mr-2 -mt-1 px-3 py-2 text-xs font-medium uppercase tracking-widest text-white/80 active:text-white"
        >
          salir
        </button>
      </div>

      {(error || modelError) && (
        <div className="absolute inset-x-5 bottom-32 rounded-lg border border-red-800/60 bg-red-950/95 p-5 backdrop-blur">
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
          {detection ? 'siguiente · m4 audio espacial' : 'm2 · detección en vivo'}
        </p>
        <p className="text-base font-medium text-white/90">
          {!ready
            ? 'esperando cámara…'
            : !modelReady
              ? 'cargando modelo de visión…'
              : detection
                ? 'balón en mira'
                : 'apunta al balón'}
        </p>
      </div>
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
