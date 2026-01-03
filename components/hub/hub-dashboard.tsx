"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchSheetData, parseSheetData, fetchLogos, type DatasetType } from "@/lib/google-sheets";
import { parseNumeric } from "@/lib/utils";
import { PerformanceStats } from "./performance-stats";
import { PortfolioAllocation } from "./portfolio-allocation";
import { PerformanceAnalytics } from "./performance-analytics";
import { PortfolioTable } from "./portfolio-table";
import { UpcomingEvents } from "./upcoming-events";
import { NewsFeed } from "./news-feed";
import { Skeleton } from "@/components/ui/skeleton";

export function HubDashboard() {
  const [positionsData, setPositionsData] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [irLinks, setIrLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [portfolioRows, performanceRows, logosData, logosPt2Rows] = await Promise.all([
        fetchSheetData("portfolio"),
        fetchSheetData("performance"),
        fetchLogos(),
        fetchSheetData("logosPt2")
      ]);

      // Parse Portfolio Data
      const portfolioData = parseSheetData(portfolioRows);
      
      // Get column headers for V, AT, and S
      const headerRowIndex = portfolioRows.findIndex((row) => {
        const firstCell = (row[0] || '').toLowerCase();
        return firstCell.includes('ticker') || firstCell.includes('symbol');
      });
      const headerRow = headerRowIndex >= 0 ? portfolioRows[headerRowIndex] : [];
      const columnVHeader = headerRow.length > 21 ? headerRow[21]?.trim().replace(/^"|"$/g, '') : "Change %";
      const columnATHeader = headerRow.length > 45 ? headerRow[45]?.trim().replace(/^"|"$/g, '') : "YTD Gain";
      const columnSHeader = headerRow.length > 18 ? headerRow[18]?.trim().replace(/^"|"$/g, '') : "Cash Position";

      const dataWithHeaders = portfolioData.map(row => ({
        ...row,
        _columnVHeader: columnVHeader,
        _columnATHeader: columnATHeader,
        _columnSHeader: columnSHeader,
      }));
      
      setPositionsData(dataWithHeaders);
      setLogos(logosData.logos);

      // Parse IR Links from Logos Pt2
      const irMap: Record<string, string> = { ...logosData.irLinks };
      const logosPt2Parsed = parseSheetData(logosPt2Rows);
      logosPt2Parsed.forEach(row => {
        const ticker = row.Ticker || row.Symbol;
        const irLink = row["IR Link"] || row.Link || row[Object.keys(row).find(k => k.toLowerCase().includes('ir')) || ""];
        if (ticker && irLink) {
          irMap[ticker.toUpperCase()] = irLink;
        }
      });
      setIrLinks(irMap);

      // Parse Performance Data
      let ytdPerf = null;
      let cagr = null;
      const benchmarks: Array<{ name: string; value: string }> = [];

      if (performanceRows.length > 2 && performanceRows[2].length > 1) {
        ytdPerf = performanceRows[2][1]?.trim().replace(/^"|"$/g, '') || "0.0%";
      }
      if (performanceRows.length > 3 && performanceRows[3].length > 1) {
        cagr = performanceRows[3][1]?.trim().replace(/^"|"$/g, '') || "0.0%";
      }
      for (let i = 4; i <= 6; i++) {
        if (performanceRows.length > i && performanceRows[i].length >= 2) {
          benchmarks.push({
            name: performanceRows[i][0]?.trim().replace(/^"|"$/g, '') || '',
            value: performanceRows[i][1]?.trim().replace(/^"|"$/g, '') || ''
          });
        }
      }

      setPerformanceData({
        ytdPerformance: ytdPerf,
        lifetimeCagr: cagr,
        ytdBenchmarks: benchmarks,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  const dailyMove = useMemo(() => {
    if (positionsData.length === 0) return 0;
    const stocks = positionsData.filter(p => p.Ticker !== "CASH" && p.Ticker !== "Cash");
    const totalValue = stocks.reduce((sum, p) => sum + (parseNumeric(p["Market Value"] || p["Value"]) || 0), 0);
    if (totalValue === 0) return 0;

    let weightedSum = 0;
    stocks.forEach(p => {
      const val = parseNumeric(p["Market Value"] || p["Value"]) || 0;
      const change = parseNumeric(p["Change %"] || p[p._columnVHeader]) || 0;
      weightedSum += (change * val);
    });
    return weightedSum / totalValue;
  }, [positionsData]);

  const portfolioTickers = useMemo(() => {
    return positionsData
      .filter(p => p.Ticker && p.Ticker !== "CASH" && p.Ticker !== "Cash")
      .map(p => p.Ticker.toUpperCase());
  }, [positionsData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full bg-slate-900/50" />
          <Skeleton className="h-24 w-full bg-slate-900/50" />
          <Skeleton className="h-24 w-full bg-slate-900/50" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] lg:col-span-2 bg-slate-900/50" />
          <Skeleton className="h-[400px] bg-slate-900/50" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-rose-400 bg-rose-400/10 rounded-xl border border-rose-400/20">{error}</div>;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Top Stats */}
      <PerformanceStats 
        ytdPerformance={performanceData?.ytdPerformance} 
        lifetimeCagr={performanceData?.lifetimeCagr} 
        dailyMove={dailyMove} 
      />

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Allocation */}
        <div className="lg:col-span-8">
          <PortfolioAllocation positionsData={positionsData} logos={logos} />
        </div>

        {/* Right: Analytics & Benchmark */}
        <div className="lg:col-span-4">
          <PerformanceAnalytics 
            positionsData={positionsData} 
            ytdBenchmarks={performanceData?.ytdBenchmarks || []} 
            logos={logos} 
          />
        </div>
      </div>

      {/* Main Table */}
      <PortfolioTable positionsData={positionsData} logos={logos} />

      {/* Bottom Hub Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingEvents 
          portfolioTickers={portfolioTickers} 
          logos={logos} 
          irLinks={irLinks} 
        />
        <NewsFeed 
          portfolioData={positionsData} 
          logos={logos} 
        />
      </div>
    </div>
  );
}
