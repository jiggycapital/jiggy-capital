"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { parseNumeric, formatPercentage } from "@/lib/utils";

interface PerformanceAnalyticsProps {
  positionsData: any[];
  ytdBenchmarks: Array<{ name: string; value: string }>;
  logos: Record<string, string>;
}

export function PerformanceAnalytics({ positionsData, ytdBenchmarks, logos }: PerformanceAnalyticsProps) {
  const movers = useMemo(() => {
    // Filter out CASH and ensure we have YTD Gain (from Column AT)
    const stocks = positionsData.filter(p => 
      p.Ticker !== "CASH" && 
      p.Ticker !== "Cash" && 
      (p["YTD Gain"] || p._columnATHeader)
    );

    // Get value from column AT (which we stored as _columnATHeader or it might be in the record)
    const getATValue = (p: any) => {
      const val = p["YTD Gain"] || p[p._columnATHeader] || "0";
      return parseNumeric(val) || 0;
    };

    const sorted = [...stocks].sort((a, b) => getATValue(b) - getATValue(a));
    
    return {
      top: sorted.slice(0, 3),
      bottom: [...sorted].reverse().slice(0, 3)
    };
  }, [positionsData]);

  return (
    <div className="space-y-4">
      {/* Movers Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top Performers */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {movers.top.map((stock, i) => {
              const ticker = stock.Ticker || stock.Symbol;
              const ytd = parseNumeric(stock["YTD Gain"] || stock[stock._columnATHeader]) || 0;
              return (
                <div key={ticker} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {logos[ticker] && (
                      <img src={logos[ticker]} alt={ticker} className="w-5 h-5 object-contain rounded" />
                    )}
                    <span className="font-mono text-sm font-bold text-slate-200">{ticker}</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">+{ytd.toFixed(1)}%</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Top Laggards */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-rose-400">
              <TrendingDown className="w-4 h-4" />
              Top Laggards
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {movers.bottom.map((stock, i) => {
              const ticker = stock.Ticker || stock.Symbol;
              const ytd = parseNumeric(stock["YTD Gain"] || stock[stock._columnATHeader]) || 0;
              return (
                <div key={ticker} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {logos[ticker] && (
                      <img src={logos[ticker]} alt={ticker} className="w-5 h-5 object-contain rounded" />
                    )}
                    <span className="font-mono text-sm font-bold text-slate-200">{ticker}</span>
                  </div>
                  <span className="text-sm font-semibold text-rose-400">{ytd.toFixed(1)}%</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Benchmarks Card */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-400">
            <BarChart3 className="w-4 h-4" />
            Performance vs Benchmarks
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 grid grid-cols-3 gap-2">
          {ytdBenchmarks.map((benchmark) => {
            const val = parseNumeric(benchmark.value) || 0;
            return (
              <div key={benchmark.name} className="bg-slate-800/30 rounded-lg p-2 text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{benchmark.name}</div>
                <div className={`text-sm font-bold font-mono ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {val >= 0 ? '+' : ''}{benchmark.value}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
