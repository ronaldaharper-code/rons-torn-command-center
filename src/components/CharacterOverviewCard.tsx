"use client";

import type { CharacterOverview } from "@/lib/torn-types";

interface Props {
  data: CharacterOverview;
  profileImage?: string;
}

export default function CharacterOverviewCard({ data, profileImage }: Props) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl">
      <div className="flex gap-6">
        {/* Profile Image */}
        {profileImage && (
          <div className="flex-shrink-0">
            <img
              src={profileImage}
              alt={data.name}
              className="w-24 h-24 rounded-2xl border border-cyan-500/30 object-cover"
            />
          </div>
        )}

        {/* Character Info */}
        <div className="flex-grow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{data.name}</h2>
              <p className="text-sm text-cyan-300">Level {data.level} • {data.rank}</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
                <span className="text-xs font-semibold text-blue-300">
                  {data.status === "okay" && "✓ Safe"}
                  {data.status === "hospital" && "🏥 Hospital"}
                  {data.status === "jail" && "🔒 Jail"}
                  {data.status === "traveling" && "✈️ Traveling"}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Life" current={data.life.current} max={data.life.maximum} color="red" />
            <StatBox label="Energy" current={data.energy.current} max={data.energy.maximum} color="yellow" />
            <StatBox label="Nerve" current={data.nerve.current} max={data.nerve.maximum} color="orange" />
            <StatBox label="Happy" current={data.happy.current} max={data.happy.maximum} color="green" />
          </div>

          {/* Additional Info */}
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-900/50 rounded p-2">
              <p className="text-slate-400">Points</p>
              <p className="text-white font-semibold">{data.points.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900/50 rounded p-2">
              <p className="text-slate-400">Merits</p>
              <p className="text-white font-semibold">{data.merits}</p>
            </div>
            <div className="bg-slate-900/50 rounded p-2">
              <p className="text-slate-400">Battle Stats</p>
              <p className="text-white font-semibold">
                {data.battleStatsTotal != null ? data.battleStatsTotal.toLocaleString() : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  current: number;
  max: number;
  color: "red" | "yellow" | "orange" | "green";
}

function StatBox({ label, current, max, color }: StatBoxProps) {
  const percentage = (current / max) * 100;
  const colorClasses = {
    red: "bg-red-500/20 border-red-500/30 text-red-300",
    yellow: "bg-yellow-500/20 border-yellow-500/30 text-yellow-300",
    orange: "bg-orange-500/20 border-orange-500/30 text-orange-300",
    green: "bg-green-500/20 border-green-500/30 text-green-300",
  };

  return (
    <div className={`rounded-lg border p-3 ${colorClasses[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <div className="mt-1 flex items-end gap-2">
        <p className="text-lg font-bold">{current}</p>
        <p className="text-xs opacity-60">/ {max}</p>
      </div>
      <div className="mt-2 h-1.5 bg-black/30 rounded-full overflow-hidden">
        <div
          className={`h-full ${
            color === "red" ? "bg-red-500" : color === "yellow" ? "bg-yellow-500" : color === "orange" ? "bg-orange-500" : "bg-green-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
