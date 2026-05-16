import { useEffect, useState } from 'react'
import { CameraView } from './components/CameraView'
import { initAudio } from './lib/audio-engine'
import { primeTTS } from './lib/tts-engine'

export type Quality = 'low' | 'balance' | 'high'

export interface QualityPreset {
  id: Quality
  label: string
  sub: string
  width: number
  height: number
}

export const QUALITIES: QualityPreset[] = [
  { id: 'low', label: 'Rendimiento', sub: '854 · más fps', width: 854, height: 480 },
  { id: 'balance', label: 'Balance', sub: '720p · recomendado', width: 1280, height: 720 },
  { id: 'high', label: 'Calidad', sub: '1080p · pro+', width: 1920, height: 1080 },
]

const STORAGE_KEY = 'vistafutbol.quality'

function readStored(): Quality {
  if (typeof window === 'undefined') return 'balance'
  const v = window.localStorage.getItem(STORAGE_KEY)
  return v === 'low' || v === 'balance' || v === 'high' ? v : 'balance'
}

function detectRecommended(): Quality {
  if (typeof navigator === 'undefined') return 'balance'
  const ua = navigator.userAgent
  if (/iPhone1[4-9]|iPhone2\d/.test(ua)) return 'high'
  if (/SM-S9\d\d|SM-S2\d|Pixel [89]/.test(ua)) return 'high'
  return 'balance'
}

export default function App() {
  const [started, setStarted] = useState(false)
  const [quality, setQuality] = useState<Quality>(readStored)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, quality)
    }
  }, [quality])

  if (started) {
    const preset = QUALITIES.find((q) => q.id === quality) ?? QUALITIES[1]
    return (
      <CameraView
        width={preset.width}
        height={preset.height}
        onExit={() => setStarted(false)}
      />
    )
  }

  const handleStart = () => {
    void initAudio().catch(() => {})
    primeTTS()
    setStarted(true)
  }

  const recommended = detectRecommended()

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute left-6 top-6 flex items-center gap-3">
        <div className="h-4 w-4 rounded-full border-2 border-cancha-500" />
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-500">
          vistafutbol
        </p>
      </div>

      <div className="flex min-h-screen flex-col justify-end px-6 pb-10">
        <h1 className="text-[clamp(3.5rem,18vw,9rem)] font-black leading-[0.82] tracking-[-0.045em]">
          Vista
          <br />
          Fútbol<span className="text-cancha-500">.</span>
        </h1>

        <p className="mt-5 max-w-xs text-base leading-snug text-zinc-400">
          Tu celular ve la cancha por ti. Conecta audio y juega.
        </p>
        <p className="mt-2 max-w-xs text-[11px] leading-snug text-zinc-600">
          Audífonos cableados &gt; bluetooth &gt; altavoz. Sin audífonos el efecto 3D se pierde, la voz sigue.
        </p>

        <div className="mt-7">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
            calidad de cámara
          </p>
          <div className="flex gap-2">
            {QUALITIES.map((q) => {
              const active = quality === q.id
              const isRecommended = q.id === recommended
              return (
                <button
                  key={q.id}
                  onClick={() => setQuality(q.id)}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-left transition ${
                    active
                      ? 'border-cancha-500 bg-cancha-500/10'
                      : 'border-zinc-800 active:bg-zinc-900'
                  }`}
                >
                  <p
                    className={`text-[11px] font-semibold ${active ? 'text-cancha-500' : 'text-white'}`}
                  >
                    {q.label}
                  </p>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wide text-zinc-500">
                    {q.sub}
                  </p>
                  {isRecommended && !active && (
                    <p className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-cancha-500/80">
                      sugerido
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-7 flex items-center gap-5">
          <button
            onClick={handleStart}
            aria-label="Empezar"
            className="group grid h-16 w-16 place-items-center rounded-full bg-cancha-500 transition-transform active:scale-90"
          >
            <span className="text-2xl font-black leading-none text-black">↗</span>
          </button>
          <div>
            <p className="text-base font-semibold text-white">Empezar</p>
            <p className="text-xs text-zinc-600">cámara + audio</p>
          </div>
        </div>
      </div>

    </main>
  )
}
