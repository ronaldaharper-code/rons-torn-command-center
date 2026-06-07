import type { AdminSummary } from "@/lib/torn-types";

interface AdminDashboardProps {
  summary: AdminSummary;
}

export function AdminDashboard({ summary }: AdminDashboardProps) {
  return <div className="p-6"><p className="text-slate-400">Legacy component</p></div>;
}
