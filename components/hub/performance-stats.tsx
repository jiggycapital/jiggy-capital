"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Target, Activity, Percent } from "lucide-react";
import { formatPercentage, parseNumeric } from "@/lib/utils";

interface PerformanceStatsProps {
  ytdPerformance: string | null;
  lifetimeCagr: string | null;
  dailyMove: number;
}

export function PerformanceStats({ ytdPerformance, lifetimeCagr, dailyMove }: PerformanceStatsProps) {
  const stats = [
    {
      label: "Daily Performance",
      value: dailyMove,
      isPercentage: true,
      icon: <Activity className="w-4 h-4 text-emerald-400" />,
      color: dailyMove >= 0 ? "text-emerald-400" : "text-rose-400"
    },
    {
      label: "YTD Performance",
      value: ytdPerformance,
      isPercentage: false, // Already formatted as string
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      color: "text-emerald-400"
    },
    {
      label: "Lifetime CAGR",
      value: lifetimeCagr,
      isPercentage: false, // Already formatted as string
      icon: <Target className="w-4 h-4 text-purple-400" />,
      color: "text-purple-400"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {stats.map((stat, i) => (
        <div key={i} className="bg-jiggy-surface-2 border border-jiggy-tan/50 rounded-2xl shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className={`text-2xl font-bold font-mono ${stat.color}`}>
              {stat.isPercentage ? formatPercentage(stat.value as number) : stat.value || "0.0%"}
            </h3>
          </div>
          <div className="bg-jiggy-surface border border-jiggy-tan/30 p-3 rounded-xl">
            {stat.icon}
          </div>
        </div>
      ))}
    </div>
  );
}
