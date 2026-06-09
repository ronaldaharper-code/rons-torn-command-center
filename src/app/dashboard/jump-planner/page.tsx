import { cookies } from "next/headers";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import SidebarNav from "@/components/SidebarNav";
import JumpPlannerCard from "@/components/JumpPlannerCard";
import { getTornUserData, mapAdminSummary, mapCooldownOverview } from "@/lib/torn";
import { buildJumpPlan } from "@/lib/jumpPlanner";
import { getJumpPlannerSettings, getWarReadinessSettings } from "@/lib/settings";

async function isAuthenticated() {
  return (await cookies()).get("ron_dashboard_auth")?.value === "1";
}

export default async function JumpPlannerPage() {
  if (!(await isAuthenticated())) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.1),_transparent_35%),#05070d] px-4 py-12 text-white sm:px-6 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <AdminLoginForm />
        </div>
      </main>
    );
  }

  const result = await getTornUserData().catch(() => null);
  if (!result) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <SidebarNav />
        <main className="ml-48 p-6">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-10 text-center shadow-xl shadow-black/30">
            <h1 className="text-3xl font-semibold">Unable to load Torn data</h1>
            <p className="mt-4 text-slate-400">
              Verify your Torn API key and retry. The Jump Planner needs a working server-side Torn API connection.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const { data } = result;
  const summary = mapAdminSummary(data);
  const cooldownOverview = mapCooldownOverview(data);

  const [jumpSettings, warSettings] = await Promise.all([
    getJumpPlannerSettings(),
    getWarReadinessSettings(),
  ]);

  const plan = buildJumpPlan({
    character: summary.character,
    cooldownOverview,
    inventory: data.inventory,
    trainingFocusStats: jumpSettings.trainingFocusStats,
    edcBenefitAvailable: jumpSettings.edcBenefitAvailable,
    localTimeZone: warSettings.preferredTimeZone,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SidebarNav />
      <main className="ml-48 p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">
            <span className="text-amber-400">📈</span> Happy Jump Planner
          </h1>
          <p className="mt-1 text-slate-400">
            7-step readiness tracker — energy, happy, cooldowns, consumables, and point refill, from live Torn data.
          </p>
        </div>

        <JumpPlannerCard plan={plan} />
      </main>
    </div>
  );
}
