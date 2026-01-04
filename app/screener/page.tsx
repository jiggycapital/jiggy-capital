"use client";

import { useEffect, useState } from "react";
import { fetchSheetData, parseSheetData, fetchLogos } from "@/lib/google-sheets";
import { StockScreener } from "@/components/hub/stock-screener";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScreenerPage() {
  const [positionsData, setPositionsData] = useState<any[]>([]);
  const [watchlistData, setWatchlistData] = useState<any[]>([]);
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [rawPositionsRows, setRawPositionsRows] = useState<string[][]>([]);
  const [rawWatchlistRows, setRawWatchlistRows] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [portfolioRows, watchlistRows, logosData] = await Promise.all([
          fetchSheetData("portfolio"),
          fetchSheetData("watchlist"),
          fetchLogos()
        ]);
        
        setRawPositionsRows(portfolioRows);
        setRawWatchlistRows(watchlistRows);
        setPositionsData(parseSheetData(portfolioRows));
        setWatchlistData(parseSheetData(watchlistRows));
        setLogos(logosData.logos);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-6 space-y-6">
        <Skeleton className="h-10 w-48 bg-slate-900/50" />
        <Skeleton className="h-[600px] w-full bg-slate-900/50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-6">
        <div className="p-8 text-rose-400 bg-rose-400/10 rounded-xl border border-rose-400/20">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-6">
      <StockScreener 
        positionsData={positionsData} 
        watchlistData={watchlistData} 
        logos={logos} 
        rawPositionsRows={rawPositionsRows}
        rawWatchlistRows={rawWatchlistRows}
      />
    </div>
  );
}
