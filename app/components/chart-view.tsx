"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { fetchSheetData, parseSheetData, type DatasetType } from "@/lib/google-sheets";
import { formatCurrency, formatNumber, formatPercentage, parseNumeric } from "@/lib/utils";
import type { PortfolioRow } from "@/types/portfolio";
import { Settings2, Download } from "lucide-react";

export function ChartView() {
  const [positionsData, setPositionsData] = useState<PortfolioRow[]>([]);
  const [watchlistData, setWatchlistData] = useState<PortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"positions" | "watchlist" | "combined">("positions");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [xAxisColumn, setXAxisColumn] = useState<string | undefined>(undefined);
  const [yAxisColumns, setYAxisColumns] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [chartHeight, setChartHeight] = useState(500);
  
  useEffect(() => {
    const updateHeight = () => {
      setChartHeight(window.innerWidth < 768 ? 350 : 500);
    };
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
      setPositionsData(parseSheetData(positionsRows));
      setWatchlistData(parseSheetData(watchlistRows));
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

  // Get all available columns
  const allColumns = useMemo(() => {
    if (currentData.length === 0) return [];
    const keys = new Set<string>();
    currentData.forEach(row => {
      Object.keys(row).forEach(key => {
        // Filter out empty keys
        if (key && key.trim() !== "") {
          keys.add(key);
        }
      });
    });
    return Array.from(keys).filter(col => col && col.trim() !== "");
  }, [currentData]);

  // Get numeric columns for Y-axis
  const numericColumns = useMemo(() => {
    return allColumns.filter(col => {
      if (currentData.length === 0) return false;
      const sampleValue = currentData[0]?.[col];
      return parseNumeric(String(sampleValue || "")) !== null;
    });
  }, [allColumns, currentData]);

  // Set default X-axis (first column, usually ticker)
  useEffect(() => {
    if (allColumns.length > 0 && (!xAxisColumn || xAxisColumn.trim() === "")) {
      const firstValidColumn = allColumns.find(col => col && col.trim() !== "");
      if (firstValidColumn) {
        setXAxisColumn(firstValidColumn);
      }
    }
  }, [allColumns, xAxisColumn]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!xAxisColumn || xAxisColumn.trim() === "" || yAxisColumns.length === 0 || currentData.length === 0) return [];
    
    return currentData.map(row => {
      const dataPoint: any = {
        name: String(row[xAxisColumn] || ""),
      };
      
      yAxisColumns.forEach(col => {
        if (col && col.trim() !== "") {
          const value = parseNumeric(String(row[col] || ""));
          dataPoint[col] = value !== null ? value : 0;
        }
      });
      
      return dataPoint;
    }).filter(point => point.name && point.name.trim() !== ""); // Filter out empty names
  }, [currentData, xAxisColumn, yAxisColumns]);

  const toggleYAxisColumn = (column: string) => {
    if (!column || column.trim() === "") return;
    setYAxisColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const handleExport = () => {
    if (chartData.length === 0 || !xAxisColumn || xAxisColumn.trim() === "") return;
    
    const headers = [xAxisColumn, ...yAxisColumns].join(',');
    const rows = chartData.map(row => {
      return [xAxisColumn, ...yAxisColumns]
        .filter((col): col is string => col !== undefined && col.trim() !== "")
        .map(col => {
          const value = row[col] || '';
          if (String(value).includes(',') || String(value).includes('"')) {
            return `"${String(value).replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',');
    });
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jiggy-capital-chart-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#6366f1"
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading data...</div>
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

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-100">Chart Configuration</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSettings(!showSettings)}
                className="bg-slate-800 border-slate-700 text-slate-100"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                className="bg-slate-800 border-slate-700 text-slate-100"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="bg-slate-800">
              <TabsTrigger value="positions" className="data-[state=active]:bg-slate-700">
                Holdings ({positionsData.length})
              </TabsTrigger>
              <TabsTrigger value="watchlist" className="data-[state=active]:bg-slate-700">
                Watchlist ({watchlistData.length})
              </TabsTrigger>
              <TabsTrigger value="combined" className="data-[state=active]:bg-slate-700">
                Combined ({positionsData.length + watchlistData.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {showSettings && (
            <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Chart Type
                </label>
                <Select value={chartType} onValueChange={(v: any) => setChartType(v)}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="line" className="text-slate-100">Line Chart</SelectItem>
                    <SelectItem value="bar" className="text-slate-100">Bar Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  X-Axis
                </label>
                <Select 
                  value={xAxisColumn && xAxisColumn.trim() !== "" ? xAxisColumn : undefined} 
                  onValueChange={(value) => {
                    if (value && value.trim() !== "") {
                      setXAxisColumn(value);
                    }
                  }}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100">
                    <SelectValue placeholder="Select X-axis column" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {allColumns.length > 0 ? (
                      allColumns
                        .filter(col => col && col.trim() !== "")
                        .map(col => (
                          <SelectItem key={col} value={col} className="text-slate-100">
                            {formatColumnName(col)}
                          </SelectItem>
                        ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-slate-400">No columns available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Y-Axis Metrics (Select multiple)
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-700 rounded p-2 bg-slate-900">
                  {numericColumns
                    .filter(col => col && col.trim() !== "")
                    .map(col => (
                      <div key={col} className="flex items-center space-x-2">
                        <Checkbox
                          id={col}
                          checked={yAxisColumns.includes(col)}
                          onCheckedChange={() => toggleYAxisColumn(col)}
                          className="border-slate-700"
                        />
                        <label
                          htmlFor={col}
                          className="text-sm text-slate-300 cursor-pointer"
                        >
                          {formatColumnName(col)}
                        </label>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {chartData.length > 0 && yAxisColumns.length > 0 ? (
            <div className="mt-6">
              <ResponsiveContainer width="100%" height={chartHeight}>
                {chartType === "line" ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", color: "#e2e8f0" }}
                    />
                    <Legend />
                    {yAxisColumns.map((col, index) => (
                      <Line
                        key={col}
                        type="monotone"
                        dataKey={col}
                        stroke={COLORS[index % COLORS.length]}
                        name={formatColumnName(col)}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", color: "#e2e8f0" }}
                    />
                    <Legend />
                    {yAxisColumns.map((col, index) => (
                      <Bar
                        key={col}
                        dataKey={col}
                        fill={COLORS[index % COLORS.length]}
                        name={formatColumnName(col)}
                      />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-6 text-center text-slate-400 py-12">
              Configure chart settings to view data. Select X-axis and Y-axis metrics.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatColumnName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .trim();
}

