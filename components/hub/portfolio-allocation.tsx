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
    <Card className="bg-slate-900/50 border-slate-800 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          Allocation
          <span className="text-xs font-normal text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
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
