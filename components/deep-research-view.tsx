"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import { 
  fetchAllCompanyData, 
  getAllMetrics, 
  getAllQuarters, 
  categorizeMetrics, 
  getMetricsByCategory, 
  type CompanyFinancialData, 
  type MetricCategory 
} from "@/lib/financial-sheets";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import { Settings2, Download, Table as TableIcon, BarChart3, Layout, ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel, 
  flexRender, 
  type ColumnDef, 
  type SortingState 
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#6366f1",
  "#14b8a6", "#a855f7", "#f43f5e", "#22c55e", "#eab308"
];

type DisplayMode = "chart" | "split" | "table";

export function DeepResearchView() {
  const [companiesData, setCompaniesData] = useState<CompanyFinancialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("split");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  
  // Shared state
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | "all">("all");
  const [metricSearch, setMetricSearch] = useState<string>("");
  const [quarterVisibility, setQuarterVisibility] = useState<Record<string, boolean>>({});
  const [showSettings, setShowSettings] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await fetchAllCompanyData();
      setCompaniesData(data);
      
      if (data.length > 0) {
        const allMetrics = getAllMetrics(data);
        const netNewRevenueGrowth = allMetrics.find(m => 
          m.toLowerCase().includes("net new revenue growth")
        );
        const metricToSelect = netNewRevenueGrowth || allMetrics[0];
        setSelectedMetric(metricToSelect);
        
        // Auto-select companies that have this metric
        const companiesWithMetric = data
          .filter(company => company.metrics.some(m => m.metric === metricToSelect))
          .map(company => company.companyName)
          .slice(0, 5); // Select top 5 initially
        setSelectedCompanies(companiesWithMetric);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  const allCompanies = useMemo(() => {
    return companiesData.map(c => c.companyName).sort();
  }, [companiesData]);

  const allMetrics = useMemo(() => {
    return getAllMetrics(companiesData);
  }, [companiesData]);

  const metricCategories = useMemo(() => {
    return categorizeMetrics(companiesData);
  }, [companiesData]);

  const allQuarters = useMemo(() => {
    return getAllQuarters(companiesData);
  }, [companiesData]);

  // Initialize quarter visibility
  useEffect(() => {
    if (allQuarters.length > 0 && Object.keys(quarterVisibility).length === 0) {
      const initialVisibility: Record<string, boolean> = {};
      allQuarters.forEach(quarter => {
        const is2019_2020 = /Q[1-4]\s+(19|20)$/.test(quarter);
        initialVisibility[quarter] = !is2019_2020;
      });
      setQuarterVisibility(initialVisibility);
    }
  }, [allQuarters, quarterVisibility]);

  const visibleQuarters = useMemo(() => {
    return allQuarters.filter(quarter => quarterVisibility[quarter] !== false);
  }, [allQuarters, quarterVisibility]);

  const filteredMetrics = useMemo(() => {
    let metrics = allMetrics;
    if (selectedCategory !== "all") {
      metrics = getMetricsByCategory(companiesData, selectedCategory);
    }
    if (metricSearch) {
      const searchLower = metricSearch.toLowerCase();
      metrics = metrics.filter(m => m.toLowerCase().includes(searchLower));
    }
    return metrics;
  }, [allMetrics, selectedCategory, metricSearch, companiesData]);

  const companiesWithMetric = useMemo(() => {
    if (!selectedMetric) return allCompanies;
    return companiesData
      .filter(company => company.metrics.some(m => m.metric === selectedMetric))
      .map(company => company.companyName)
      .sort();
  }, [companiesData, selectedMetric, allCompanies]);

  // Prepare Chart Data
  const chartData = useMemo(() => {
    if (!selectedMetric || selectedCompanies.length === 0) return [];
    const dataPoints: Record<string, any> = {};
    visibleQuarters.forEach(quarter => { dataPoints[quarter] = { quarter }; });
    selectedCompanies.forEach(companyName => {
      const company = companiesData.find(c => c.companyName === companyName);
      if (!company) return;
      const metric = company.metrics.find(m => m.metric === selectedMetric);
      if (!metric) return;
      metric.data.forEach(point => {
        if (dataPoints[point.quarter]) dataPoints[point.quarter][companyName] = point.value;
      });
    });
    return Object.values(dataPoints).sort((a, b) => {
      const parseQ = (q: string) => {
        const m = q.match(/Q(\d)\s+(\d{2})/);
        return m ? parseInt(m[2]) * 4 + parseInt(m[1]) : 0;
      };
      return parseQ(a.quarter) - parseQ(b.quarter);
    });
  }, [selectedCompanies, selectedMetric, visibleQuarters, companiesData]);

  // Table logic
  const tableData = useMemo(() => {
    if (!selectedMetric || selectedCompanies.length === 0) return [];
    return selectedCompanies.map(companyName => {
      const company = companiesData.find(c => c.companyName === companyName);
      const row: any = { company: companyName };
      if (company) {
        const metric = company.metrics.find(m => m.metric === selectedMetric);
        if (metric) metric.data.forEach(p => { row[p.quarter] = p.value; });
      }
      return row;
    });
  }, [selectedCompanies, selectedMetric, companiesData]);

  const isPercentage = useMemo(() => {
    if (!selectedMetric) return false;
    const m = selectedMetric.toLowerCase();
    return m.endsWith("growth") || m.includes("%") || m.includes("margin") || m.includes("roic") || m.includes("roe");
  }, [selectedMetric]);

  const isCurrency = useMemo(() => {
    if (!selectedMetric) return false;
    const m = selectedMetric.toLowerCase();
    return !isPercentage && (m.includes("revenue") || m.includes("income") || m.includes("cash") || m.includes("ebitda") || m.includes("profit") || m.includes("debt"));
  }, [selectedMetric, isPercentage]);

  const columns = useMemo<ColumnDef<any>[]>(() => {
    const base: ColumnDef<any>[] = [{
      accessorKey: "company",
      header: "Company",
      cell: ({ row }) => <span className="font-bold">{row.original.company}</span>,
    }];
    const quarters = visibleQuarters.map(q => ({
      accessorKey: q,
      header: q,
      cell: ({ row }: any) => {
        const val = row.original[q];
        if (val === null || val === undefined) return <span className="text-slate-500">-</span>;
        if (isPercentage) {
          const color = val > 0 ? "text-green-400" : val < 0 ? "text-red-400" : "text-slate-300";
          return <span className={cn(color, "font-mono")}>{formatPercentage(val)}</span>;
        }
        return <span className="text-slate-300 font-mono">{isCurrency ? formatCurrency(val) : formatNumber(val)}</span>;
      },
    }));
    return [...base, ...quarters];
  }, [visibleQuarters, isPercentage, isCurrency]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleExport = () => {
    if (chartData.length === 0) return;
    const headers = ["Quarter", ...selectedCompanies];
    const rows = chartData.map(point => [point.quarter, ...selectedCompanies.map(c => point[c] ?? "")].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deep-research-${selectedMetric}.csv`;
    a.click();
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px] text-slate-400">Loading Deep Research data...</div>;
  if (error) return <div className="p-8 text-rose-400 bg-rose-400/10 rounded-xl border border-rose-400/20">{error}</div>;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header with Toggle */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            <Database className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase">Deep Research</h1>
            <p className="text-slate-500 font-medium">Multi-company financial time series analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDisplayMode("chart")}
            className={cn("gap-2 px-4 rounded-lg", displayMode === "chart" ? "bg-blue-600 text-white hover:bg-blue-700" : "text-slate-400")}
          >
            <BarChart3 className="h-4 w-4" />
            Chart
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDisplayMode("split")}
            className={cn("gap-2 px-4 rounded-lg", displayMode === "split" ? "bg-blue-600 text-white hover:bg-blue-700" : "text-slate-400")}
          >
            <Layout className="h-4 w-4" />
            Chart + Table
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDisplayMode("table")}
            className={cn("gap-2 px-4 rounded-lg", displayMode === "table" ? "bg-blue-600 text-white hover:bg-blue-700" : "text-slate-400")}
          >
            <TableIcon className="h-4 w-4" />
            Table
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Settings */}
        <div className={cn("lg:col-span-3 space-y-6", !showSettings && "hidden lg:block")}>
          <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden sticky top-6">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs">Configuration</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500" onClick={() => setShowSettings(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardContent className="p-4 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Chart Type</label>
                  <Select value={chartType} onValueChange={(v: any) => setChartType(v)}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Metric Category</label>
                  <Select value={selectedCategory} onValueChange={(v: any) => { setSelectedCategory(v); setSelectedMetric(""); }}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="universal">Universal</SelectItem>
                      <SelectItem value="segment">Segment-Specific</SelectItem>
                      <SelectItem value="company-specific">Company-Specific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Search Metric</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <Input 
                      placeholder="Filter metrics..." 
                      className="pl-9 bg-slate-900 border-slate-800 h-10"
                      value={metricSearch}
                      onChange={(e) => setMetricSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Select Metric</label>
                  <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 h-10 overflow-hidden">
                      <SelectValue placeholder="Select a metric" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 max-h-[400px]">
                      {filteredMetrics.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Companies</label>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedCompanies(companiesWithMetric)} className="text-[9px] text-blue-400 hover:text-blue-300 font-bold uppercase">All</button>
                    <button onClick={() => setSelectedCompanies([])} className="text-[9px] text-slate-500 hover:text-rose-400 font-bold uppercase">None</button>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1 pr-2 custom-scrollbar border border-slate-800/50 rounded-lg p-2 bg-slate-900/30">
                  {companiesWithMetric.map(c => (
                    <div key={c} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800/50 transition-colors">
                      <Checkbox 
                        id={`c-${c}`} 
                        checked={selectedCompanies.includes(c)} 
                        onCheckedChange={(checked) => {
                          setSelectedCompanies(prev => checked ? [...prev, c] : prev.filter(x => x !== c));
                        }}
                        className="border-slate-700"
                      />
                      <label htmlFor={`c-${c}`} className="text-xs text-slate-300 cursor-pointer flex-1 truncate">{c}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <Button variant="outline" className="w-full bg-slate-900 border-slate-800 text-slate-400 hover:text-white" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className={cn("space-y-6", showSettings ? "lg:col-span-9" : "lg:col-span-12")}>
          {!showSettings && (
            <Button variant="outline" className="bg-slate-900 border-slate-800 mb-2" onClick={() => setShowSettings(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Show Settings
            </Button>
          )}

          {selectedCompanies.length > 0 && selectedMetric ? (
            <>
              {/* Chart Section */}
              {(displayMode === "chart" || displayMode === "split") && (
                <Card className="bg-slate-950 border-slate-800 shadow-2xl overflow-hidden">
                  <CardHeader className="p-6 border-b border-slate-800/50 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-white tracking-tight">{selectedMetric}</CardTitle>
                      <p className="text-xs text-slate-500 mt-1">{selectedCompanies.length} companies selected</p>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                          <Settings2 className="h-4 w-4 mr-2" />
                          Quarters
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 bg-slate-900 border-slate-800">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-200 uppercase">Quarter Visibility</h4>
                            <div className="flex gap-2">
                              <button onClick={() => setQuarterVisibility(allQuarters.reduce((acc, q) => ({...acc, [q]: true}), {}))} className="text-[9px] text-blue-400 uppercase font-bold">All</button>
                              <button onClick={() => setQuarterVisibility(allQuarters.reduce((acc, q) => ({...acc, [q]: false}), {}))} className="text-[9px] text-slate-500 uppercase font-bold">None</button>
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
                            {allQuarters.map(q => (
                              <div key={q} className="flex items-center gap-2">
                                <Checkbox 
                                  id={`q-${q}`} 
                                  checked={quarterVisibility[q] !== false} 
                                  onCheckedChange={(checked) => setQuarterVisibility(prev => ({...prev, [q]: !!checked}))}
                                />
                                <label htmlFor={`q-${q}`} className="text-xs text-slate-300">{q}</label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-[500px]">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === "line" ? (
                          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="quarter" stroke="#475569" fontSize={10} tickMargin={15} angle={-45} textAnchor="end" />
                            <YAxis 
                              stroke="#475569" 
                              fontSize={10} 
                              tickFormatter={(v) => isPercentage ? formatPercentage(v) : isCurrency ? formatCurrency(v) : formatNumber(v)} 
                            />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px" }}
                              formatter={(v: any) => [isPercentage ? formatPercentage(v) : isCurrency ? formatCurrency(v) : formatNumber(v)]}
                            />
                            <Legend wrapperStyle={{ paddingTop: "20px" }} />
                            {selectedCompanies.map((c, i) => (
                              <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#0f172a" }} activeDot={{ r: 6 }} />
                            ))}
                          </LineChart>
                        ) : (
                          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="quarter" stroke="#475569" fontSize={10} tickMargin={15} angle={-45} textAnchor="end" />
                            <YAxis 
                              stroke="#475569" 
                              fontSize={10} 
                              tickFormatter={(v) => isPercentage ? formatPercentage(v) : isCurrency ? formatCurrency(v) : formatNumber(v)} 
                            />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px" }}
                              formatter={(v: any) => [isPercentage ? formatPercentage(v) : isCurrency ? formatCurrency(v) : formatNumber(v)]}
                            />
                            <Legend wrapperStyle={{ paddingTop: "20px" }} />
                            {selectedCompanies.map((c, i) => (
                              <Bar key={c} dataKey={c} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                            ))}
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Table Section */}
              {(displayMode === "table" || displayMode === "split") && (
                <Card className="bg-slate-950 border-slate-800 shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs">Data Table</h3>
                  </div>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto relative">
                      <Table>
                        <TableHeader className="bg-slate-900 sticky top-0 z-10">
                          {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-slate-800 hover:bg-transparent">
                              {headerGroup.headers.map((header) => (
                                <TableHead key={header.id} className="text-slate-400 font-bold py-4">
                                  <div 
                                    className="flex items-center gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors"
                                    onClick={header.column.getToggleSortingHandler()}
                                  >
                                    <span className="whitespace-normal leading-tight text-[10px] uppercase tracking-widest">
                                      {flexRender(header.column.columnDef.header, header.getContext())}
                                    </span>
                                  </div>
                                </TableHead>
                              ))}
                            </TableRow>
                          ))}
                        </TableHeader>
                        <TableBody>
                          {table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors group">
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id} className="py-3 font-mono text-xs">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[600px] border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20 text-slate-500">
              <Database className="h-16 w-16 mb-4 opacity-10" />
              <p className="text-lg font-bold text-slate-400 italic">Select companies and a metric to begin research</p>
              <p className="text-sm mt-2">Use the configuration panel on the left to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Database({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5V19A9 3 0 0 0 21 19V5"/>
      <path d="M3 12A9 3 0 0 0 21 12"/>
    </svg>
  );
}
