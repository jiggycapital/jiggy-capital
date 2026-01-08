"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSheetData, parseSheetData, fetchLogos, type DatasetType } from "@/lib/google-sheets";
import { InteractivePieChart } from "@/components/interactive-pie-chart";
import { PortfolioTanStackTable } from "@/components/hub/portfolio-tanstack-table";
import { WatchlistTanStackTable } from "@/components/hub/watchlist-tanstack-table";
import { NewsFeed } from "@/components/hub/news-feed";
import { UpcomingEvents } from "@/components/hub/upcoming-events";
import { formatPercentage, formatCurrency, parseNumeric } from "@/lib/utils";
import { TrendingUp, TrendingDown, PieChart as PieChartIcon, Activity, Target, Percent, Twitter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function HomeDashboard() {
  const [positionsData, setPositionsData] = useState<any[]>([]);
  const [watchlistData, setWatchlistData] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [irLinks, setIrLinks] = useState<Record<string, string>>({});
  const [pieChartView, setPieChartView] = useState<"company" | "sector">("company");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      // Load portfolio data
      const [portfolioRows, watchlistRows] = await Promise.all([
        fetchSheetData("portfolio"),
        fetchSheetData("watchlist")
      ]);

      const portfolioData = parseSheetData(portfolioRows);
      const watchlistDataParsed = parseSheetData(watchlistRows);
      setWatchlistData(watchlistDataParsed);

      // Find headers for specific columns (V=21, AO=40, AT=45) from raw rows
      const headerRowIndex = portfolioRows.findIndex((row, idx) => {
        const firstCell = (row[0] || '').toLowerCase();
        return firstCell.includes('ticker') || firstCell.includes('symbol');
      });
      const headerRow = headerRowIndex >= 0 ? portfolioRows[headerRowIndex] : [];
      const columnVHeader = headerRow.length > 21 ? headerRow[21]?.trim().replace(/^"|"$/g, '') : null;
      const columnEHeader = headerRow.length > 4 ? headerRow[4]?.trim().replace(/^"|"$/g, '') : null;
      const columnAEHeader = headerRow.length > 30 ? headerRow[30]?.trim().replace(/^"|"$/g, '') : null;
      const columnAFHeader = headerRow.length > 31 ? headerRow[31]?.trim().replace(/^"|"$/g, '') : null;
      const columnARHeader = headerRow.length > 43 ? headerRow[43]?.trim().replace(/^"|"$/g, '') : null;
      const columnAOHeader = headerRow.length > 40 ? headerRow[40]?.trim().replace(/^"|"$/g, '') : null;
      const columnATHeader = headerRow.length > 45 ? headerRow[45]?.trim().replace(/^"|"$/g, '') : null;
      const columnSHeader = headerRow.length > 18 ? headerRow[18]?.trim().replace(/^"|"$/g, '') : null;

      // Store column headers for later use
      const dataWithColumns = portfolioData.map(row => ({
        ...row,
        _columnVHeader: columnVHeader,
        _columnEHeader: columnEHeader,
        _columnAEHeader: columnAEHeader,
        _columnAFHeader: columnAFHeader,
        _columnARHeader: columnARHeader,
        _columnAOHeader: columnAOHeader,
        _columnATHeader: columnATHeader,
        _columnSHeader: columnSHeader,
      }));

      setPositionsData(dataWithColumns);

      // Load logos and IR links
      const { logos: logosData, irLinks: irLinksData } = await fetchLogos();
      setLogos(logosData);
      setIrLinks(irLinksData);

      // Load performance data
      // YTD Performance is in cell B3 (row 2, column 1 in 0-indexed)
      const performanceRows = await fetchSheetData("performance");
      const performanceParsed = parseSheetData(performanceRows);

      // Get YTD Performance from cell B3 (row 2, column 1)
      let ytdPerformanceValue = null;
      if (performanceRows.length > 2 && performanceRows[2].length > 1) {
        ytdPerformanceValue = performanceRows[2][1]?.trim().replace(/^"|"$/g, '') || null;
      }

      // Get Lifetime CAGR from cell B4 (row 3, column 1)
      let lifetimeCagrValue = null;
      if (performanceRows.length > 3 && performanceRows[3].length > 1) {
        lifetimeCagrValue = performanceRows[3][1]?.trim().replace(/^"|"$/g, '') || null;
      }

      // Get YTD Benchmark data from cells A5-B7 (rows 4-6, 0-indexed)
      const ytdBenchmarks: Array<{ name: string; value: string }> = [];
      for (let i = 4; i <= 6; i++) {
        if (performanceRows.length > i && performanceRows[i].length >= 2) {
          const name = performanceRows[i][0]?.trim().replace(/^"|"$/g, '') || '';
          const value = performanceRows[i][1]?.trim().replace(/^"|"$/g, '') || '';
          if (name && value) {
            ytdBenchmarks.push({ name, value });
          }
        }
      }

      setPerformanceData({
        parsed: performanceParsed,
        ytdPerformance: ytdPerformanceValue,
        lifetimeCagr: lifetimeCagrValue,
        rawRows: performanceRows,
        ytdBenchmarks,
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

  // Get column AT value for YTD Gain
  const getColumnATValue = (row: any): number | null => {
    const columnATHeader = row._columnATHeader;
    if (columnATHeader) {
      return parseNumeric(row[columnATHeader] || "");
    }
    return null;
  };

  // Calculate comprehensive portfolio metrics (percentage-only)
  const portfolioMetrics = useMemo(() => {
    // Get performance metrics from performance sheet
    const performanceParsed = performanceData?.parsed || [];
    const dailyPerformance = performanceParsed.find((row: any) => row["Day Performance"] || row["Daily Performance"])?.["Day Performance"] ||
      performanceParsed.find((row: any) => row["Daily Performance"])?.["Daily Performance"] ||
      performanceParsed[0]?.["Day Performance"] ||
      performanceParsed[0]?.["Daily Performance"] || null;

    const ytdPerformance = performanceData?.ytdPerformance || null;
    const ytdPerformanceNum = ytdPerformance ? parseNumeric(ytdPerformance.toString().replace(/[+%]/g, '')) : null;

    const lifetimeCagr = performanceData?.lifetimeCagr || null;

    // Get benchmark comparisons from parsed performance data
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

    // Calculate weighted average YTD gain from column AT
    const ytdGains = positionsData
      .map(row => {
        const ytd = getColumnATValue(row) || 0;
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

    // Calculate total portfolio value for weight calculation
    const totalPortfolioValue = positionsData
      .map(row => parseNumeric(row["Market Value"] || row["Value"] || "0"))
      .filter((v): v is number => v !== null)
      .reduce((a, b) => a + b, 0);

    // Top holdings by position % (weight)
    const topHoldings = positionsData
      .map(row => {
        const marketValue = parseNumeric(row["Market Value"] || row["Value"] || "0") || 0;
        const weight = totalPortfolioValue > 0 ? (marketValue / totalPortfolioValue) * 100 : 0;
        return {
          ticker: row.Ticker || row.Symbol || "",
          company: row.Name || row.Company || "",
          weight,
          ytd: getColumnATValue(row) || 0,
          totalGain: (() => {
            const costBasis = parseNumeric(row["Cost Basis"] || row["Cost"] || "0") || 0;
            return costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : 0;
          })(),
          dailyMove: getColumnVValue(row) || 0,
        };
      })
      .filter(item => item.ticker && item.ticker !== "" && item.ticker.toUpperCase() !== "CASH")
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

    // Calculate portfolio multiples (weighted averages)
    const portfolioItems = positionsData.filter(row => {
      const ticker = (row.Ticker || row.Symbol || "").toUpperCase();
      const value = parseNumeric(row["Market Value"] || row["Value"] || "0") || 0;
      return ticker !== "CASH" && value > 0;
    });

    let weightedFCF = 0;
    let fcfWeightSum = 0;
    let weightedPE = 0;
    let peWeightSum = 0;
    let weightedPEG = 0;
    let pegWeightSum = 0;

    portfolioItems.forEach(row => {
      const marketValue = parseNumeric(row["Market Value"] || row["Value"] || "0") || 0;
      const weight = totalPortfolioValue > 0 ? (marketValue / totalPortfolioValue) : 0;
      const weightDecimal = weight / 100;

      const pfcf2026 = parseNumeric(row["P/2026e FCF"] || row["P/2026 FCF"] || row["P/FCF 2026"] || "0") || 0;
      const pe2026 = parseNumeric(row["2026e P/E"] || row["2026 P/E"] || row["P/E 2026"] || "0") || 0;
      const peg = parseNumeric(row["PEG"] || row["P/E/G"] || "0") || 0;

      if (pfcf2026 > 0 && weight > 0) {
        weightedFCF += pfcf2026 * weightDecimal;
        fcfWeightSum += weightDecimal;
      }
      if (pe2026 > 0 && weight > 0) {
        weightedPE += pe2026 * weightDecimal;
        peWeightSum += weightDecimal;
      }
      if (peg > 0 && weight > 0) {
        weightedPEG += peg * weightDecimal;
        pegWeightSum += weightDecimal;
      }
    });

    const portfolioMultiples = {
      fcf2026: fcfWeightSum > 0 ? weightedFCF / fcfWeightSum : null,
      pe2026: peWeightSum > 0 ? weightedPE / peWeightSum : null,
      peg: pegWeightSum > 0 ? weightedPEG / pegWeightSum : null,
    };

    return {
      dailyPerformance,
      ytdPerformance,
      ytdPerformanceNum,
      lifetimeCagr,
      weightedYtd,
      weightedTotalGainPercent,
      weightedDailyMove,
      topHoldings,
      holdingCount: positionsData.filter(row => {
        const ticker = (row.Ticker || row.Symbol || "").toUpperCase();
        return ticker && ticker !== "" && ticker !== "CASH";
      }).length,
      benchmarkComparisons,
      portfolioMultiples,
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
      .filter(item => {
        const ticker = (item.ticker || "").toUpperCase();
        return ticker && ticker !== "" && ticker !== "CASH";
      })
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
      .filter(item => {
        const ticker = (item.ticker || "").toUpperCase();
        return ticker && ticker !== "" && ticker !== "CASH";
      })
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
    <div className="space-y-4 md:space-y-6 pb-4 md:pb-8 px-4 md:px-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 border border-slate-800/60 p-4 md:p-6 rounded-2xl backdrop-blur-sm shadow-lg">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight">
            Welcome to <span className="text-blue-400">Jiggy Capital</span>
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Real-time insights and performance analytics of my active equity portfolio.
            I focus on high-conviction growth companies and market-leading technology.
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <a
            href="https://twitter.com/jiggycapital"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] px-4 py-2 rounded-xl border border-[#1DA1F2]/20 transition-all font-bold text-sm group"
          >
            <Twitter className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
            Twitter
          </a>
          <a
            href="https://jiggy.substack.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 px-4 py-2 rounded-xl border border-orange-500/20 transition-all font-bold text-sm group"
          >
            <img
              src="https://cdn.prod.website-files.com/6088303c28a7c75678aa21d8/611bf5975d252f60f5868aeb_Substack-Startapaidnewsletter.png"
              alt="Substack"
              className="w-4 h-4 object-contain group-hover:scale-110 transition-transform"
            />
            Substack
          </a>
        </div>
      </div>

      {/* Hero Section - Three Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="py-2 md:py-3">
            <CardDescription className="text-slate-400 text-[10px] md:text-xs uppercase tracking-wider">Daily Performance</CardDescription>
            <CardTitle className={`text-xl md:text-3xl font-mono font-bold mt-0.5 md:mt-1 ${(() => {
                const num = portfolioMetrics.dailyPerformance ? parseNumeric(portfolioMetrics.dailyPerformance.toString().replace(/[+%]/g, '')) : portfolioMetrics.weightedDailyMove;
                return (num ?? 0) >= 0 ? 'text-green-400' : 'text-red-400';
              })()
              }`}>
              {portfolioMetrics.dailyPerformance || formatPercentage(portfolioMetrics.weightedDailyMove)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="py-2 md:py-3">
            <CardDescription className="text-slate-400 text-[10px] md:text-xs uppercase tracking-wider">YTD Performance</CardDescription>
            <CardTitle className={`text-xl md:text-3xl font-mono font-bold mt-0.5 md:mt-1 ${(portfolioMetrics.ytdPerformanceNum ?? portfolioMetrics.weightedYtd) >= 0
                ? 'text-green-400'
                : 'text-red-400'
              }`}>
              {portfolioMetrics.ytdPerformance
                ? portfolioMetrics.ytdPerformance
                : formatPercentage(portfolioMetrics.weightedYtd)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="py-2 md:py-3">
            <CardDescription className="text-slate-400 text-[10px] md:text-xs uppercase tracking-wider">Lifetime CAGR</CardDescription>
            <CardTitle className={`text-xl md:text-3xl font-mono font-bold mt-0.5 md:mt-1 ${(() => {
                const num = portfolioMetrics.lifetimeCagr ? parseNumeric(portfolioMetrics.lifetimeCagr.toString().replace(/[+%]/g, '')) : null;
                return (num ?? 0) >= 0 ? 'text-green-400' : 'text-red-400';
              })()
              }`}>
              {portfolioMetrics.lifetimeCagr || "0%"}
            </CardTitle>
            <div className="text-slate-400 text-[9px] mt-1">
              Jan 29th, 2020 -
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Allocation - FIRST Section (Full Width) */}
      <div className="w-full">
        {/* Interactive Pie Chart */}
        <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-blue-400" />
              {pieChartView === "company" ? "Portfolio Allocation" : "Sector Allocation"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InteractivePieChart
              positionsData={positionsData}
              logos={logos}
              view={pieChartView}
              onViewChange={setPieChartView}
            />
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Table - Full Width */}
      <div className="w-full">
        <Tabs defaultValue="holdings" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-slate-900/50 border border-slate-800 p-1">
              <TabsTrigger
                value="holdings"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs font-bold px-6"
              >
                My Holdings
              </TabsTrigger>
              <TabsTrigger
                value="watchlist"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs font-bold px-6"
              >
                Watchlist
              </TabsTrigger>
            </TabsList>
            <div className="hidden md:block text-[10px] font-medium text-slate-500 uppercase tracking-widest bg-slate-900/30 px-3 py-1 rounded-full border border-slate-800/50">
              {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          <TabsContent value="holdings" className="mt-0 focus-visible:outline-none">
            <PortfolioTanStackTable
              positionsData={positionsData}
              logos={logos}
            />
          </TabsContent>

          <TabsContent value="watchlist" className="mt-0 focus-visible:outline-none">
            <WatchlistTanStackTable
              watchlistData={watchlistData}
              logos={logos}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Movers and Company News (News/Events) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:h-[850px] lg:overflow-hidden">
        {/* Left Column: Movers + Events */}
        <div className="flex flex-col gap-4 md:gap-6 h-full min-h-0">
          {/* Daily Movers - Compact Horizontal Design */}
          <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl shrink-0">
            <CardContent className="p-4 space-y-3">
              {/* Top Gainers Row */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Top Gainers</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topGainers.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700">
                        {logos[item.ticker] ? (
                          <img
                            src={logos[item.ticker]}
                            alt=""
                            className="w-4 h-4 object-contain"
                            onError={(e) => (e.target as any).style.display = 'none'}
                          />
                        ) : (
                          <span className="text-[8px] font-bold text-slate-500">{item.ticker.substring(0, 2)}</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-200">{item.ticker}</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">+{item.gain.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-800"></div>

              {/* Top Losers Row */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-rose-400" />
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Top Losers</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topLosers.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700">
                        {logos[item.ticker] ? (
                          <img
                            src={logos[item.ticker]}
                            alt=""
                            className="w-4 h-4 object-contain"
                            onError={(e) => (e.target as any).style.display = 'none'}
                          />
                        ) : (
                          <span className="text-[8px] font-bold text-slate-500">{item.ticker.substring(0, 2)}</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-200">{item.ticker}</span>
                      <span className="text-xs font-mono font-bold text-rose-400">{item.gain.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <UpcomingEvents
            portfolioTickers={positionsData.map(p => p.Ticker || p.Symbol).filter(Boolean)}
            logos={logos}
            irLinks={irLinks}
            className="flex-1 min-h-0"
          />
        </div>

        {/* Right Column: News Feed */}
        <NewsFeed
          portfolioData={positionsData}
          logos={logos}
          className="h-full min-h-0"
        />
      </div>

      {/* Performance Analytics and Multiples - BOTTOM Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* YTD Benchmark Performance */}
        {performanceData?.ytdBenchmarks && performanceData.ytdBenchmarks.length > 0 && (
          <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                Benchmark Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {performanceData.ytdBenchmarks.map((benchmark: { name: string; value: string }, idx: number) => {
                  const num = parseNumeric(benchmark.value.toString().replace(/[+%bp]/g, ''));
                  return (
                    <div key={idx} className="p-3 rounded-lg bg-slate-800/50 border border-slate-800 flex flex-col items-center justify-center gap-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{benchmark.name}</span>
                      <span className={`text-xl font-mono font-bold ${num !== null && num >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {benchmark.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Portfolio Multiples */}
        <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-400" />
              Portfolio Multiples
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-800 flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest text-center">26e FCF</span>
                <span className="text-xl font-mono font-bold text-slate-100">
                  {portfolioMetrics.portfolioMultiples.fcf2026 ? `${portfolioMetrics.portfolioMultiples.fcf2026.toFixed(1)}x` : '-'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-800 flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest text-center">26e P/E</span>
                <span className="text-xl font-mono font-bold text-slate-100">
                  {portfolioMetrics.portfolioMultiples.pe2026 ? `${portfolioMetrics.portfolioMultiples.pe2026.toFixed(1)}x` : '-'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-800 flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest text-center">PEG</span>
                <span className="text-xl font-mono font-bold text-slate-100">
                  {portfolioMetrics.portfolioMultiples.peg ? `${portfolioMetrics.portfolioMultiples.peg.toFixed(2)}x` : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

