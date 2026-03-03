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
import { fetchLogos, fetchSheetData, parseSheetData } from "@/lib/google-sheets";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import { Settings2, Download, Table as TableIcon, BarChart3, Layout, ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCompanyLogos } from "@/hooks/use-company-logos";
import { CompanyPicker } from "@/components/company-picker";
import { CriteriaPicker } from "@/components/criteria-picker";
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

// Normalize names for robust mapping (e.g. "Nvidia" -> "nvidia", "NVIDIA Corp" -> "nvidia")
function normalizeName(name: string): string {
  if (!name) return "";
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/corp$|inc$|ltd$|company$|co$/g, '');
}

type DisplayMode = "chart" | "split" | "table";

export function DeepResearchView() {
  const [companiesData, setCompaniesData] = useState<CompanyFinancialData[]>([]);
  const [nameToTickerMap, setNameToTickerMap] = useState<Record<string, string>>({});
  const [sheetLogos, setSheetLogos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("split");
  const [chartType, setChartType] = useState<"line" | "bar">("line");

  // Dual-Mode State
  const [researchMode, setResearchMode] = useState<"multi-company" | "single-company">("multi-company");

  // Multi-Company State
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("");

  // Single-Company State
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

  // Shared Filters
  const [quarterVisibility, setQuarterVisibility] = useState<Record<string, boolean>>({});
  const [sorting, setSorting] = useState<SortingState>([]);

  // Pickers State
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [showCriteriaPicker, setShowCriteriaPicker] = useState(false);
  const [metricCategoriesMap, setMetricCategoriesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [data, logosResult, portfolioRows] = await Promise.all([
        fetchAllCompanyData(),
        fetchLogos(),
        fetchSheetData("portfolio")
      ]);
      setCompaniesData(data);

      const positions = parseSheetData(portfolioRows);

      // Build a robust name -> ticker mapping
      const augmentedTickerMap: Record<string, string> = {};

      // 1. Start with the mapping from the Logos sheet
      Object.entries(logosResult.companyNameToTicker).forEach(([name, ticker]) => {
        augmentedTickerMap[name] = ticker;
        augmentedTickerMap[normalizeName(name)] = ticker;
      });

      // 2. Augment with data from the master Positions sheet for 100% accuracy
      if (positions && positions.length > 0) {
        positions.forEach(row => {
          const ticker = (row.Ticker || row.Symbol || "").toUpperCase();
          const name = row.Name || row.Company || "";

          if (ticker && ticker !== "CASH" && ticker !== "SUM") {
            if (name) {
              augmentedTickerMap[name] = ticker;
              augmentedTickerMap[normalizeName(name)] = ticker;
            }
            augmentedTickerMap[ticker] = ticker;
            augmentedTickerMap[normalizeName(ticker)] = ticker;
          }
        });
      }

      setNameToTickerMap(augmentedTickerMap);
      setSheetLogos(logosResult.logos);

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

        // Auto-select for single-company mode
        const firstCompany = data[0]?.companyName;
        if (firstCompany) {
          setSelectedCompany(firstCompany);
          const companyMetrics = data[0].metrics.map(m => m.metric).slice(0, 3);
          setSelectedMetrics(companyMetrics);
        }
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

  useEffect(() => {
    // Determine categories for CriteriaPicker mapping
    const flatMap: Record<string, string> = {};
    const categorized = categorizeMetrics(companiesData);
    categorized.forEach(info => {
      flatMap[info.metric] = info.category;
    });
    setMetricCategoriesMap(flatMap);

    if (companiesData.length > 0 && selectedCompanies.length === 0) {
      setSelectedCompanies([companiesData[0].companyName, companiesData[1]?.companyName].filter(Boolean) as string[]);
    }
    if (companiesData.length > 0 && !selectedCompany) {
      setSelectedCompany(companiesData[0].companyName);
      setSelectedMetrics(companiesData[0].metrics.map(m => m.metric).slice(0, 3));
    }
  }, [companiesData]);

  // Derive tickers for active companies to fetch logos
  const activeTickers = useMemo(() => {
    return companiesData
      .filter(c =>
        researchMode === "multi-company"
          ? selectedCompanies.includes(c.companyName)
          : c.companyName === selectedCompany
      )
      .map(c => nameToTickerMap[normalizeName(c.companyName)] || nameToTickerMap[c.companyName] || c.ticker)
      .filter(Boolean) as string[];
  }, [companiesData, selectedCompanies, selectedCompany, researchMode, nameToTickerMap]);

  // Fetch logos — Google Sheet transparent PNGs are the primary source
  const { logos } = useCompanyLogos(activeTickers, sheetLogos);

  // Custom legend renderer with company logos for multi-company mode
  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    if (!payload) return null;
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-5">
        {payload.map((entry: any, index: number) => {
          const companyName = entry.value;
          const ticker = nameToTickerMap[normalizeName(companyName)] || nameToTickerMap[companyName];
          const logoUrl = ticker ? logos[ticker] : null;
          return (
            <div key={`legend-${index}`} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              {researchMode === "multi-company" && logoUrl ? (
                <img src={logoUrl} alt={companyName} className="h-5 w-5 object-contain" />
              ) : null}
              <span className="text-xs font-bold text-slate-300">{companyName}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const visibleQuarters = useMemo(() => {
    return allQuarters.filter(quarter => quarterVisibility[quarter] !== false);
  }, [allQuarters, quarterVisibility]);

  // Calculate all unique metrics for single-company mode
  const allMetricsForCriteriaPicker = useMemo(() => {
    return getAllMetrics(companiesData);
  }, [companiesData]);

  const filteredMetrics = useMemo(() => {
    let metrics = allMetrics;
    // Note: selectedCategory and metricSearch are not defined in the provided context,
    // assuming they are part of a larger component state not included in the diff.
    // For now, they are commented out or assumed to be handled elsewhere.
    // if (selectedCategory !== "all") {
    //   metrics = getMetricsByCategory(companiesData, selectedCategory);
    // }
    // if (metricSearch) {
    //   const searchLower = metricSearch.toLowerCase();
    //   metrics = metrics.filter(m => m.toLowerCase().includes(searchLower));
    // }
    return metrics;
  }, [allMetrics, companiesData]); // Removed selectedCategory, metricSearch

  const companiesWithMetric = useMemo(() => {
    if (!selectedMetric) return allCompanies;
    return companiesData
      .filter(company => company.metrics.some(m => m.metric === selectedMetric))
      .map(company => company.companyName)
      .sort();
  }, [companiesData, selectedMetric, allCompanies]);

  // Prepare Chart Data
  const chartData = useMemo(() => {
    if (researchMode === "multi-company") {
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
    } else {
      if (!selectedCompany || selectedMetrics.length === 0) return [];
      const dataPoints: Record<string, any> = {};
      visibleQuarters.forEach(quarter => { dataPoints[quarter] = { quarter }; });
      const company = companiesData.find(c => c.companyName === selectedCompany);
      if (company) {
        selectedMetrics.forEach(metricName => {
          const metric = company.metrics.find(m => m.metric === metricName);
          if (metric) {
            metric.data.forEach(point => {
              if (dataPoints[point.quarter]) dataPoints[point.quarter][metricName] = point.value;
            });
          }
        });
      }
      return Object.values(dataPoints).sort((a, b) => {
        const parseQ = (q: string) => {
          const m = q.match(/Q(\d)\s+(\d{2})/);
          return m ? parseInt(m[2]) * 4 + parseInt(m[1]) : 0;
        };
        return parseQ(a.quarter) - parseQ(b.quarter);
      });
    }
  }, [researchMode, selectedCompanies, selectedMetric, selectedCompany, selectedMetrics, visibleQuarters, companiesData]);

  // Table logic
  const tableData = useMemo(() => {
    if (researchMode === "multi-company") {
      if (!selectedMetric || selectedCompanies.length === 0) return [];
      return selectedCompanies.map(companyName => {
        const company = companiesData.find(c => c.companyName === companyName);
        const row: any = { id: companyName, name: companyName };
        if (company) {
          const metric = company.metrics.find(m => m.metric === selectedMetric);
          if (metric) metric.data.forEach(p => { row[p.quarter] = p.value; });
        }
        return row;
      });
    } else {
      if (!selectedCompany || selectedMetrics.length === 0) return [];
      const company = companiesData.find(c => c.companyName === selectedCompany);
      if (!company) return [];
      return selectedMetrics.map(metricName => {
        const row: any = { id: metricName, name: metricName };
        const metric = company.metrics.find(m => m.metric === metricName);
        if (metric) metric.data.forEach(p => { row[p.quarter] = p.value; });
        return row;
      });
    }
  }, [researchMode, selectedCompanies, selectedMetric, selectedCompany, selectedMetrics, companiesData]);

  const isPercentage = useMemo(() => {
    if (researchMode === "multi-company") {
      if (!selectedMetric) return false;
      const m = selectedMetric.toLowerCase();
      return m.endsWith("growth") || m.includes("%") || m.includes("margin") || m.includes("roic") || m.includes("roe");
    } else {
      if (selectedMetrics.length === 0) return false;
      return selectedMetrics.every(m => {
        const lower = m.toLowerCase();
        return lower.endsWith("growth") || lower.includes("%") || lower.includes("margin") || lower.includes("roic") || lower.includes("roe");
      });
    }
  }, [researchMode, selectedMetric, selectedMetrics]);

  const isCurrency = useMemo(() => {
    if (researchMode === "multi-company") {
      if (!selectedMetric) return false;
      const m = selectedMetric.toLowerCase();
      const isPerc = m.endsWith("growth") || m.includes("%") || m.includes("margin") || m.includes("roic") || m.includes("roe");
      return !isPerc && (m.includes("revenue") || m.includes("income") || m.includes("cash") || m.includes("ebitda") || m.includes("profit") || m.includes("debt"));
    } else {
      if (selectedMetrics.length === 0) return false;
      return selectedMetrics.every(metric => {
        const m = metric.toLowerCase();
        const isPerc = m.endsWith("growth") || m.includes("%") || m.includes("margin") || m.includes("roic") || m.includes("roe");
        return !isPerc && (m.includes("revenue") || m.includes("income") || m.includes("cash") || m.includes("ebitda") || m.includes("profit") || m.includes("debt"));
      });
    }
  }, [researchMode, selectedMetric, selectedMetrics]);

  const columns = useMemo<ColumnDef<any>[]>(() => {
    const base: ColumnDef<any>[] = [{
      accessorKey: "name",
      header: researchMode === "multi-company" ? "Company" : "Metric",
      cell: ({ row }) => {
        if (researchMode === "multi-company") {
          const companyName = row.original.name;
          const companyData = companiesData.find(c => c.companyName === companyName);
          const ticker = nameToTickerMap[normalizeName(companyName)] || nameToTickerMap[companyName] || companyData?.ticker;
          const logoUrl = ticker ? logos[ticker] : null;

          return (
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={ticker} className="w-6 h-6 object-contain animate-in fade-in transition-opacity" />
              ) : (
                <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-slate-500">{ticker?.slice(0, 2) || companyName.slice(0, 2).toUpperCase()}</span>
                </div>
              )}
              <span className="font-bold text-slate-200">{companyName}</span>
            </div>
          );
        }

        // Single-Company Mode (Metric Row)
        return <span className="font-bold text-slate-200">{row.original.name}</span>;
      },
    }];
    const quarters = visibleQuarters.map(q => ({
      accessorKey: q,
      header: q,
      cell: ({ row }: any) => {
        const val = row.original[q];
        if (val === null || val === undefined) return <span className="text-slate-500">-</span>;

        const metricName = researchMode === "multi-company" ? selectedMetric.toLowerCase() : row.original.name.toLowerCase();
        const isPerc = metricName.endsWith("growth") || metricName.includes("%") || metricName.includes("margin") || metricName.includes("roic") || metricName.includes("roe");
        const isCurr = !isPerc && (metricName.includes("revenue") || metricName.includes("income") || metricName.includes("cash") || metricName.includes("ebitda") || metricName.includes("profit") || metricName.includes("debt"));

        if (isPerc) {
          const color = val > 0 ? "text-jiggy-neon" : val < 0 ? "text-rose-400" : "text-slate-300";
          return <span className={cn(color, "font-mono font-bold")}>{formatPercentage(val)}</span>;
        }
        return <span className="text-slate-300 font-mono font-bold">{isCurr ? formatCurrency(val) : formatNumber(val)}</span>;
      },
    }));
    return [...base, ...quarters];
  }, [visibleQuarters, researchMode, selectedMetric, companiesData, nameToTickerMap, logos]);

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

  const hasDataForDisplay = (researchMode === "multi-company" && selectedCompanies.length > 0 && selectedMetric) ||
    (researchMode === "single-company" && selectedCompany && selectedMetrics.length > 0);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header with Toggle */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-jiggy-gold shadow-[0_0_20px_rgba(255,183,77,0.3)]">
            <Database className="h-6 w-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase">Deep Research</h1>
            <p className="text-slate-500 font-medium">Multi-company financial time series analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-jiggy-surface border border-jiggy-border p-1 rounded-xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDisplayMode("chart")}
            className={cn("gap-2 px-4 rounded-lg", displayMode === "chart" ? "bg-jiggy-gold text-slate-900 hover:bg-jiggy-gold-alt font-black" : "text-slate-400")}
          >
            <BarChart3 className="h-4 w-4" />
            Chart
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDisplayMode("split")}
            className={cn("gap-2 px-4 rounded-lg", displayMode === "split" ? "bg-jiggy-gold text-slate-900 hover:bg-jiggy-gold-alt font-black" : "text-slate-400")}
          >
            <Layout className="h-4 w-4" />
            Chart + Table
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDisplayMode("table")}
            className={cn("gap-2 px-4 rounded-lg", displayMode === "table" ? "bg-jiggy-gold text-slate-900 hover:bg-jiggy-gold-alt font-black" : "text-slate-400")}
          >
            <TableIcon className="h-4 w-4" />
            Table
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Top Control Bar */}
        <div className="bg-jiggy-surface-2/80 backdrop-blur-md border border-jiggy-border rounded-xl p-3 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-xl z-20 sticky top-4">

          <div className="flex items-center gap-2 bg-[#0B0F19]/80 backdrop-blur-md rounded-xl p-1.5 border border-slate-800/60 shadow-inner overflow-x-auto w-full lg:w-auto">
            <button
              className={cn(
                "px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all rounded-lg whitespace-nowrap",
                researchMode === "multi-company" ? "bg-emerald-400 text-slate-950 shadow-md" : "text-slate-500 hover:text-slate-300"
              )}
              onClick={() => setResearchMode("multi-company")}
            >
              Multi-Company
            </button>
            <button
              className={cn(
                "px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all rounded-lg whitespace-nowrap",
                researchMode === "single-company" ? "bg-emerald-400 text-slate-950 shadow-md" : "text-slate-500 hover:text-slate-300"
              )}
              onClick={() => setResearchMode("single-company")}
            >
              Single Company
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Companies Button */}
            <Button
              variant="outline"
              className="bg-jiggy-surface border-jiggy-tan/50 hover:bg-jiggy-surface-2 text-slate-200 h-11 px-4 rounded-xl shadow-lg transition-all"
              onClick={() => setShowCompanyPicker(true)}
            >
              <div className="flex items-center gap-3">
                {researchMode === "single-company" && selectedCompany ? (
                  (() => {
                    const companyData = companiesData.find(c => c.companyName === selectedCompany);
                    const t = nameToTickerMap[normalizeName(selectedCompany)] || nameToTickerMap[selectedCompany] || companyData?.ticker;
                    const l = t ? logos[t] : null;
                    return l ? <img src={l} alt="Logo" className="w-5 h-5 object-contain" /> : <div className="w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-[8px]">{selectedCompany.substring(0, 2)}</div>;
                  })()
                ) : (
                  <Database className="h-4 w-4 text-emerald-400" />
                )}
                <div className="flex flex-col items-start text-left">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">Companies</span>
                  <span className="text-sm font-bold leading-none truncate max-w-[150px]">
                    {researchMode === "single-company" ? (selectedCompany || "Select Company") : `${selectedCompanies.length} Selected`}
                  </span>
                </div>
              </div>
            </Button>

            {/* Metrics Button */}
            <Button
              variant="outline"
              className="bg-jiggy-surface border-jiggy-tan/50 hover:bg-jiggy-surface-2 text-slate-200 h-11 px-4 rounded-xl shadow-lg transition-all"
              onClick={() => setShowCriteriaPicker(true)}
            >
              <div className="flex items-center gap-3">
                <Settings2 className="h-4 w-4 text-emerald-400" />
                <div className="flex flex-col items-start text-left">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">Metrics</span>
                  <span className="text-sm font-bold leading-none truncate max-w-[150px]">
                    {researchMode === "multi-company" ? (selectedMetric || "Select Metric") : `${selectedMetrics.length} Selected`}
                  </span>
                </div>
              </div>
            </Button>

            <div className="h-8 w-px bg-jiggy-border mx-1 hidden sm:block" />

            {/* Chart Type Config */}
            <div className="flex items-center gap-2">
              <Select value={chartType} onValueChange={(v: any) => setChartType(v)}>
                <SelectTrigger className="w-[120px] bg-terminal-bg border-jiggy-border h-11 rounded-xl focus:ring-emerald-400 text-xs font-bold text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-terminal-bg border-jiggy-border rounded-xl shadow-2xl">
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="ghost" size="icon" className="h-11 w-11 bg-terminal-bg border border-jiggy-border text-slate-400 hover:text-white rounded-xl ml-auto lg:ml-0" onClick={handleExport} title="Export CSV">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          {hasDataForDisplay ? (
            <>
              {/* Chart Section */}
              {(displayMode === "chart" || displayMode === "split") && (
                <Card className="bg-jiggy-surface border-jiggy-border rounded-2xl shadow-2xl overflow-hidden">
                  <CardHeader className="p-6 border-b border-jiggy-border flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                        {researchMode === "multi-company" ? (
                          selectedMetric
                        ) : (
                          <>
                            {(() => {
                              const companyData = companiesData.find(c => c.companyName === selectedCompany);
                              const ticker = nameToTickerMap[normalizeName(selectedCompany)] || nameToTickerMap[selectedCompany] || companyData?.ticker;
                              const logoUrl = ticker ? logos[ticker] : null;
                              return logoUrl ? (
                                <img src={logoUrl} alt={selectedCompany} className="h-8 w-auto object-contain drop-shadow-lg" />
                              ) : null;
                            })()}
                            <span>{selectedCompany}</span>
                          </>
                        )}
                      </CardTitle>
                      <p className="text-xs font-bold text-slate-500 mt-1">
                        {researchMode === "multi-company"
                          ? `${selectedCompanies.length} companies selected`
                          : `${selectedMetrics.length} metrics selected`}
                      </p>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white font-bold">
                          <Settings2 className="h-4 w-4 mr-2" />
                          Quarters
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 bg-jiggy-surface border-jiggy-border">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-slate-200 uppercase">Quarter Visibility</h4>
                            <div className="flex gap-2">
                              <button onClick={() => setQuarterVisibility(allQuarters.reduce((acc, q) => ({ ...acc, [q]: true }), {}))} className="text-[9px] text-jiggy-gold hover:text-jiggy-gold-alt uppercase font-black">All</button>
                              <button onClick={() => setQuarterVisibility(allQuarters.reduce((acc, q) => ({ ...acc, [q]: false }), {}))} className="text-[9px] text-slate-500 hover:text-rose-400 uppercase font-black">None</button>
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
                            {allQuarters.map(q => (
                              <div key={q} className="flex items-center gap-2">
                                <Checkbox
                                  id={`q-${q}`}
                                  checked={quarterVisibility[q] !== false}
                                  onCheckedChange={(checked) => setQuarterVisibility(prev => ({ ...prev, [q]: !!checked }))}
                                  className="border-slate-600 data-[state=checked]:bg-jiggy-gold data-[state=checked]:text-slate-900"
                                />
                                <label htmlFor={`q-${q}`} className="text-xs font-bold text-slate-400">{q}</label>
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
                              formatter={(v: any, name: string) => {
                                let isPerc = false;
                                let isCurr = false;
                                if (researchMode === "multi-company") {
                                  isPerc = isPercentage;
                                  isCurr = isCurrency;
                                } else {
                                  const m = name.toLowerCase();
                                  isPerc = m.endsWith("growth") || m.includes("%") || m.includes("margin") || m.includes("roic") || m.includes("roe");
                                  isCurr = !isPerc && (m.includes("revenue") || m.includes("income") || m.includes("cash") || m.includes("ebitda") || m.includes("profit") || m.includes("debt"));
                                }
                                return [isPerc ? formatPercentage(v) : isCurr ? formatCurrency(v) : formatNumber(v)];
                              }}
                            />
                            <Legend content={renderCustomLegend} />
                            {researchMode === "multi-company" ? (
                              selectedCompanies.map((c, i) => (
                                <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#0f172a" }} activeDot={{ r: 6 }} />
                              ))
                            ) : (
                              selectedMetrics.map((m, i) => (
                                <Line key={m} type="monotone" dataKey={m} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#0f172a" }} activeDot={{ r: 6 }} />
                              ))
                            )}
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
                              formatter={(v: any, name: string) => {
                                let isPerc = false;
                                let isCurr = false;
                                if (researchMode === "multi-company") {
                                  isPerc = isPercentage;
                                  isCurr = isCurrency;
                                } else {
                                  const m = name.toLowerCase();
                                  isPerc = m.endsWith("growth") || m.includes("%") || m.includes("margin") || m.includes("roic") || m.includes("roe");
                                  isCurr = !isPerc && (m.includes("revenue") || m.includes("income") || m.includes("cash") || m.includes("ebitda") || m.includes("profit") || m.includes("debt"));
                                }
                                return [isPerc ? formatPercentage(v) : isCurr ? formatCurrency(v) : formatNumber(v)];
                              }}
                            />
                            <Legend content={renderCustomLegend} />
                            {researchMode === "multi-company" ? (
                              selectedCompanies.map((c, i) => (
                                <Bar key={c} dataKey={c} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                              ))
                            ) : (
                              selectedMetrics.map((m, i) => (
                                <Bar key={m} dataKey={m} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                              ))
                            )}
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Table Section */}
              {(displayMode === "table" || displayMode === "split") && hasDataForDisplay && (
                <Card className="bg-jiggy-surface border-jiggy-border rounded-2xl shadow-2xl overflow-hidden mt-6">
                  <div className="p-4 border-b border-jiggy-border bg-jiggy-surface-2 flex items-center justify-between">
                    <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs">Data Table</h3>
                  </div>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto relative">
                      <Table>
                        <TableHeader className="bg-jiggy-surface-2 sticky top-0 z-10">
                          {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-jiggy-border hover:bg-transparent">
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
                            <TableRow key={row.id} className="border-jiggy-border hover:bg-jiggy-surface-2 transition-colors group">
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
            <Card className="bg-jiggy-surface border border-jiggy-border border-dashed shadow-2xl rounded-2xl flex items-center justify-center p-12 min-h-[500px]">
              <div className="flex flex-col items-center text-center max-w-sm">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                  <Database className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Research Configuration Required</h3>
                <p className="text-sm text-slate-400 mb-6">
                  {researchMode === "multi-company"
                    ? "Select companies and a single metric above to generate visualizations."
                    : "Select a company and aggregate metrics above to dive deeper."}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Render Popovers Out of DOM Flow */}
      {
        showCompanyPicker && (
          <CompanyPicker
            title={researchMode === "multi-company" ? "Select Companies" : "Select Target Company"}
            allCompanies={allCompanies}
            nameToTickerMap={nameToTickerMap}
            initialLogos={sheetLogos}
            selectedCompanies={researchMode === "multi-company" ? selectedCompanies : (selectedCompany ? [selectedCompany] : [])}
            singleSelection={researchMode === "single-company"}
            onClose={() => setShowCompanyPicker(false)}
            onSave={(comps) => {
              if (researchMode === "multi-company") {
                setSelectedCompanies(comps);
              } else {
                if (comps.length > 0) {
                  const newCompany = comps[0];
                  if (newCompany !== selectedCompany) {
                    setSelectedCompany(newCompany);
                    const companyData = companiesData.find(c => c.companyName === newCompany);
                    if (companyData) setSelectedMetrics(companyData.metrics.map(m => m.metric).slice(0, 3));
                  }
                } else {
                  setSelectedCompany("");
                }
              }
              setShowCompanyPicker(false);
            }}
          />
        )
      }

      {
        showCriteriaPicker && (
          <CriteriaPicker
            title={researchMode === "multi-company" ? "Select Metric" : "Add Metrics to Compare"}
            allCriteria={allMetricsForCriteriaPicker}
            criteriaCategories={metricCategoriesMap}
            selectedCriteria={researchMode === "multi-company" ? (selectedMetric ? [selectedMetric] : []) : selectedMetrics}
            showOrder={researchMode === "single-company"}
            // Modified internal handling to deal with singleSelection for CriteriaPicker without passing a new prop
            onClose={() => setShowCriteriaPicker(false)}
            onSave={(mets) => {
              if (researchMode === "multi-company") {
                setSelectedMetric(mets[mets.length - 1] || ""); // Keep the last clicked if multi-clicked 
              } else {
                setSelectedMetrics(mets);
              }
              setShowCriteriaPicker(false);
            }}
          />
        )
      }
    </div >
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
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}
