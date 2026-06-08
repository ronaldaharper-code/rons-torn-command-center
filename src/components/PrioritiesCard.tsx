import type { Recommendation, RecommendationPriority } from "@/lib/advisor";

interface PrioritiesCardProps {
  recommendations: Recommendation[];
  characterName?: string;
  maxItems?: number;
}

const PRIORITY_STYLES: Record<RecommendationPriority, { label: string; badge: string; border: string }> = {
  critical: { label: "Critical", badge: "bg-rose-500/20 text-rose-300 border-rose-500/30", border: "border-rose-500/20" },
  high: { label: "High", badge: "bg-amber-500/20 text-amber-300 border-amber-500/30", border: "border-amber-500/20" },
  medium: { label: "Medium", badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", border: "border-cyan-500/20" },
  low: { label: "Low", badge: "bg-slate-500/20 text-slate-300 border-slate-500/30", border: "border-slate-500/20" },
};

export default function PrioritiesCard({ recommendations, characterName, maxItems = 5 }: PrioritiesCardProps) {
  const visible = recommendations.slice(0, maxItems);
  const heroTitle = characterName ? `${characterName}’s Priorities Today` : "Your Priorities Today";

  return (
    <section className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-zinc-950/90 to-slate-950/90 p-6 shadow-2xl shadow-black/40">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{heroTitle}</h2>
          <p className="mt-1 text-sm text-slate-400">What to do next, based on your live status, cooldowns, and watchlist.</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
          {recommendations.length} signal{recommendations.length === 1 ? "" : "s"} found
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
          Nothing urgent right now — your status, cooldowns, and watchlist all look on track.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((recommendation, index) => {
            const style = PRIORITY_STYLES[recommendation.priority];
            return (
              <div key={`${recommendation.relatedModule}-${index}`} className={`rounded-2xl border ${style.border} bg-slate-950/60 p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${style.badge}`}>
                      {style.label}
                    </span>
                    <h3 className="text-base font-semibold text-white">{recommendation.title}</h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    {Math.round(recommendation.confidenceScore * 100)}% confidence · {recommendation.relatedModule}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{recommendation.explanation}</p>
                <p className="mt-2 text-sm font-medium text-cyan-300">→ {recommendation.recommendedAction}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
