"use client";

import { DRChartView } from "@/components/dr-chart-view";
import { ErrorBoundary } from "@/components/error-boundary";

export default function DRChartPage() {
  return (
    <div className="container mx-auto py-6 px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">DR Chart</h1>
        <p className="text-slate-400">Visualize financial metrics over time across multiple companies</p>
      </div>
      <ErrorBoundary>
        <DRChartView />
      </ErrorBoundary>
    </div>
  );
}

