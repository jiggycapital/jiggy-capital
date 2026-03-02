"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InteractivePieChart } from "@/components/interactive-pie-chart";

interface PortfolioAllocationProps {
  positionsData: any[];
  logos: Record<string, string>;
}

export function PortfolioAllocation({ positionsData, logos }: PortfolioAllocationProps) {
  const [view, setView] = useState<"company" | "sector">("company");

  return (
    <Card className="bg-jiggy-surface-2 border border-jiggy-tan/50 rounded-2xl shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-black tracking-widest uppercase flex items-center justify-between">
          Allocation
          <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg">
            {view === "company" ? "By Holding" : "By Sector"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <InteractivePieChart
          positionsData={positionsData}
          logos={logos}
          view={view}
          onViewChange={setView}
        />
      </CardContent>
    </Card>
  );
}
