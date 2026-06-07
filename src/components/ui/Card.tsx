export function Card({ title, children, accent, className }: { title: string; children: React.ReactNode; accent?: string; className?: string }) {
  return (
    <section className={`rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/20 ${className ?? ""}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
        {accent ? <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">{accent}</span> : null}
      </div>
      <div className="space-y-4 text-sm text-slate-200">{children}</div>
    </section>
  );
}
