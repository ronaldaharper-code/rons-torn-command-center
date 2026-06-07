import { cookies } from "next/headers";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import SidebarNav from "@/components/SidebarNav";
import CharacterOverviewCard from "@/components/CharacterOverviewCard";
import NetWorthCard from "@/components/NetWorthCard";
import { getTornUserData, mapAdminSummary } from "@/lib/torn";

async function isAuthenticated() {
  return (await cookies()).get("ron_dashboard_auth")?.value === "1";
}

export default async function AdminPage() {
  if (!(await isAuthenticated())) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.1),_transparent_35%),#05070d] px-4 py-12 text-white sm:px-6 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <AdminLoginForm />
        </div>
      </main>
    );
  }

  const data = await getTornUserData().catch(() => null);
  if (!data) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-10">
        <div className="mx-auto rounded-[2rem] border border-white/10 bg-zinc-950/80 p-10 text-center shadow-xl shadow-black/30">
          <h1 className="text-3xl font-semibold">Unable to load Torn admin data</h1>
          <p className="mt-4 text-slate-400">Verify your Torn API key and retry. The admin dashboard needs a working server-side Torn API connection.</p>
        </div>
      </main>
    );
  }

  const summary = mapAdminSummary(data);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Sidebar */}
      <SidebarNav />

      {/* Main Content */}
      <main className="ml-48 p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">
              <span className="text-amber-400">👑</span> Private Command Center
            </h1>
            <p className="text-slate-400 mt-1">
              Last synced: {summary.lastSynced}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Readiness</p>
            <p className="text-2xl font-bold text-green-400">✓ Ready</p>
          </div>
        </div>

        {/* Character Overview */}
        <div className="mb-8">
          <CharacterOverviewCard
            data={summary.character}
            profileImage={data.basic?.image}
          />
        </div>

        {/* Net Worth */}
        <div className="mb-8">
          <NetWorthCard data={summary.financial} />
        </div>

        {/* Coming Soon Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4">Jump Planner</h3>
            <p className="text-slate-400 text-sm">Coming soon...</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4">Crimes & Cooldowns</h3>
            <p className="text-slate-400 text-sm">Coming soon...</p>
          </div>
        </div>
      </main>
    </div>
  );
}
