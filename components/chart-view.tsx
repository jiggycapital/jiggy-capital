"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fetchSheetData, parseSheetData, fetchLogos, extractColumnCategories } from "@/lib/google-sheets";
import { parseNumeric } from "@/lib/utils";
import { Settings2, Download, Plus, BarChart3, TrendingUp, X } from "lucide-react";
import { CriteriaPicker } from "@/components/criteria-picker";
import { cn } from "@/lib/utils";

// Helper to normalize company names for robust ticker matching
function normalizeName(name: string): string {
  if (!name) return "";
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/corp$|inc$|ltd$|company$|co$/g, '');
}

export function ChartView() {
  const [positionsData, setPositionsData] = useState<any[]>([]);
  const [watchlistData, setWatchlistData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"positions" | "watchlist" | "combined">("positions");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [xAxisColumn, setXAxisColumn] = useState<string | undefined>(undefined);
  const [yAxisColumns, setYAxisColumns] = useState<string[]>([]);
  const [showCriteriaPicker, setShowCriteriaPicker] = useState(false);
  const [chartHeight, setChartHeight] = useState(500);
  const [columnCategories, setColumnCategories] = useState<Record<string, string>>({});
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [irLinks, setIrLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    const updateHeight = () => setChartHeight(window.innerWidth < 768 ? 350 : 600);
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [positionsRows, watchlistRows] = await Promise.all([
        fetchSheetData("positions"),
        fetchSheetData("watchlist"),
      ]);

      const categories = extractColumnCategories(positionsRows);
      setColumnCategories(categories);

      setPositionsData(parseSheetData(positionsRows));
      setWatchlistData(parseSheetData(watchlistRows));

      // Load logos and IR links
      const { logos: logosData, irLinks: irLinksData } = await fetchLogos();
      setLogos(logosData);
      setIrLinks(irLinksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  const currentData = useMemo(() => {
    if (activeTab === "positions") return positionsData;
    if (activeTab === "watchlist") return watchlistData;
    return [...positionsData, ...watchlistData];
  }, [activeTab, positionsData, watchlistData]);

  const allColumns = useMemo(() => {
    if (currentData.length === 0) return [];
    const keys = new Set<string>();
    currentData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key && key.trim() !== "" && !key.startsWith('_')) keys.add(key);
      });
    });
    return Array.from(keys);
  }, [currentData]);

  const numericColumns = useMemo(() => {
    return allColumns.filter(col => {
      if (currentData.length === 0) return false;
      const sampleValue = currentData.find(r => r[col])?.[col];
      return parseNumeric(String(sampleValue || "")) !== null;
    });
  }, [allColumns, currentData]);

  useEffect(() => {
    if (allColumns.length > 0 && (!xAxisColumn || xAxisColumn.trim() === "")) {
      const tickerCol = allColumns.find(c => c.toLowerCase().includes('ticker') || c.toLowerCase().includes('symbol'));
      setXAxisColumn(tickerCol || allColumns[0]);
    }
    if (yAxisColumns.length === 0 && numericColumns.length > 0) {
      const weightCol = numericColumns.find(c => c.toLowerCase().includes('weight') || c.toLowerCase().includes('market cap'));
      if (weightCol) setYAxisColumns([weightCol]);
    }
  }, [allColumns, numericColumns, xAxisColumn, yAxisColumns.length]);

  const chartData = useMemo(() => {
    if (!xAxisColumn || yAxisColumns.length === 0 || currentData.length === 0) return [];

    const data = currentData.map(row => {
      const tickerVal = row['Ticker'] || row['Symbol'] || row['TICKER'] || row['SYMBOL'];
      const dataPoint: any = {
        name: String(row[xAxisColumn] || ""),
        ticker: String(tickerVal || "").toUpperCase()
      };
      yAxisColumns.forEach(col => {
        let val = parseNumeric(String(row[col] || ""));

        // Normalize Market Cap and EV to Billions if they are in Millions
        if (val !== null && (col.toLowerCase().includes("market cap") || col.toLowerCase().includes("ev"))) {
          if (val > 10000) val = val / 1000;
        }

        dataPoint[col] = val !== null ? val : 0;
      });
      return dataPoint;
    }).filter(p => p.name && p.name !== "SUM" && p.name !== "CASH");

    // Sort descending by the first Y-axis metric
    const sortField = yAxisColumns[0];
    return data.sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));
  }, [currentData, xAxisColumn, yAxisColumns]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const ticker = payload[0].payload.ticker || label;
      const logoUrl = logos[ticker] || logos[ticker.toUpperCase()] || logos[normalizeName(label)];

      return (
        <div className="bg-jiggy-surface-2 border border-jiggy-tan/50 rounded-2xl p-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
          <div className="flex items-center justify-between gap-6 mb-3">
            <span className="text-slate-100 font-black text-sm tracking-tight uppercase">{ticker}</span>
            {logoUrl && (
              <div className="w-10 h-10 rounded-xl bg-terminal-bg p-1.5 border border-slate-700 shadow-inner flex items-center justify-center shrink-0">
                <img src={logoUrl} alt="" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => {
              const isMarketCap = entry.name.toLowerCase().includes('market cap') || entry.name.toLowerCase().includes('ev');
              const displayVal = isMarketCap
                ? (entry.value >= 1000 ? `${(entry.value / 1000).toFixed(2)}T` : `${entry.value.toFixed(1)}B`)
                : entry.name.toLowerCase().includes('percent') || entry.name.toLowerCase().includes('%')
                  ? `${entry.value.toFixed(2)}%`
                  : entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 });

              return (
                <div key={index} className="flex items-center justify-between gap-8">
                  <span className="text-slate-500 text-[10px] uppercase font-black tracking-widest">{entry.name}</span>
                  <span className="text-jiggy-neon font-mono text-sm font-black">
                    {displayVal}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const COLORS = ["#facc15", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#6366f1"];

  if (loading) return <div className="flex items-center justify-center min-h-[400px] text-slate-400">Loading chart data...</div>;
  if (error) return <div className="flex items-center justify-center min-h-[400px] text-red-400">Error: {error}</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-[var(--header-height)])] -m-6 sm:-m-8">
      {/* Top Control Bar - Glassmorphic Toolbar */}
      <div className="shrink-0 bg-[#0B0F19]/90 backdrop-blur-xl border-b border-jiggy-border shadow-2xl z-20">
        <div className="px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/20 border border-orange-500/30">
              <BarChart3 className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 tracking-tight">Financial Visualization</h2>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{currentData.length} Companies</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:gap-4">
            {/* Chart Type Toggles */}
            <div className="flex bg-terminal-bg rounded-xl p-1 border border-slate-800 shadow-inner">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "px-3 py-1 h-7 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg",
                  chartType === "line" ? "bg-orange-400 text-slate-950 shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                )}
                onClick={() => setChartType("line")}
              >
                Line
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "px-3 py-1 h-7 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg",
                  chartType === "bar" ? "bg-orange-400 text-slate-950 shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                )}
                onClick={() => setChartType("bar")}
              >
                Bar
              </Button>
            </div>

            <div className="w-px h-6 bg-slate-800 hidden md:block" />

            {/* Dataset Selection Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
              <TabsList className="bg-terminal-bg border border-slate-800 p-1 rounded-xl shadow-inner h-9">
                <TabsTrigger value="positions" className="data-[state=active]:bg-emerald-400 data-[state=active]:text-slate-950 text-[10px] uppercase tracking-wider font-black px-4 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-all">Holdings</TabsTrigger>
                <TabsTrigger value="watchlist" className="data-[state=active]:bg-emerald-400 data-[state=active]:text-slate-950 text-[10px] uppercase tracking-wider font-black px-4 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-all">Watchlist</TabsTrigger>
                <TabsTrigger value="combined" className="data-[state=active]:bg-emerald-400 data-[state=active]:text-slate-950 text-[10px] uppercase tracking-wider font-black px-4 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-all">Combined</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="w-px h-6 bg-slate-800 hidden lg:block" />

            {/* X-Axis Select */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Base:</span>
              <Select value={xAxisColumn} onValueChange={setXAxisColumn}>
                <SelectTrigger className="w-[120px] h-9 bg-terminal-bg border-slate-800 text-[11px] font-bold text-slate-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-jiggy-surface-2 border-jiggy-border rounded-xl">
                  {allColumns.map(col => (
                    <SelectItem key={col} value={col} className="text-xs font-bold text-slate-200 focus:bg-orange-500/10 focus:text-orange-400">{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Add Metrics Button */}
            <Button
              variant="outline"
              size="sm"
              className="bg-orange-500/10 hover:bg-orange-400 hover:text-slate-950 border border-orange-500/20 text-orange-400 font-black h-9 px-4 rounded-xl transition-all shadow-sm"
              onClick={() => setShowCriteriaPicker(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Metrics
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Full Bleed */}
      <div className="flex-1 overflow-auto flex flex-col bg-jiggy-base">
        {/* Active Metrics Bar */}
        <div className="px-6 py-4 bg-jiggy-surface-2 border-b border-jiggy-border flex flex-wrap items-center gap-2 min-h-[56px]">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">Plotting:</span>
          {yAxisColumns.length === 0 ? (
            <span className="text-[10px] font-bold text-slate-600 italic">No metrics selected.</span>
          ) : (
            yAxisColumns.map((col, idx) => (
              <div key={col} className="group relative flex items-center justify-between gap-3 px-3 py-1.5 bg-jiggy-surface border border-slate-800 rounded-xl overflow-hidden hover:pr-8 transition-all">
                <div className="absolute inset-0 opacity-10" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                <span className="text-[10px] font-black tracking-widest uppercase pl-1 text-slate-200 relative z-10">{col}</span>
                <button
                  onClick={() => setYAxisColumns(prev => prev.filter(c => c !== col))}
                  className="absolute right-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all z-20"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Chart Container */}
        <div className="p-6 pb-0 flex-1 min-h-[500px]">
          {chartData.length > 0 && yAxisColumns.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "line" ? (
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickMargin={15} angle={-45} textAnchor="end" />
                  <YAxis stroke="#475569" fontSize={10} tickFormatter={(val) => val > 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                  <Tooltip content={<CustomTooltip />} />
                  {yAxisColumns.map((col, index) => (
                    <Line key={col} type="monotone" dataKey={col} stroke={COLORS[index % COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#0f172a" }} activeDot={{ r: 6 }} animationDuration={1000} />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickMargin={15} angle={-45} textAnchor="end" />
                  <YAxis stroke="#475569" fontSize={10} tickFormatter={(val) => val > 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                  <Tooltip cursor={{ fill: "rgba(16, 185, 129, 0.1)" }} content={<CustomTooltip />} />
                  {yAxisColumns.map((col, index) => (
                    <Bar key={col} dataKey={col} fill={COLORS[index % COLORS.length]} radius={[8, 8, 0, 0]} animationDuration={1000} />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl mx-6 my-6">
              <TrendingUp className="h-12 w-12 mb-4 opacity-20" />
              <p>Select at least one metric to visualize performance</p>
              <Button variant="link" className="text-orange-400 font-bold" onClick={() => setShowCriteriaPicker(true)}>Open Metrics Picker</Button>
            </div>
          )}
        </div>

        {/* Data Summary Table */}
        {chartData.length > 0 && (
          <div className="border-t-2 border-slate-800/50 bg-jiggy-surface-2 pt-6 pb-20 px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6 max-w-[1400px] mx-auto">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 shadow-sm">
                  <TrendingUp className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-slate-100 text-base font-bold tracking-tight">Data Rankings</h3>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Performance Summary</p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-[1400px] mx-auto overflow-x-auto no-scrollbar rounded-2xl border border-jiggy-tan/50 shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-jiggy-surface border-b border-jiggy-tan/50">
                    <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-16">Rank</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Company</th>
                    {yAxisColumns.map((col) => (
                      <th key={col} className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-jiggy-tan/30 bg-jiggy-surface-2">
                  {chartData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800/30 border border-slate-700/50 group-hover:border-emerald-500/30 transition-all">
                          <span className="text-xs font-black text-slate-500 group-hover:text-emerald-400 leading-none">#{idx + 1}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative w-12 h-12 rounded-xl bg-terminal-bg flex items-center justify-center p-2 border border-slate-800 group-hover:border-emerald-500/50 transition-all shadow-inner overflow-hidden">
                              {logos[row.ticker] || logos[row.ticker?.toUpperCase()] || logos[normalizeName(row.name)] ? (
                                <img src={logos[row.ticker] || logos[row.ticker?.toUpperCase()] || logos[normalizeName(row.name)]} alt="" className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500 scale-90 group-hover:scale-100" onError={(e) => (e.target as any).style.display = 'none'} />
                              ) : (
                                <span className="text-[12px] font-black text-slate-600 group-hover:text-jiggy-neon">{row.name.substring(0, 2)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-200 group-hover:text-jiggy-neon transition-colors">{row.name}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider w-fit mt-1.5 ${irLinks[row.name] ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                              }`}>{irLinks[row.name] ? 'Public Equity' : 'Holding'}</span>
                          </div>
                        </div>
                      </td>
                      {yAxisColumns.map((col) => {
                        const isMarketCap = col.toLowerCase().includes('market cap') || col.toLowerCase().includes('ev');
                        const val = row[col];
                        const displayVal = isMarketCap
                          ? (val >= 1000 ? `${(val / 1000).toFixed(2)}T` : `${val.toFixed(1)}B`)
                          : col.toLowerCase().includes('percent') || col.toLowerCase().includes('%')
                            ? `${val.toFixed(2)}%`
                            : val.toLocaleString(undefined, { maximumFractionDigits: 2 });

                        return (
                          <td key={col} className="px-6 py-5 whitespace-nowrap text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-mono font-black text-slate-300 group-hover:text-jiggy-neon transition-colors">
                                {displayVal}
                              </span>
                              <div className="w-16 h-2 bg-slate-800 rounded-full mt-2 overflow-hidden shadow-inner">
                                <div
                                  className="h-full bg-emerald-500 opacity-40 group-hover:opacity-100 transition-all duration-1000"
                                  style={{ width: `${Math.min(100, (val / (chartData[0][col] || 1)) * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showCriteriaPicker && (
          <CriteriaPicker
            title="Select Chart Metrics"
            allCriteria={numericColumns}
            selectedCriteria={yAxisColumns}
            criteriaCategories={columnCategories}
            onClose={() => setShowCriteriaPicker(false)}
            onSave={(cols) => { setYAxisColumns(cols); setShowCriteriaPicker(false); }}
          />
        )}
      </div>
    </div>
  );
}
