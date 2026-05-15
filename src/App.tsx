import { useState } from 'react'
import { CameraView } from './components/CameraView'

export default function App() {
  const [started, setStarted] = useState(false)
  if (started) return <CameraView onExit={() => setStarted(false)} />
  return <Home onStart={() => setStarted(true)} />
}

function Home({ onStart }: { onStart: () => void }) {
  return (
    <main className="grain-overlay relative min-h-screen overflow-hidden bg-paper text-ink">
      <header className="relative z-10 flex items-start justify-between px-6 pt-6">
        <BrandMark />
        <div className="text-right leading-tight">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-dust">
            ed. 01
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-dust">
            mty · 16.05.26
          </p>
        </div>
      </header>

      <section className="relative z-10 px-6 pt-16">
        <h1 className="font-serif text-[clamp(4.5rem,21vw,11rem)] leading-[0.84] tracking-[-0.025em]">
          <span className="italic">Vista</span>
          <br />
          <span className="italic -ml-1 inline-block">Fútbol</span>
          <span className="text-cancha-500">.</span>
        </h1>

        <p className="mt-7 max-w-[19rem] text-[17px] leading-[1.4] text-ink/80">
          La cámara ve por ti.
          <br />
          Los audífonos te lo dicen.
          <br />
          <span className="font-serif italic text-[20px] text-ink">Tú juegas, de verdad.</span>
        </p>

        <blockquote className="mt-12 max-w-[20rem] border-l border-cancha-500 pl-5">
          <p className="font-serif italic text-[22px] leading-[1.2] text-ink/95">
            "Treinta años escuchándolo en la radio. Hoy lo voy a jugar."
          </p>
          <footer className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-dust">
            ── usuario piloto · hipótesis
          </footer>
        </blockquote>

        <div className="h-40" aria-hidden />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-paper/95 backdrop-blur-sm px-6 pt-4 pb-7">
        <button
          onClick={onStart}
          className="group flex w-full items-center justify-between border-t border-ink/20 pt-5 active:opacity-50"
        >
          <span className="font-serif italic text-[30px] leading-none">empezar</span>
          <span className="flex items-center gap-3">
            <span className="block h-px w-14 bg-ink transition-all group-active:w-8" />
            <span className="text-2xl leading-none">↗</span>
          </span>
        </button>
      </div>
    </main>
  )
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="9.25" stroke="#0a0a0a" strokeWidth="1.5" />
        <circle cx="14" cy="11" r="2.4" fill="#dd4f1a" />
      </svg>
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink">
        vf · 001
      </span>
    </div>
  )
}
