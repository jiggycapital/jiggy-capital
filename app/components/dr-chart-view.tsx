"use client";

import { useState, useEffect, useMemo } from "react";
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
import { fetchAllCompanyData, getAllMetrics, getAllQuarters, type CompanyFinancialData } from "@/lib/financial-sheets";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import { Settings2, Download } from "lucide-react";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#6366f1",
  "#14b8a6", "#a855f7", "#f43f5e", "#22c55e", "#eab308"
];

export function DRChartView() {
  const [companiesData, setCompaniesData] = useState<CompanyFinancialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [showSettings, setShowSettings] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await fetchAllCompanyData();
      setCompaniesData(data);
      // Auto-select first metric (metric view is default)
      if (data.length > 0) {
        const firstMetric = getAllMetrics(data)[0];
        if (firstMetric) {
          setSelectedMetric(firstMetric);
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

  const allQuarters = useMemo(() => {
    return getAllQuarters(companiesData);
  }, [companiesData]);

  // Get companies that have the selected metric
  const companiesWithMetric = useMemo(() => {
    if (!selectedMetric) return allCompanies;
    return companiesData
      .filter(company => company.metrics.some(m => m.metric === selectedMetric))
      .map(company => company.companyName)
      .sort();
  }, [companiesData, selectedMetric, allCompanies]);

  const toggleCompany = (company: string) => {
    setSelectedCompanies(prev =>
      prev.includes(company)
        ? prev.filter(c => c !== company)
        : [...prev, company]
    );
  };

  // Prepare chart data - time series by quarter
  const chartData = useMemo(() => {
    if (!selectedMetric || selectedCompanies.length === 0) return [];

    // Create data points for each quarter
    const dataPoints: Record<string, any> = {};

    allQuarters.forEach(quarter => {
      dataPoints[quarter] = { quarter };
    });

    // Fill in values for each selected company
    selectedCompanies.forEach(companyName => {
      const company = companiesData.find(c => c.companyName === companyName);
      if (!company) return;

      const metric = company.metrics.find(m => m.metric === selectedMetric);
      if (!metric) return;

      metric.data.forEach(point => {
        if (dataPoints[point.quarter]) {
          dataPoints[point.quarter][companyName] = point.value;
        }
      });
    });

    return Object.values(dataPoints).sort((a, b) => {
      // Sort quarters chronologically
      const parseQuarter = (q: string) => {
        const match = q.match(/Q(\d)\s+(\d{2})/);
        if (match) {
          const quarter = parseInt(match[1]);
          const year = parseInt(match[2]);
          return year * 4 + quarter;
        }
        return 0;
      };
      return parseQuarter(a.quarter) - parseQuarter(b.quarter);
    });
  }, [selectedCompanies, selectedMetric, allQuarters, companiesData]);

  // Determine if metric should be formatted as currency or percentage
  const isCurrencyMetric = useMemo(() => {
    if (!selectedMetric) return false;
    const metricLower = selectedMetric.toLowerCase();
    // Metrics ending in "Growth" should be percentages, not currency
    if (metricLower.endsWith("growth")) return false;
    return metricLower.includes("revenue") ||
           metricLower.includes("income") ||
           metricLower.includes("cash flow") ||
           metricLower.includes("ebitda") ||
           metricLower.includes("profit") ||
           metricLower.includes("debt") ||
           metricLower.includes("equity") ||
           metricLower.includes("cash");
  }, [selectedMetric]);

  const isPercentageMetric = useMemo(() => {
    if (!selectedMetric) return false;
    const metricLower = selectedMetric.toLowerCase();
    // Check if metric ends with "Growth"
    return metricLower.endsWith("growth") ||
           metricLower.includes("%") ||
           metricLower.includes("margin") ||
           metricLower.includes("roic") ||
           metricLower.includes("roe") ||
           metricLower.includes("roa");
  }, [selectedMetric]);

  const handleExport = () => {
    if (chartData.length === 0) return;

    const headers = ["Quarter", ...selectedCompanies];
    const rows = chartData.map(point => {
      return [
        point.quarter,
        ...selectedCompanies.map(company => {
          const val = point[company];
          return val !== null && val !== undefined ? String(val) : "";
        }),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dr-chart-${selectedMetric}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading financial data...</div>
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
            <CardTitle className="text-slate-100">DR Chart - Financial Time Series</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSettings(!showSettings)}
                className="bg-slate-800 border-slate-700 text-slate-100"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                {showSettings ? "Hide" : "Show"} Settings
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
          {showSettings && (
            <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700 space-y-4">
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
                  Metric
                </label>
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {allMetrics.map(metric => (
                      <SelectItem key={metric} value={metric} className="text-slate-100">
                        {metric}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Companies (Select multiple)
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-700 rounded p-2 bg-slate-900">
                {companiesWithMetric.length === 0 && selectedMetric ? (
                  <div className="text-sm text-slate-400 py-2">
                    No companies have this metric
                  </div>
                ) : (
                  companiesWithMetric.map(company => (
                    <div key={company} className="flex items-center space-x-2">
                      <Checkbox
                        id={company}
                        checked={selectedCompanies.includes(company)}
                        onCheckedChange={() => toggleCompany(company)}
                        className="border-slate-700"
                      />
                      <label
                        htmlFor={company}
                        className="text-sm text-slate-300 cursor-pointer"
                      >
                        {company}
                      </label>
                    </div>
                  ))
                )}
                </div>
              </div>
            </div>
          )}

          {chartData.length > 0 && selectedCompanies.length > 0 && selectedMetric ? (
            <div className="mt-6">
              <div className="mb-4 text-slate-300">
                <h3 className="text-lg font-semibold mb-1">{selectedMetric}</h3>
                <p className="text-sm text-slate-400">
                  Showing {selectedCompanies.length} of {companiesWithMetric.length} {companiesWithMetric.length === 1 ? 'company' : 'companies'} with this metric
                </p>
                <p className="text-sm text-slate-400">
                  {selectedCompanies.length} {selectedCompanies.length === 1 ? 'company' : 'companies'} selected
                </p>
              </div>
              <ResponsiveContainer width="100%" height={600}>
                {chartType === "line" ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis 
                      dataKey="quarter" 
                      stroke="#94a3b8"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      tickFormatter={(value) => {
                        if (isPercentageMetric) {
                          return formatPercentage(value);
                        } else if (isCurrencyMetric) {
                          return formatCurrency(value);
                        }
                        return formatNumber(value);
                      }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", color: "#e2e8f0" }}
                      formatter={(value: any) => {
                        if (value === null || value === undefined) return "-";
                        if (isPercentageMetric) {
                          return formatPercentage(value);
                        } else if (isCurrencyMetric) {
                          return formatCurrency(value);
                        }
                        return formatNumber(value);
                      }}
                    />
                    <Legend />
                    {selectedCompanies.map((company, index) => (
                      <Line
                        key={company}
                        type="monotone"
                        dataKey={company}
                        stroke={COLORS[index % COLORS.length]}
                        name={company}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis 
                      dataKey="quarter" 
                      stroke="#94a3b8"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      tickFormatter={(value) => {
                        if (isPercentageMetric) {
                          return formatPercentage(value);
                        } else if (isCurrencyMetric) {
                          return formatCurrency(value);
                        }
                        return formatNumber(value);
                      }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", color: "#e2e8f0" }}
                      formatter={(value: any) => {
                        if (value === null || value === undefined) return "-";
                        if (isPercentageMetric) {
                          return formatPercentage(value);
                        } else if (isCurrencyMetric) {
                          return formatCurrency(value);
                        }
                        return formatNumber(value);
                      }}
                    />
                    <Legend />
                    {selectedCompanies.map((company, index) => (
                      <Bar
                        key={company}
                        dataKey={company}
                        fill={COLORS[index % COLORS.length]}
                        name={company}
                      />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-6 text-center text-slate-400 py-12">
              Configure chart settings to view data. Select a metric and at least one company.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

