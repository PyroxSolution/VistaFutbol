import { useEffect } from 'react'
import { useCamera } from '../hooks/useCamera'

interface Props {
  onExit: () => void
}

export function CameraView({ onExit }: Props) {
  const { videoRef, ready, error, start } = useCamera({ facingMode: 'environment' })

  useEffect(() => {
    void start()
  }, [start])

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink text-white">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover opacity-95"
        playsInline
        muted
        autoPlay
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink via-ink/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-ink via-ink/70 to-transparent" />

      {ready && !error && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Sonar />
        </div>
      )}

      <div className="absolute left-5 right-5 top-5 flex items-start justify-between">
        <div className="space-y-1.5">
          <DataRow label="estado" value={error ? 'error' : ready ? 'escuchando' : 'iniciando'} accent={ready && !error} />
          <DataRow label="señal" value="—" />
          <DataRow label="distancia" value="—" />
        </div>
        <button
          onClick={onExit}
          className="-mr-2 -mt-1 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/70 active:text-white"
        >
          salir ✕
        </button>
      </div>

      {error && (
        <div className="absolute inset-x-5 bottom-36 border border-red-700/40 bg-red-950/95 p-5 backdrop-blur">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-red-400">
            permiso requerido
          </p>
          <p className="text-[15px] leading-snug">{error}</p>
          <button
            onClick={() => start()}
            className="mt-4 font-mono text-[11px] uppercase tracking-[0.25em] text-cancha-500 active:text-cancha-400"
          >
            reintentar →
          </button>
        </div>
      )}

      <div className="absolute inset-x-5 bottom-8 text-center">
        <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.4em] text-white/40">
          m1 · cámara
        </p>
        <p className="font-serif italic text-[24px] leading-none">
          {ready ? 'apunta al balón' : 'esperando…'}
        </p>
      </div>
    </div>
  )
}

function Sonar() {
  return (
    <svg width="240" height="240" viewBox="0 0 240 240" fill="none">
      {[0, 0.8, 1.6].map((delay) => (
        <circle
          key={delay}
          cx="120"
          cy="120"
          r="24"
          stroke="#dd4f1a"
          strokeWidth="1.5"
          opacity="0.75"
        >
          <animate
            attributeName="r"
            from="24"
            to="110"
            dur="2.4s"
            begin={`${delay}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0.75"
            to="0"
            dur="2.4s"
            begin={`${delay}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
      <circle cx="120" cy="120" r="3.5" fill="#dd4f1a" />
    </svg>
  )
}

function DataRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.25em]">
      <span className="text-white/40">{label}</span>
      <span className={accent ? 'text-cancha-500' : 'text-white'}>{value}</span>
    </div>
  )
}
