"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSheetData, parseSheetData, type DatasetType } from "@/lib/google-sheets";
import { formatPercentage, formatCurrency, parseNumeric } from "@/lib/utils";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar, Area, AreaChart
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, BarChart3, Activity, Target, Zap } from "lucide-react";

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
      
      // Load performance data - parse entire sheet
      const performanceRows = await fetchSheetData("performance");
      const performanceParsed = parseSheetData(performanceRows);
      setPerformanceData(performanceParsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  // Calculate comprehensive portfolio metrics
  const portfolioMetrics = useMemo(() => {
    const totalPortfolioValue = positionsData
      .map(row => parseNumeric(row["Market Value"] || row["Value"] || "0"))
      .filter((v): v is number => v !== null)
      .reduce((a, b) => a + b, 0);

    const totalCostBasis = positionsData
      .map(row => parseNumeric(row["Cost Basis"] || row["Cost"] || "0"))
      .filter((v): v is number => v !== null)
      .reduce((a, b) => a + b, 0);

    const totalGain = totalPortfolioValue - totalCostBasis;
    const totalGainPercent = totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0;

    // Get YTD performance from performance sheet
    const ytdPerformance = performanceData?.[0]?.["Performance"] || performanceData?.[0]?.["YTD Performance"] || null;
    const ytdPerformanceNum = ytdPerformance ? parseNumeric(ytdPerformance.toString().replace(/[+%]/g, '')) : null;

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

    // Top holdings by value
    const topHoldings = positionsData
      .map(row => ({
        ticker: row.Ticker || row.Symbol || "",
        company: row.Name || row.Company || "",
        value: parseNumeric(row["Market Value"] || row["Value"] || "0") || 0,
        weight: 0,
        ytd: parseNumeric(row["YTD Gain"] || row["YTD Gain %"] || row["YTD PnL %"] || row["YTD % Chg"] || row["Total Return (YTD) %"] || "0") || 0,
      }))
      .filter(item => item.ticker && item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(item => ({
        ...item,
        weight: totalPortfolioValue > 0 ? (item.value / totalPortfolioValue) * 100 : 0,
      }));

    return {
      totalPortfolioValue,
      totalCostBasis,
      totalGain,
      totalGainPercent,
      ytdPerformance,
      ytdPerformanceNum,
      weightedYtd,
      topHoldings,
      holdingCount: positionsData.filter(row => row.Ticker && row.Ticker !== "").length,
    };
  }, [positionsData, performanceData]);

  // Get column V value for daily movers
  const getColumnVValue = (row: any): number | null => {
    const columnVHeader = row._columnVHeader;
    if (columnVHeader) {
      return parseNumeric(row[columnVHeader] || "");
    }
    return parseNumeric(row["Daily PnL %"] || row["Daily PnL"] || "");
  };

  const topGainers = useMemo(() => {
    return positionsData
      .map(row => ({
        ticker: row.Ticker || row.Symbol || "",
        company: row.Name || row.Company || "",
        gain: getColumnVValue(row) || 0,
        value: parseNumeric(row["Market Value"] || row["Value"] || "0") || 0,
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
        value: parseNumeric(row["Market Value"] || row["Value"] || "0") || 0,
      }))
      .filter(item => item.ticker && item.ticker !== "")
      .sort((a, b) => a.gain - b.gain)
      .slice(0, 5);
  }, [positionsData]);

  // Sector allocation
  const sectorData = useMemo(() => {
    const sectorMap = new Map<string, { value: number; count: number }>();
    positionsData.forEach(row => {
      const sector = row.Sector || "Unknown";
      const marketValue = parseNumeric(row["Market Value"] || row["Value"] || "0") || 0;
      if (sector && sector !== "" && marketValue > 0) {
        const existing = sectorMap.get(sector) || { value: 0, count: 0 };
        sectorMap.set(sector, {
          value: existing.value + marketValue,
          count: existing.count + 1,
        });
      }
    });

    return Array.from(sectorMap.entries())
      .map(([name, data]) => ({ 
        name, 
        value: data.value, 
        count: data.count,
        percentage: portfolioMetrics.totalPortfolioValue > 0 
          ? (data.value / portfolioMetrics.totalPortfolioValue) * 100 
          : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [positionsData, portfolioMetrics.totalPortfolioValue]);

  // Performance comparison data (mock for now, can be enhanced with historical data)
  const performanceComparisonData = useMemo(() => {
    // Generate mock time series data for visualization
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const portfolioYtd = portfolioMetrics.ytdPerformanceNum || portfolioMetrics.weightedYtd || 0;
    
    return months.slice(0, currentMonth + 1).map((month, idx) => {
      const progress = (idx + 1) / (currentMonth + 1);
      return {
        month,
        Portfolio: portfolioYtd * progress,
        SPY: 12 * progress, // Mock benchmark
        QQQ: 18 * progress, // Mock benchmark
      };
    });
  }, [portfolioMetrics.ytdPerformanceNum, portfolioMetrics.weightedYtd]);

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
              <span className="text-slate-400 text-sm">
                {portfolioMetrics.ytdPerformanceNum !== null ? 'vs Benchmarks' : 'Weighted Average'}
              </span>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400 text-sm uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Value
            </CardDescription>
            <CardTitle className="text-3xl font-mono font-bold mt-2 text-slate-100">
              {formatCurrency(portfolioMetrics.totalPortfolioValue)}
            </CardTitle>
            <div className="text-slate-400 text-xs mt-2">
              {portfolioMetrics.holdingCount} holdings
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 via-green-900/20 to-slate-900 border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400 text-sm uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Gain
            </CardDescription>
            <CardTitle className={`text-3xl font-mono font-bold mt-2 ${
              portfolioMetrics.totalGain >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatCurrency(portfolioMetrics.totalGain)}
            </CardTitle>
            <div className={`text-xs mt-2 ${
              portfolioMetrics.totalGainPercent >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatPercentage(portfolioMetrics.totalGainPercent)}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Performance Comparison Chart */}
      <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Comparison (YTD)
          </CardTitle>
          <CardDescription className="text-slate-400">Portfolio vs Benchmarks</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceComparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSPY" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorQQQ" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis 
                dataKey="month" 
                stroke="#94a3b8" 
                style={{ fontSize: '12px' }}
                tick={{ fill: '#94a3b8' }}
              />
              <YAxis 
                stroke="#94a3b8" 
                style={{ fontSize: '12px' }}
                tick={{ fill: '#94a3b8' }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#e2e8f0'
                }}
                formatter={(value: number) => `${value.toFixed(2)}%`}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Area 
                type="monotone" 
                dataKey="Portfolio" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorPortfolio)" 
              />
              <Area 
                type="monotone" 
                dataKey="SPY" 
                stroke="#3b82f6" 
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1} 
                fill="url(#colorSPY)" 
              />
              <Area 
                type="monotone" 
                dataKey="QQQ" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1} 
                fill="url(#colorQQQ)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sector Allocation - Enhanced */}
        <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Sector Allocation
            </CardTitle>
            <CardDescription className="text-slate-400">By Market Value</CardDescription>
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
                    formatter={(value: number) => formatCurrency(value)}
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
                        {formatCurrency(sector.value)}
                      </div>
                      <div className="text-xs text-slate-400">
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
            <CardDescription className="text-slate-400">By Market Value</CardDescription>
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
                    <div className="text-sm font-mono font-semibold text-slate-100">
                      {formatCurrency(holding.value)}
                    </div>
                    <div className={`text-xs ${holding.ytd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercentage(holding.ytd)}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {holding.weight.toFixed(1)}%
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
                    <div className="text-xs text-slate-400">
                      {formatCurrency(item.value)}
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
                    <div className="text-xs text-slate-400">
                      {formatCurrency(item.value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CardDescription className="text-slate-400 text-xs uppercase">Cost Basis</CardDescription>
            <CardTitle className="text-2xl font-mono text-slate-100">
              {formatCurrency(portfolioMetrics.totalCostBasis)}
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
