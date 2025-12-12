"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSheetData, parseSheetData, type DatasetType } from "@/lib/google-sheets";
import { formatPercentage, formatCurrency, parseNumeric } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export function HomeDashboard() {
  const [positionsData, setPositionsData] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      // Load portfolio data
      const portfolioRows = await fetchSheetData("portfolio");
      const portfolioData = parseSheetData(portfolioRows);
      
      // Find column V header (index 21) from raw rows
      const headerRowIndex = portfolioRows.findIndex((row, idx) => {
        const firstCell = (row[0] || '').toLowerCase();
        return firstCell.includes('ticker') || firstCell.includes('symbol');
      });
      const headerRow = headerRowIndex >= 0 ? portfolioRows[headerRowIndex] : [];
      const columnVHeader = headerRow.length > 21 ? headerRow[21]?.trim().replace(/^"|"$/g, '') : null;
      
      // Store column V header name for later use
      const dataWithColumnV = portfolioData.map(row => ({
        ...row,
        _columnVHeader: columnVHeader,
      }));
      
      setPositionsData(dataWithColumnV);
      
      // Load performance data (cell B3 = row 3, column 2, 0-indexed: row 2, column 1)
      const performanceRows = await fetchSheetData("performance");
      if (performanceRows.length > 2 && performanceRows[2].length > 1) {
        const ytdPerformance = performanceRows[2][1]?.trim() || null;
        setPerformanceData(ytdPerformance);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  // Calculate portfolio stats from Portfolio sheet
  // Get YTD Gain from the data
  const ytdGains = positionsData
    .map(row => parseNumeric(row["YTD Gain"] || row["YTD Gain %"] || row["YTD PnL %"] || row["YTD % Chg"] || row["Total Return (YTD) %"]))
    .filter((v): v is number => v !== null);
  
  const avgYtd = ytdGains.length > 0 
    ? ytdGains.reduce((a, b) => a + b, 0) / ytdGains.length 
    : 0;

  // Get total portfolio value
  const totalPortfolioValue = positionsData
    .map(row => parseNumeric(row["Market Value"] || row["Value"] || "0"))
    .filter((v): v is number => v !== null)
    .reduce((a, b) => a + b, 0);

  // Get total cost basis
  const totalCostBasis = positionsData
    .map(row => parseNumeric(row["Cost Basis"] || row["Cost"] || "0"))
    .filter((v): v is number => v !== null)
    .reduce((a, b) => a + b, 0);

  // Calculate total gain
  const totalGain = totalPortfolioValue - totalCostBasis;
  const totalGainPercent = totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0;

  // Top movers - using column V (index 21) from Portfolio sheet
  // Need to find which column header corresponds to column V
  // Column V is the 22nd column (0-indexed: 21)
  const getColumnVValue = (row: any, headers: string[]): number | null => {
    if (headers.length > 21) {
      const columnVHeader = headers[21];
      return parseNumeric(row[columnVHeader] || row[headers[21]] || "");
    }
    return null;
  };

  // Get column V value - use the stored header name from loadData
  const getColumnVValue = (row: any): number | null => {
    const columnVHeader = row._columnVHeader;
    if (columnVHeader) {
      return parseNumeric(row[columnVHeader] || "");
    }
    // Fallback to common column names if header not found
    return parseNumeric(row["Daily PnL %"] || row["Daily PnL"] || "");
  };

  const topGainers = positionsData
    .map(row => ({
      ticker: row.Ticker || row.Symbol || "",
      company: row.Name || row.Company || "",
      gain: getColumnVValue(row) || 0,
    }))
    .filter(item => item.ticker && item.ticker !== "")
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 5);

  const topLosers = positionsData
    .map(row => ({
      ticker: row.Ticker || row.Symbol || "",
      company: row.Name || row.Company || "",
      gain: getColumnVValue(row) || 0,
    }))
    .filter(item => item.ticker && item.ticker !== "")
    .sort((a, b) => a.gain - b.gain)
    .slice(0, 5);

  // Sector allocation - using Market Value instead of Market Cap for portfolio weighting
  const sectorMap = new Map<string, number>();
  positionsData.forEach(row => {
    const sector = row.Sector || "Unknown";
    const marketValue = parseNumeric(row["Market Value"] || row["Value"] || "0") || 0;
    if (sector && sector !== "" && marketValue > 0) {
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + marketValue);
    }
  });

  const sectorData = Array.from(sectorMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#6366f1"
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Executive Summary</h1>
        <p className="text-slate-400">Portfolio overview and key metrics</p>
      </div>

      {/* Portfolio Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">YTD Performance</CardDescription>
            <CardTitle className={`text-2xl font-mono ${performanceData && performanceData.startsWith('+') ? 'text-green-400' : performanceData && performanceData.startsWith('-') ? 'text-red-400' : 'text-slate-100'}`}>
              {performanceData || "Loading..."}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Total Gain</CardDescription>
            <CardTitle className={`text-2xl font-mono ${totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(totalGain)} ({formatPercentage(totalGainPercent)})
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Total Holdings</CardDescription>
            <CardTitle className="text-2xl font-mono text-slate-100">
              {positionsData.filter(row => row.Ticker && row.Ticker !== "").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Sectors</CardDescription>
            <CardTitle className="text-2xl font-mono text-slate-100">
              {sectorMap.size}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Allocation */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100">Sector Allocation</CardTitle>
            <CardDescription className="text-slate-400">By Market Cap</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Movers */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Top Gainers</CardTitle>
              <CardDescription className="text-slate-400">1 Day Performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topGainers.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1">
                    <div>
                      <span className="font-mono text-slate-100 font-semibold">{item.ticker}</span>
                      <span className="text-slate-400 text-sm ml-2">{item.company}</span>
                    </div>
                    <span className="font-mono text-green-400">
                      {formatPercentage(item.gain)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Top Losers</CardTitle>
              <CardDescription className="text-slate-400">1 Day Performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topLosers.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1">
                    <div>
                      <span className="font-mono text-slate-100 font-semibold">{item.ticker}</span>
                      <span className="text-slate-400 text-sm ml-2">{item.company}</span>
                    </div>
                    <span className="font-mono text-red-400">
                      {formatPercentage(item.gain)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

