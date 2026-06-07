"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { icon: "📊", label: "Dashboard", href: "/admin" },
  { icon: "📈", label: "Jump Planner", href: "/admin/jump-planner" },
  { icon: "🏦", label: "Bank & Stocks", href: "/admin/bank-stocks" },
  { icon: "⚙️", label: "Gear Tracker", href: "/admin/gear" },
  { icon: "🏎️", label: "Race Garage", href: "/admin/garage" },
  { icon: "⚡", label: "Crimes & Cooldowns", href: "/admin/crimes" },
  { icon: "⚠️", label: "Alerts", href: "/admin/alerts" },
  { icon: "📝", label: "Activity Log", href: "/admin/activity" },
  { icon: "📊", label: "Stat History", href: "/admin/stats" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-48 bg-slate-900/95 border-r border-white/10 p-4 overflow-y-auto">
      {/* Header */}
      <div className="mb-8 pb-4 border-b border-white/10">
        <h1 className="text-lg font-bold text-white">
          <span className="text-amber-400">👑</span> RON'S TORN
        </h1>
        <p className="text-xs text-slate-400 mt-1">Command Center</p>
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isActive
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* API Status */}
      <div className="mt-8 pt-4 border-t border-white/10">
        <div className="bg-slate-800/50 rounded-lg p-3 text-xs">
          <p className="text-slate-400">API STATUS</p>
          <p className="text-green-400 font-semibold mt-1">🟢 Connected</p>
          <p className="text-slate-500 text-[0.65rem] mt-1">Last sync: 2m ago</p>
        </div>
      </div>
    </aside>
  );
}
