"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ResponsivePie } from "@nivo/pie";
import { Button } from "@/components/ui/button";
import { parseNumeric } from "@/lib/utils";

interface InteractivePieChartProps {
  positionsData: any[];
  logos: Record<string, string>;
  view: "company" | "sector";
  onViewChange: (view: "company" | "sector") => void;
}

export function InteractivePieChart({ positionsData, logos, view, onViewChange }: InteractivePieChartProps) {
  const chartData = useMemo(() => {
    const totalValue = positionsData
      .map(row => parseNumeric(row["Market Value"] || row["Value"] || "0") || 0)
      .reduce((a, b) => a + b, 0);

    if (view === "company") {
      // Company view - show individual holdings
      return positionsData
        .map(row => {
          const ticker = (row.Ticker || row.Symbol || "").toUpperCase();
          const marketValue = parseNumeric(row["Market Value"] || row["Value"] || "0") || 0;
          const weight = totalValue > 0 ? (marketValue / totalValue) * 100 : 0;
          
          if (ticker && ticker !== "CASH" && weight > 0) {
            return {
              id: ticker,
              label: row.Name || row.Company || ticker,
              value: weight,
              ticker,
              logo: logos[ticker] || logos[ticker.toUpperCase()] || null,
            };
          }
          return null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => b.value - a.value);
    } else {
      // Sector view - group by sector
      const sectorMap = new Map<string, number>();
      positionsData.forEach(row => {
        const sector = row.Sector || "Unknown";
        const marketValue = parseNumeric(row["Market Value"] || row["Value"] || "0") || 0;
        if (sector && sector !== "" && marketValue > 0) {
          sectorMap.set(sector, (sectorMap.get(sector) || 0) + marketValue);
        }
      });

      return Array.from(sectorMap.entries())
        .map(([sector, value]) => ({
          id: sector,
          label: sector,
          value: totalValue > 0 ? (value / totalValue) * 100 : 0,
          ticker: null,
          logo: null,
        }))
        .sort((a, b) => b.value - a.value);
    }
  }, [positionsData, logos, view]);

  const COLORS = [
    "#6366F1", "#EC4899", "#10B981", "#F59E0B", "#8B5CF6",
    "#06B6D4", "#84CC16", "#F97316", "#EF4444", "#14B8A6",
    "#F43F5E", "#A855F7", "#0EA5E9", "#22C55E", "#EAB308"
  ];

  const sectorColorMap: Record<string, string> = {
    'Technology': '#6366F1',
    'Software': '#EF4444',
    'Healthcare': '#EC4899',
    'Financial Services': '#10B981',
    'Consumer Discretionary': '#F59E0B',
    'Communication Services': '#8B5CF6',
    'Semiconductors': '#EAB308',
    'Industrials': '#06B6D4',
    'Energy': '#84CC16',
    'Consumer Staples': '#F97316',
    'Real Estate': '#EF4444',
    'Materials': '#14B8A6',
    'Utilities': '#F43F5E',
    'Other': '#F43F5E',
    'Cash': '#22C55E'
  };

  const getColor = (datum: any, index: number) => {
    if (view === "sector") {
      return sectorColorMap[datum.id] || COLORS[index % COLORS.length];
    }
    return COLORS[index % COLORS.length];
  };

  // Filter items that should show callouts (weight > 2.95%)
  const calloutItems = chartData.filter(item => item.value > 2.95);

  return (
    <div className="relative">
      {/* Toggle Buttons */}
      <div className="flex gap-2 mb-4 justify-center">
        <Button
          variant={view === "company" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewChange("company")}
          className={view === "company" ? "bg-blue-600 hover:bg-blue-700" : ""}
        >
          Holdings
        </Button>
        <Button
          variant={view === "sector" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewChange("sector")}
          className={view === "sector" ? "bg-blue-600 hover:bg-blue-700" : ""}
        >
          Sector
        </Button>
      </div>

      {/* Chart Container */}
      <div className="relative w-full" style={{ height: "500px" }}>
        <ResponsivePie
          data={chartData}
          margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
          innerRadius={0.5}
          padAngle={2}
          cornerRadius={4}
          activeOuterRadiusOffset={8}
          colors={getColor}
          borderWidth={2}
          borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
          arcLinkLabelsSkipAngle={10}
          arcLinkLabelsTextColor="#94a3b8"
          arcLinkLabelsThickness={2}
          arcLinkLabelsColor={{ from: 'color' }}
          arcLabelsSkipAngle={10}
          arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
          tooltip={({ datum }) => (
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
              <div className="text-slate-100 font-semibold">{datum.label}</div>
              <div className="text-slate-400 text-sm">{datum.value.toFixed(1)}%</div>
            </div>
          )}
          legends={[]}
        />

        {/* Custom Callouts */}
        {calloutItems.map((item, index) => {
          // Calculate angle for positioning (simplified - Nivo handles this internally)
          // For a more accurate implementation, we'd need to calculate based on pie slice angles
          const angle = (360 / chartData.length) * chartData.findIndex(d => d.id === item.id) - 90;
          const angleRad = (angle * Math.PI) / 180;
          const radius = 180;
          const calloutRadius = 220;
          const centerX = 50; // percentage
          const centerY = 50; // percentage
          
          const x = centerX + Math.cos(angleRad) * (calloutRadius / 5);
          const y = centerY + Math.sin(angleRad) * (calloutRadius / 5);

          return (
            <div
              key={item.id}
              className="absolute pointer-events-none"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}
            >
              <div className="bg-white/95 border border-slate-300 rounded-lg p-2 shadow-lg flex flex-col items-center min-w-[56px] min-h-[56px] justify-center hover:scale-110 transition-transform">
                {view === "company" && item.logo ? (
                  <>
                    <img
                      src={item.logo}
                      alt={item.ticker || ""}
                      className="w-8 h-8 object-contain rounded mb-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="text-xs text-slate-600 font-semibold">
                      {item.value.toFixed(1)}%
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-semibold text-slate-700 mb-1">
                      {item.label.length > 12 ? item.label.substring(0, 12) + "..." : item.label}
                    </div>
                    <div className="text-xs text-slate-600 font-semibold">
                      {item.value.toFixed(1)}%
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

