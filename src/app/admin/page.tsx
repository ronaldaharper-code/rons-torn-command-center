import { cookies } from "next/headers";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminLoginForm } from "@/components/AdminLoginForm";
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.08),_transparent_28%),#03050c] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <AdminDashboard summary={summary} />
      </div>
    </main>
  );
}
