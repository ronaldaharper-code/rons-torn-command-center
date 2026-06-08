import { cookies } from "next/headers";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import SidebarNav from "@/components/SidebarNav";
import CharacterOverviewCard from "@/components/CharacterOverviewCard";
import NetWorthCard from "@/components/NetWorthCard";
import PrioritiesCard from "@/components/PrioritiesCard";
import CooldownsCard from "@/components/CooldownsCard";
import ConsumablesStatusCard from "@/components/ConsumablesStatusCard";
import CaptureSnapshotButton from "@/components/CaptureSnapshotButton";
import ApiAccessNotice from "@/components/ApiAccessNotice";
import WarReadinessCard from "@/components/WarReadinessCard";
import GearAdvisorSummaryCard from "@/components/GearAdvisorSummaryCard";
import { getTornUserData, mapAdminSummary, mapCooldownOverview, getFactionWarStatus, getEquipmentDetails } from "@/lib/torn";
import { buildRecommendations } from "@/lib/advisor";
import { getRecentSnapshots, estimateConsumableUsage } from "@/lib/snapshot";
import { getWarReadinessSettings } from "@/lib/settings";
import { buildWarReadinessPlan } from "@/lib/warReadiness";
import type { WarTimeSource } from "@/lib/warReadiness";
import { buildGearAdvisorPlan } from "@/lib/gearAdvisor";
import { prisma } from "@/lib/db";
import { DEFAULT_OWNER_KEY } from "@/lib/owner";
import type { EquipmentDetails, FactionWarStatus, WatchedItem, WatchedItemCategory } from "@/lib/torn-types";

const VALID_CATEGORIES: WatchedItemCategory[] = ["consumable", "energy", "happy", "medical", "other"];

async function isAuthenticated() {
  return (await cookies()).get("ron_dashboard_auth")?.value === "1";
}

export default async function DashboardPage() {
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
      <main className="min-h-screen bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-10">
        <div className="mx-auto rounded-[2rem] border border-white/10 bg-zinc-950/80 p-10 text-center shadow-xl shadow-black/30">
          <h1 className="text-3xl font-semibold">Unable to load your Torn data</h1>
          <p className="mt-4 text-slate-400">Verify your Torn API key and retry. The dashboard needs a working server-side Torn API connection.</p>
        </div>
      </main>
    );
  }

  const { data, access } = result;
  const summary = mapAdminSummary(data);
  const cooldowns = mapCooldownOverview(data);

  const storedWatchlist = await prisma.itemWatch.findMany({
    where: { ownerKey: DEFAULT_OWNER_KEY },
    orderBy: { itemName: "asc" },
  });
  const watchlist: WatchedItem[] = storedWatchlist.map((row) => ({
    id: row.id,
    itemName: row.itemName,
    category: VALID_CATEGORIES.includes(row.category as WatchedItemCategory)
      ? (row.category as WatchedItemCategory)
      : "other",
    minTarget: row.minTarget,
    alertEnabled: row.alertEnabled,
  }));

  const recentSnapshots = await getRecentSnapshots(60);
  const usageEstimates = estimateConsumableUsage(watchlist, recentSnapshots);

  const [warReadinessSettings, factionWarStatus, equipmentDetails] = await Promise.all([
    getWarReadinessSettings(),
    getFactionWarStatus().catch((): FactionWarStatus => ({})),
    getEquipmentDetails().catch((): EquipmentDetails => ({})),
  ]);

  const gearAdvisorPlan = buildGearAdvisorPlan({
    equipment: summary.equipment,
    equipmentDetails: equipmentDetails.items,
    battlestats: summary.battlestats,
  });

  let rankedWarStartMs: number | undefined;
  let rankedWarSource: WarTimeSource = "none";
  if (factionWarStatus.rankedWar) {
    rankedWarStartMs = factionWarStatus.rankedWar.startMs;
    rankedWarSource = "api";
  } else if (warReadinessSettings.manualRankedWarStart) {
    const parsed = new Date(warReadinessSettings.manualRankedWarStart);
    if (!Number.isNaN(parsed.getTime())) {
      rankedWarStartMs = parsed.getTime();
      rankedWarSource = "manual";
    }
  }

  const missingCoreSlotLabels = gearAdvisorPlan.missingSlots
    .filter((slot) => slot.key === "primary" || slot.key === "secondary" || slot.key === "melee" || slot.key === "armor")
    .map((slot) => slot.label);
  const gearSummaryForReadiness = {
    hasWeapon: Boolean(gearAdvisorPlan.loadout.primary || gearAdvisorPlan.loadout.secondary || gearAdvisorPlan.loadout.melee),
    hasArmor: gearAdvisorPlan.loadout.armor.length > 0,
    missingCoreSlotLabels,
  };

  const warReadinessPlan = buildWarReadinessPlan({
    character: summary.character,
    cooldowns: summary.cooldowns,
    cooldownOverview: cooldowns,
    inventory: data.inventory,
    rankedWarStartMs,
    rankedWarSource,
    preferredTimeZone: warReadinessSettings.preferredTimeZone,
    vicodinCooldownAssumptionMinutes: warReadinessSettings.vicodinCooldownAssumptionMinutes,
    gearSummary: gearAdvisorPlan.equipmentDataAvailable ? gearSummaryForReadiness : undefined,
  });

  const recommendations = buildRecommendations({
    character: summary.character,
    battleStats: data.battlestats,
    cooldowns: summary.cooldowns,
    cooldownOverview: cooldowns,
    inventory: data.inventory,
    watchlist,
    usageEstimates,
    equipment: summary.equipment,
    enlistedcars: summary.enlistedcars,
    snapshots: recentSnapshots,
    warReadiness: warReadinessPlan,
    gearAdvisor: gearAdvisorPlan,
  });

  const displayName = summary.character.name !== "Unknown" ? summary.character.name : undefined;

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
              <span className="text-amber-400">👑</span>{" "}
              {displayName ? `${displayName}'s Dashboard` : "Your Dashboard"}
            </h1>
            <p className="text-slate-400 mt-1">
              Last synced: {summary.lastSynced}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-slate-400">Readiness</p>
              <p className="text-2xl font-bold text-green-400">✓ Ready</p>
            </div>
            <CaptureSnapshotButton />
          </div>
        </div>

        <div className="mb-8">
          <ApiAccessNotice access={access} />
        </div>

        {/* Priorities Today */}
        <div className="mb-8">
          <PrioritiesCard
            recommendations={recommendations}
            characterName={displayName}
            maxItems={5}
          />
        </div>

        {/* War Readiness Countdown */}
        <div className="mb-8">
          <WarReadinessCard plan={warReadinessPlan} />
        </div>

        {/* Gear Advisor summary */}
        <div className="mb-8">
          <GearAdvisorSummaryCard plan={gearAdvisorPlan} />
        </div>

        {/* Cooldowns & Travel */}
        <div className="mb-8">
          <CooldownsCard cooldowns={cooldowns} />
        </div>

        {/* Consumables */}
        <div className="mb-8">
          <ConsumablesStatusCard watchlist={watchlist} inventory={data.inventory} />
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
      </main>
    </div>
  );
}
