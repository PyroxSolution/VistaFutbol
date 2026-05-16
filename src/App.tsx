import { useState } from 'react'
import { CameraView } from './components/CameraView'
import { initAudio } from './lib/audio-engine'

export default function App() {
  const [started, setStarted] = useState(false)

  if (started) return <CameraView onExit={() => setStarted(false)} />

  const handleStart = () => {
    void initAudio().catch(() => {})
    setStarted(true)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute left-6 top-6 flex items-center gap-3">
        <div className="h-4 w-4 rounded-full border-2 border-cancha-500" />
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-500">
          vistafutbol
        </p>
      </div>

      <div className="absolute right-6 top-6 text-right">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600">
          mty · 16 may
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

        <div className="mt-10 flex items-center gap-5">
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

      <div className="absolute inset-x-6 bottom-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-700">
        <span>m0 · setup</span>
        <span>v0.1</span>
      </div>
    </main>
  )
}
