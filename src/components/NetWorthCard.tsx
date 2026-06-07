"use client";

import type { FinancialSnapshot } from "@/lib/torn-types";

interface Props {
  data: FinancialSnapshot;
}

export default function NetWorthCard({ data }: Props) {
  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(2)}B`;
    } else if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(2)}K`;
    }
    return `$${value}`;
  };

  const breakdown = [
    { label: "Cash", value: data.cash, color: "green" },
    { label: "Bank", value: data.bank, color: "blue" },
    { label: "Stocks", value: data.stock, color: "purple" },
    { label: "Property", value: data.properties, color: "amber" },
    { label: "Items", value: data.items, color: "cyan" },
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Net Worth Overview</h2>
        <p className="text-sm text-slate-400 mt-1">30 day change: +$142,385,012</p>
      </div>

      {/* Total */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
        <p className="text-sm text-slate-400">Total Net Worth</p>
        <p className="text-3xl font-bold text-white mt-1">{formatCurrency(data.total)}</p>
        <p className="text-xs text-green-400 mt-2">📈 +2.62% increase</p>
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        {breakdown.map((item) => {
          const percentage = (item.value / data.total) * 100;
          const colorClasses = {
            green: "bg-green-500",
            blue: "bg-blue-500",
            purple: "bg-purple-500",
            amber: "bg-amber-500",
            cyan: "bg-cyan-500",
          };

          return (
            <div key={item.label}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-300">{item.label}</span>
                <span className="text-sm font-semibold text-white">{formatCurrency(item.value)}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colorClasses[item.color as keyof typeof colorClasses]}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{percentage.toFixed(1)}% of total</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
