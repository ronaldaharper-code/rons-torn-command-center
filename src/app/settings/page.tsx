import { cookies } from "next/headers";
import { SettingsForm } from "@/components/SettingsForm";
import { prisma } from "@/lib/db";
import { DEFAULT_OWNER_KEY } from "@/lib/owner";
import type { WatchedItem, WatchedItemCategory } from "@/lib/torn-types";

const VALID_CATEGORIES: WatchedItemCategory[] = ["consumable", "energy", "happy", "medical", "other"];

async function isAuthenticated() {
  return (await cookies()).get("ron_dashboard_auth")?.value === "1";
}

export default async function SettingsPage() {
  if (!(await isAuthenticated())) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.1),_transparent_35%),#05070d] px-4 py-12 text-white sm:px-6 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-10 text-center shadow-xl shadow-black/30">
            <h1 className="text-3xl font-semibold">Access required</h1>
            <p className="mt-4 text-slate-400">You must log in to manage dashboard settings.</p>
          </div>
        </div>
      </main>
    );
  }

  const storedItems = await prisma.itemWatch.findMany({
    where: { ownerKey: DEFAULT_OWNER_KEY },
    orderBy: { itemName: "asc" },
  });
  const items: WatchedItem[] = storedItems.map((row) => ({
    id: row.id,
    itemName: row.itemName,
    category: VALID_CATEGORIES.includes(row.category as WatchedItemCategory)
      ? (row.category as WatchedItemCategory)
      : "other",
    minTarget: row.minTarget,
    alertEnabled: row.alertEnabled,
  }));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.08),_transparent_28%),#03050c] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8 shadow-2xl shadow-black/30">
          <h1 className="text-3xl font-semibold text-white">Dashboard settings</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Manage your consumables watchlist: what to track, how low it can go before you get an alert, and whether alerts are active.</p>
        </div>
        <SettingsForm initialItems={items} />
      </div>
    </main>
  );
}
