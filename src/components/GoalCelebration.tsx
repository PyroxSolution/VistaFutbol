export function GoalCelebration() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-cancha-500/85 backdrop-blur-sm animate-in fade-in">
      <div className="text-center">
        <p className="font-mono text-[12px] uppercase tracking-[0.4em] text-black/70">
          jugada completada
        </p>
        <h2 className="mt-2 text-[clamp(6rem,28vw,16rem)] font-black leading-none tracking-[-0.06em] text-black">
          GOL
        </h2>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.4em] text-black/70">
          vistafutbol
        </p>
      </div>
    </div>
  )
}
