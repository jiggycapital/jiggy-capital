"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSheetData, parseSheetData, type DatasetType } from "@/lib/google-sheets";
import { formatPercentage, formatCurrency, parseNumeric } from "@/lib/utils";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from "recharts";
import { TrendingUp, TrendingDown, PieChart as PieChartIcon, Activity, Target, Percent } from "lucide-react";

export function HomeDashboard() {
  const [positionsData, setPositionsData] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);
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
      
      // Load performance data
      // YTD Performance is in cell B3 (row 2, column 1 in 0-indexed)
      const performanceRows = await fetchSheetData("performance");
      const performanceParsed = parseSheetData(performanceRows);
      
      // Get YTD Performance from cell B3 (row 2, column 1)
      let ytdPerformanceValue = null;
      if (performanceRows.length > 2 && performanceRows[2].length > 1) {
        ytdPerformanceValue = performanceRows[2][1]?.trim().replace(/^"|"$/g, '') || null;
      }
      
      setPerformanceData({
        parsed: performanceParsed,
        ytdPerformance: ytdPerformanceValue,
        rawRows: performanceRows,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  // Get column V value for daily movers
  const getColumnVValue = (row: any): number | null => {
    const columnVHeader = row._columnVHeader;
    if (columnVHeader) {
      return parseNumeric(row[columnVHeader] || "");
    }
    return parseNumeric(row["Daily PnL %"] || row["Daily PnL"] || "");
  };

  // Calculate comprehensive portfolio metrics (percentage-only)
  const portfolioMetrics = useMemo(() => {
    // Get YTD performance from performance sheet (cell B3)
    const ytdPerformance = performanceData?.ytdPerformance || null;
    const ytdPerformanceNum = ytdPerformance ? parseNumeric(ytdPerformance.toString().replace(/[+%]/g, '')) : null;
    
    // Get benchmark comparisons from parsed performance data
    const performanceParsed = performanceData?.parsed || [];
    let benchmarkComparisons = {
      qqq: null as string | null,
      igv: null as string | null,
      smh: null as string | null,
    };
    
    // Search through all rows for benchmark data
    for (const row of performanceParsed) {
      if (!benchmarkComparisons.qqq && (row["Performance vs QQQ"] || row["vs QQQ"])) {
        benchmarkComparisons.qqq = row["Performance vs QQQ"] || row["vs QQQ"] || null;
      }
      if (!benchmarkComparisons.igv && (row["Performance vs IGV"] || row["vs IGV"])) {
        benchmarkComparisons.igv = row["Performance vs IGV"] || row["vs IGV"] || null;
      }
      if (!benchmarkComparisons.smh && (row["Performance vs SMH"] || row["vs SMH"])) {
        benchmarkComparisons.smh = row["Performance vs SMH"] || row["vs SMH"] || null;
      }
    }
    
    // Also check raw performance rows for benchmarks (in case they're in a different format)
    if (performanceData?.rawRows) {
      const rawRows = performanceData.rawRows;
      const headerRowIndex = rawRows.findIndex((row: string[], idx: number) => {
        const firstCell = (row[0] || '').toLowerCase();
        return firstCell.includes('performance') || firstCell.includes('qqq') || firstCell.includes('igv') || firstCell.includes('smh');
      });
      
      if (headerRowIndex >= 0) {
        const headers = rawRows[headerRowIndex].map((h: string) => h.trim().replace(/^"|"$/g, ''));
        const qqqIndex = headers.findIndex((h: string) => h.includes("QQQ") || h.includes("qqq"));
        const igvIndex = headers.findIndex((h: string) => h.includes("IGV") || h.includes("igv"));
        const smhIndex = headers.findIndex((h: string) => h.includes("SMH") || h.includes("smh"));
        
        if (qqqIndex >= 0 && rawRows.length > headerRowIndex + 1) {
          const value = rawRows[headerRowIndex + 1]?.[qqqIndex]?.trim().replace(/^"|"$/g, '');
          if (value && !benchmarkComparisons.qqq) benchmarkComparisons.qqq = value;
        }
        if (igvIndex >= 0 && rawRows.length > headerRowIndex + 1) {
          const value = rawRows[headerRowIndex + 1]?.[igvIndex]?.trim().replace(/^"|"$/g, '');
          if (value && !benchmarkComparisons.igv) benchmarkComparisons.igv = value;
        }
        if (smhIndex >= 0 && rawRows.length > headerRowIndex + 1) {
          const value = rawRows[headerRowIndex + 1]?.[smhIndex]?.trim().replace(/^"|"$/g, '');
          if (value && !benchmarkComparisons.smh) benchmarkComparisons.smh = value;
        }
      }
    }

    // Calculate weighted average YTD gain
    const ytdGains = positionsData
      .map(row => {
        const ytd = parseNumeric(row["YTD Gain"] || row["YTD Gain %"] || row["YTD PnL %"] || row["YTD % Chg"] || row["Total Return (YTD) %"] || "0");
        const value = parseNumeric(row["Market Value"] || row["Value"] || "0") || 0;
        return { ytd: ytd || 0, value };
      })
      .filter(item => item.value > 0);

    const weightedYtd = ytdGains.length > 0
      ? ytdGains.reduce((sum, item) => sum + (item.ytd * item.value), 0) / ytdGains.reduce((sum, item) => sum + item.value, 0)
      : 0;

    // Calculate weighted average total gain %
    const totalGainPercents = positionsData
      .map(row => {
        const costBasis = parseNumeric(row["Cost Basis"] || row["Cost"] || "0") || 0;
        const marketValue = parseNumeric(row["Market Value"] || row["Value"] || "0") || 0;
        const gainPercent = costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : 0;
        return { gainPercent, value: marketValue };
      })
      .filter(item => item.value > 0);

    const weightedTotalGainPercent = totalGainPercents.length > 0
      ? totalGainPercents.reduce((sum, item) => sum + (item.gainPercent * item.value), 0) / totalGainPercents.reduce((sum, item) => sum + item.value, 0)
      : 0;

    // Calculate weighted average daily move %
    const dailyMoves = positionsData
      .map(row => {
        const dailyMove = getColumnVValue(row) || 0;
        const value = parseNumeric(row["Market Value"] || row["Value"] || "0") || 0;
        return { dailyMove, value };
      })
      .filter(item => item.value > 0);

    const weightedDailyMove = dailyMoves.length > 0
      ? dailyMoves.reduce((sum, item) => sum + (item.dailyMove * item.value), 0) / dailyMoves.reduce((sum, item) => sum + item.value, 0)
      : 0;

    // Top holdings by YTD performance
    const topHoldings = positionsData
      .map(row => ({
        ticker: row.Ticker || row.Symbol || "",
        company: row.Name || row.Company || "",
        ytd: parseNumeric(row["YTD Gain"] || row["YTD Gain %"] || row["YTD PnL %"] || row["YTD % Chg"] || row["Total Return (YTD) %"] || "0") || 0,
        totalGain: (() => {
          const costBasis = parseNumeric(row["Cost Basis"] || row["Cost"] || "0") || 0;
          const marketValue = parseNumeric(row["Market Value"] || row["Value"] || "0") || 0;
          return costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : 0;
        })(),
        dailyMove: getColumnVValue(row) || 0,
      }))
      .filter(item => item.ticker && item.ticker !== "")
      .sort((a, b) => Math.abs(b.ytd) - Math.abs(a.ytd))
      .slice(0, 10);

    return {
      ytdPerformance,
      ytdPerformanceNum,
      weightedYtd,
      weightedTotalGainPercent,
      weightedDailyMove,
      topHoldings,
      holdingCount: positionsData.filter(row => row.Ticker && row.Ticker !== "").length,
      benchmarkComparisons,
    };
  }, [positionsData, performanceData]);

  // Calculate sector allocation percentages (no dollar values)
  const sectorData = useMemo(() => {
    const sectorMap = new Map<string, { count: number; totalValue: number }>();
    const totalValue = positionsData
      .map(row => parseNumeric(row["Market Value"] || row["Value"] || "0") || 0)
      .reduce((a, b) => a + b, 0);

    positionsData.forEach(row => {
      const sector = row.Sector || "Unknown";
      const marketValue = parseNumeric(row["Market Value"] || row["Value"] || "0") || 0;
      if (sector && sector !== "" && marketValue > 0) {
        const existing = sectorMap.get(sector) || { count: 0, totalValue: 0 };
        sectorMap.set(sector, {
          count: existing.count + 1,
          totalValue: existing.totalValue + marketValue,
        });
      }
    });

    return Array.from(sectorMap.entries())
      .map(([name, data]) => ({ 
        name, 
        count: data.count,
        percentage: totalValue > 0 ? (data.totalValue / totalValue) * 100 : 0,
        value: data.totalValue, // Keep for pie chart sizing
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [positionsData]);

  const topGainers = useMemo(() => {
    return positionsData
      .map(row => ({
        ticker: row.Ticker || row.Symbol || "",
        company: row.Name || row.Company || "",
        gain: getColumnVValue(row) || 0,
      }))
      .filter(item => item.ticker && item.ticker !== "")
      .sort((a, b) => b.gain - a.gain)
      .slice(0, 5);
  }, [positionsData]);

  const topLosers = useMemo(() => {
    return positionsData
      .map(row => ({
        ticker: row.Ticker || row.Symbol || "",
        company: row.Name || row.Company || "",
        gain: getColumnVValue(row) || 0,
      }))
      .filter(item => item.ticker && item.ticker !== "")
      .sort((a, b) => a.gain - b.gain)
      .slice(0, 5);
  }, [positionsData]);

  const COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#6366f1",
    "#14b8a6", "#a855f7", "#f43f5e", "#22c55e"
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-slate-400 text-lg">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400 text-lg">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Section - Large Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400 text-sm uppercase tracking-wider">YTD Performance</CardDescription>
            <CardTitle className={`text-5xl font-mono font-bold mt-2 ${
              (portfolioMetrics.ytdPerformanceNum ?? portfolioMetrics.weightedYtd) >= 0 
                ? 'text-green-400' 
                : 'text-red-400'
            }`}>
              {portfolioMetrics.ytdPerformance 
                ? portfolioMetrics.ytdPerformance 
                : formatPercentage(portfolioMetrics.weightedYtd)}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              {(portfolioMetrics.ytdPerformanceNum ?? portfolioMetrics.weightedYtd) >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-400" />
              )}
              <span className="text-slate-400 text-sm">From Performance Sheet</span>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400 text-sm uppercase tracking-wider flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Daily Move %
            </CardDescription>
            <CardTitle className={`text-3xl font-mono font-bold mt-2 ${
              portfolioMetrics.weightedDailyMove >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatPercentage(portfolioMetrics.weightedDailyMove)}
            </CardTitle>
            <div className="text-slate-400 text-xs mt-2">
              {portfolioMetrics.holdingCount} holdings
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Benchmark Performance Comparison */}
      {(portfolioMetrics.benchmarkComparisons.qqq || portfolioMetrics.benchmarkComparisons.igv || portfolioMetrics.benchmarkComparisons.smh) && (
        <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance vs Benchmarks
            </CardTitle>
            <CardDescription className="text-slate-400">YTD Comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {portfolioMetrics.benchmarkComparisons.qqq && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <span className="text-blue-400 font-mono font-bold text-sm">QQQ</span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">vs QQQ</div>
                    </div>
                  </div>
                  <div className={`text-lg font-mono font-bold ${
                    (() => {
                      const num = parseNumeric(portfolioMetrics.benchmarkComparisons.qqq.toString().replace(/[+%bp]/g, ''));
                      return num !== null && num >= 0 ? 'text-green-400' : 'text-red-400';
                    })()
                  }`}>
                    {portfolioMetrics.benchmarkComparisons.qqq}
                  </div>
                </div>
              )}
              {portfolioMetrics.benchmarkComparisons.igv && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <span className="text-purple-400 font-mono font-bold text-sm">IGV</span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">vs IGV</div>
                    </div>
                  </div>
                  <div className={`text-lg font-mono font-bold ${
                    (() => {
                      const num = parseNumeric(portfolioMetrics.benchmarkComparisons.igv.toString().replace(/[+%bp]/g, ''));
                      return num !== null && num >= 0 ? 'text-green-400' : 'text-red-400';
                    })()
                  }`}>
                    {portfolioMetrics.benchmarkComparisons.igv}
                  </div>
                </div>
              )}
              {portfolioMetrics.benchmarkComparisons.smh && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <span className="text-cyan-400 font-mono font-bold text-sm">SMH</span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">vs SMH</div>
                    </div>
                  </div>
                  <div className={`text-lg font-mono font-bold ${
                    (() => {
                      const num = parseNumeric(portfolioMetrics.benchmarkComparisons.smh.toString().replace(/[+%bp]/g, ''));
                      return num !== null && num >= 0 ? 'text-green-400' : 'text-red-400';
                    })()
                  }`}>
                    {portfolioMetrics.benchmarkComparisons.smh}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sector Allocation - Enhanced */}
        <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Sector Allocation
            </CardTitle>
            <CardDescription className="text-slate-400">By Percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => `${props.payload.percentage.toFixed(1)}%`}
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#e2e8f0'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {sectorData.slice(0, 8).map((sector, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-100">{sector.name}</div>
                        <div className="text-xs text-slate-400">{sector.count} holdings</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-semibold text-slate-100">
                        {sector.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Holdings */}
        <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Holdings
            </CardTitle>
            <CardDescription className="text-slate-400">By YTD Performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {portfolioMetrics.topHoldings.slice(0, 8).map((holding, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-all group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono font-semibold text-slate-100 truncate">
                        {holding.ticker}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {holding.company}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className={`text-sm font-mono font-semibold ${holding.ytd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercentage(holding.ytd)}
                    </div>
                    <div className={`text-xs ${holding.totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      Total: {formatPercentage(holding.totalGain)}
                    </div>
                    <div className={`text-xs mt-0.5 ${holding.dailyMove >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      Daily: {formatPercentage(holding.dailyMove)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Movers - Enhanced */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-green-900/20 via-slate-900 to-slate-900 border-green-800/30 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-green-400 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Gainers
            </CardTitle>
            <CardDescription className="text-slate-400">1 Day Performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topGainers.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 transition-all border-l-2 border-green-500/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono font-semibold text-slate-100">
                        {item.ticker}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {item.company}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-lg font-mono font-bold text-green-400">
                      {formatPercentage(item.gain)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-900/20 via-slate-900 to-slate-900 border-red-800/30 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-red-400 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Top Losers
            </CardTitle>
            <CardDescription className="text-slate-400">1 Day Performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topLosers.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 transition-all border-l-2 border-red-500/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono font-semibold text-slate-100">
                        {item.ticker}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {item.company}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-lg font-mono font-bold text-red-400">
                      {formatPercentage(item.gain)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase">Sectors</CardDescription>
            <CardTitle className="text-2xl font-mono text-slate-100">
              {sectorData.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase">Holdings</CardDescription>
            <CardTitle className="text-2xl font-mono text-slate-100">
              {portfolioMetrics.holdingCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase">Avg YTD</CardDescription>
            <CardTitle className={`text-2xl font-mono ${
              portfolioMetrics.weightedYtd >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatPercentage(portfolioMetrics.weightedYtd)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

