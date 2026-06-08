import { cookies } from "next/headers";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import SidebarNav from "@/components/SidebarNav";
import CharacterOverviewCard from "@/components/CharacterOverviewCard";
import NetWorthCard from "@/components/NetWorthCard";
import PrioritiesCard from "@/components/PrioritiesCard";
import CooldownsCard from "@/components/CooldownsCard";
import CaptureSnapshotButton from "@/components/CaptureSnapshotButton";
import { getTornUserData, mapAdminSummary, mapCooldownOverview } from "@/lib/torn";
import { buildRecommendations } from "@/lib/advisor";
import { getRecentSnapshots, estimateConsumableUsage } from "@/lib/snapshot";
import { prisma } from "@/lib/db";
import { DEFAULT_OWNER_KEY } from "@/lib/owner";
import type { WatchedItem, WatchedItemCategory } from "@/lib/torn-types";

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

  const data = await getTornUserData().catch(() => null);
  if (!data) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-10">
        <div className="mx-auto rounded-[2rem] border border-white/10 bg-zinc-950/80 p-10 text-center shadow-xl shadow-black/30">
          <h1 className="text-3xl font-semibold">Unable to load your Torn data</h1>
          <p className="mt-4 text-slate-400">Verify your Torn API key and retry. The dashboard needs a working server-side Torn API connection.</p>
        </div>
      </main>
    );
  }

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

  const recommendations = buildRecommendations({
    character: summary.character,
    cooldowns: summary.cooldowns,
    cooldownOverview: cooldowns,
    inventory: data.inventory,
    watchlist,
    usageEstimates,
    gear: summary.gear,
    garage: summary.garage,
    snapshots: recentSnapshots,
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

        {/* Priorities Today */}
        <div className="mb-8">
          <PrioritiesCard
            recommendations={recommendations}
            characterName={displayName}
            maxItems={5}
          />
        </div>

        {/* Cooldowns & Travel */}
        <div className="mb-8">
          <CooldownsCard cooldowns={cooldowns} />
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
