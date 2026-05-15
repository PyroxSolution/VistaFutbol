function App() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🦯⚽</div>
        <h1 className="text-5xl font-black text-cancha-500 mb-2 tracking-tight">
          VistaFútbol
        </h1>
        <p className="text-lg text-zinc-300 mb-8">
          Fútbol sin barreras. La IA es tus ojos.
        </p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-2">
          <p className="text-zinc-400 text-xs uppercase tracking-widest">Estado actual</p>
          <p className="text-2xl font-bold text-cancha-400">M0 · Setup listo</p>
          <p className="text-zinc-500 text-sm">Siguiente: M1 cámara + M2 detección</p>
        </div>
        <p className="text-zinc-600 text-xs mt-8">
          Hackatón Innovación Inclusiva · 16 mayo 2026
        </p>
      </div>
    </div>
  )
}

export default App
