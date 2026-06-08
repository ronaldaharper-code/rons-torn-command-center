import { cookies } from "next/headers";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import SidebarNav from "@/components/SidebarNav";
import GearAdvisorCard from "@/components/GearAdvisorCard";
import { getTornUserData, mapAdminSummary, getEquipmentDetails } from "@/lib/torn";
import { buildGearAdvisorPlan } from "@/lib/gearAdvisor";
import type { EquipmentDetails } from "@/lib/torn-types";

async function isAuthenticated() {
  return (await cookies()).get("ron_dashboard_auth")?.value === "1";
}

export default async function GearAdvisorPage() {
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
            <h1 className="text-3xl font-semibold">Unable to load your Torn data</h1>
            <p className="mt-4 text-slate-400">Verify your Torn API key and retry. The Gear Advisor needs a working server-side Torn API connection.</p>
          </div>
        </main>
      </div>
    );
  }

  const { data } = result;
  const summary = mapAdminSummary(data);
  const equipmentDetails = await getEquipmentDetails().catch((): EquipmentDetails => ({}));

  const plan = buildGearAdvisorPlan({
    equipment: summary.equipment,
    equipmentDetails: equipmentDetails.items,
    battlestats: summary.battlestats,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SidebarNav />
      <main className="ml-48 p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">
            <span className="text-amber-400">🛡️</span> Gear Advisor
          </h1>
          <p className="mt-1 text-slate-400">
            Is Shenzy equipped properly for training, defending, and ranked war? Live loadout, bonuses, and gaps — not just a gear list.
          </p>
        </div>

        <GearAdvisorCard plan={plan} />
      </main>
    </div>
  );
}
