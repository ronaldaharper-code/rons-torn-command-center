import { cookies } from "next/headers";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import SidebarNav from "@/components/SidebarNav";

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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SidebarNav />
      <main className="ml-48 p-6">
        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-10 text-center shadow-xl shadow-black/30">
          <h1 className="text-3xl font-bold text-white">Service Admin</h1>
          <p className="mt-4 text-slate-400">
            Reserved for future service-owner tools — managing players, support, subscriptions, abuse handling, and
            operational issues. Not part of the player experience.
          </p>
          <span className="mt-6 inline-block rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300">
            Coming later
          </span>
        </div>
      </main>
    </div>
  );
}
