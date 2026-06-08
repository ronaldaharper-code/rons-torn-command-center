import { PublicDashboard } from "@/components/PublicDashboard";
import ApiAccessNotice from "@/components/ApiAccessNotice";
import { getTornPublicData, mapPublicSummary } from "@/lib/torn";

export default async function Home() {
  const result = await getTornPublicData().catch(() => null);
  const summary = result ? mapPublicSummary(result.data) : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.1),_transparent_35%),#05070d] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {summary ? (
          <>
            <PublicDashboard summary={summary} />
            {result ? <ApiAccessNotice access={result.access} /> : null}
          </>
        ) : (
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-10 text-center text-slate-300 shadow-xl shadow-black/30">
            <h1 className="text-3xl font-semibold text-white">Unable to load Torn data</h1>
            <p className="mt-4 max-w-2xl mx-auto text-sm leading-7">Check your Torn API key in .env.local and restart the app. The public share page requires a valid Torn API connection.</p>
            {result ? <ApiAccessNotice access={result.access} /> : null}
          </div>
        )}
      </div>
    </main>
  );
}
