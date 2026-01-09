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
      const dataPoint: any = { name: String(row[xAxisColumn] || "") };
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
      const ticker = label;
      const logoUrl = logos[ticker];

      return (
        <div className="bg-[#0f172a] border border-slate-700/50 rounded-xl p-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
          <div className="flex items-center justify-between gap-6 mb-3">
            <span className="text-slate-100 font-black text-sm tracking-tight uppercase">{ticker}</span>
            {logoUrl && (
              <div className="w-8 h-8 rounded-lg bg-slate-900 p-1.5 border border-slate-700 shadow-inner">
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
                  <span className="text-slate-500 text-[9px] uppercase font-black tracking-widest">{entry.name}</span>
                  <span className="text-blue-400 font-mono text-xs font-black">
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

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#6366f1"];

  if (loading) return <div className="flex items-center justify-center min-h-[400px] text-slate-400">Loading chart data...</div>;
  if (error) return <div className="flex items-center justify-center min-h-[400px] text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-[#0f172a] border-slate-800 shadow-2xl">
        <CardHeader className="p-6 border-b border-slate-800/50">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-600/20">
                <BarChart3 className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-slate-100 text-xl font-bold tracking-tight">Financial Visualization</CardTitle>
                <p className="text-xs text-slate-500 mt-1">Analyze {currentData.length} companies across metrics</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex bg-[#1e293b] rounded-lg p-1 border border-slate-700">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("px-3 h-8 text-[10px] font-bold uppercase tracking-widest transition-all", chartType === "line" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200")}
                  onClick={() => setChartType("line")}
                >
                  Line
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("px-3 h-8 text-[10px] font-bold uppercase tracking-widest transition-all", chartType === "bar" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200")}
                  onClick={() => setChartType("bar")}
                >
                  Bar
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">X-Axis:</span>
                <Select value={xAxisColumn} onValueChange={setXAxisColumn}>
                  <SelectTrigger className="w-[140px] h-9 bg-[#1e293b] border-slate-700 text-xs text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-slate-700">
                    {allColumns.map(col => (
                      <SelectItem key={col} value={col} className="text-xs text-slate-200">{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 border-none text-white font-bold"
                onClick={() => setShowCriteriaPicker(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Metrics
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="px-6 py-4 bg-[#0a0f1d] border-b border-slate-800 flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
              <TabsList className="bg-[#1e293b] border-slate-700">
                <TabsTrigger value="positions" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs font-bold px-4">Holdings</TabsTrigger>
                <TabsTrigger value="watchlist" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs font-bold px-4">Watchlist</TabsTrigger>
                <TabsTrigger value="combined" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs font-bold px-4">Combined</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 overflow-x-auto max-w-[500px] no-scrollbar">
              {yAxisColumns.map((col, idx) => (
                <div key={col} className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 group shrink-0">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">{col}</span>
                  <button onClick={() => setYAxisColumns(prev => prev.filter(c => c !== col))} className="text-slate-500 hover:text-rose-400">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            {chartData.length > 0 && yAxisColumns.length > 0 ? (
              <ResponsiveContainer width="100%" height={chartHeight}>
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
                    <Tooltip cursor={{ fill: "rgba(59, 130, 246, 0.1)" }} content={<CustomTooltip />} />
                    {yAxisColumns.map((col, index) => (
                      <Bar key={col} dataKey={col} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} animationDuration={1000} />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                <TrendingUp className="h-12 w-12 mb-4 opacity-20" />
                <p>Select at least one metric to visualize performance</p>
                <Button variant="link" className="text-blue-400 font-bold" onClick={() => setShowCriteriaPicker(true)}>Open Metrics Picker</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Summary Table */}
      {chartData.length > 0 && (
        <Card className="bg-[#0f172a] border-slate-800 shadow-2xl overflow-hidden mb-8">
          <CardHeader className="px-6 py-5 border-b border-slate-800/50 bg-[#0a0f1d]/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-slate-100 text-base font-bold tracking-tight">Data Rankings</CardTitle>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Performance Summary</p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase italic">{chartData.length} Companies Analyzed</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50">
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800/80 w-16">Rank</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800/80">Company</th>
                  {yAxisColumns.map((col) => (
                    <th key={col} className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800/80 text-right">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 bg-[#0f172a]">
                {chartData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-600/[0.03] transition-colors group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-800/30 border border-slate-700/50 group-hover:border-blue-500/30 transition-all">
                        <span className="text-[11px] font-black text-slate-400 group-hover:text-blue-400 leading-none">#{idx + 1}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-blue-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="relative w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center p-2 border border-slate-800 group-hover:border-blue-500/50 transition-all shadow-inner overflow-hidden">
                            {logos[row.name] ? (
                              <img src={logos[row.name]} alt="" className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500 scale-90 group-hover:scale-100" onError={(e) => (e.target as any).style.display = 'none'} />
                            ) : (
                              <span className="text-[11px] font-black text-slate-600 group-hover:text-blue-400">{row.name.substring(0, 2)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-200 group-hover:text-white transition-colors">{row.name}</span>
                          <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-400/70 transition-colors uppercase tracking-widest">{irLinks[row.name] ? 'Public Equity' : 'Holding'}</span>
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
                            <span className="text-xs font-mono font-black text-blue-400/90 group-hover:text-blue-400 transition-colors">
                              {displayVal}
                            </span>
                            <div className="w-12 h-[2px] bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                              <div
                                className="h-full bg-blue-500 opacity-30 group-hover:opacity-100 transition-all duration-1000"
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
          </CardContent>
        </Card>
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
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
