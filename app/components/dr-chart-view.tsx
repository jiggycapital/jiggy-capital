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
import { fetchAllCompanyData, getAllMetrics, getAllQuarters, categorizeMetrics, getMetricsByCategory, type CompanyFinancialData, type MetricCategory } from "@/lib/financial-sheets";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import { Settings2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | "all">("all");
  const [metricSearch, setMetricSearch] = useState<string>("");
  const [quarterVisibility, setQuarterVisibility] = useState<Record<string, boolean>>({});
  const [showSettings, setShowSettings] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await fetchAllCompanyData();
      setCompaniesData(data);
      // Auto-select "Net New Revenue Growth" if available
      if (data.length > 0) {
        const allMetrics = getAllMetrics(data);
        const netNewRevenueGrowth = allMetrics.find(m => 
          m.toLowerCase().includes("net new revenue growth")
        );
        if (netNewRevenueGrowth) {
          setSelectedMetric(netNewRevenueGrowth);
        } else if (allMetrics.length > 0) {
          setSelectedMetric(allMetrics[0]);
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

  // Categorize metrics
  const metricCategories = useMemo(() => {
    return categorizeMetrics(companiesData);
  }, [companiesData]);

  // Filter metrics by selected category and search
  const filteredMetrics = useMemo(() => {
    let metrics = allMetrics;
    
    // Filter by category
    if (selectedCategory !== "all") {
      metrics = getMetricsByCategory(companiesData, selectedCategory);
    }
    
    // Filter by search term
    if (metricSearch) {
      const searchLower = metricSearch.toLowerCase();
      metrics = metrics.filter(m => m.toLowerCase().includes(searchLower));
    }
    
    return metrics;
  }, [allMetrics, selectedCategory, metricSearch, companiesData]);

  const allQuarters = useMemo(() => {
    return getAllQuarters(companiesData);
  }, [companiesData]);

  // Initialize quarter visibility - hide 2019-2020 quarters by default
  useEffect(() => {
    if (allQuarters.length > 0 && Object.keys(quarterVisibility).length === 0) {
      const initialVisibility: Record<string, boolean> = {};
      allQuarters.forEach(quarter => {
        // Hide quarters from 2019-2020 (Q1 19 through Q4 20)
        const is2019_2020 = /Q[1-4]\s+(19|20)$/.test(quarter);
        initialVisibility[quarter] = !is2019_2020;
      });
      setQuarterVisibility(initialVisibility);
    }
  }, [allQuarters, quarterVisibility]);

  // Get visible quarters
  const visibleQuarters = useMemo(() => {
    return allQuarters.filter(quarter => quarterVisibility[quarter] !== false);
  }, [allQuarters, quarterVisibility]);

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

  const selectAllCompanies = () => {
    setSelectedCompanies([...companiesWithMetric]);
  };

  const deselectAllCompanies = () => {
    setSelectedCompanies([]);
  };

  const toggleQuarterVisibility = (quarter: string) => {
    setQuarterVisibility(prev => ({
      ...prev,
      [quarter]: !prev[quarter],
    }));
  };

  const showAllQuarters = () => {
    const allVisible: Record<string, boolean> = {};
    allQuarters.forEach(quarter => {
      allVisible[quarter] = true;
    });
    setQuarterVisibility(allVisible);
  };

  const hideAllQuarters = () => {
    const allHidden: Record<string, boolean> = {};
    allQuarters.forEach(quarter => {
      allHidden[quarter] = false;
    });
    setQuarterVisibility(allHidden);
  };

  // Prepare chart data - time series by quarter
  const chartData = useMemo(() => {
    if (!selectedMetric || selectedCompanies.length === 0) return [];

    // Create data points for each visible quarter
    const dataPoints: Record<string, any> = {};

    visibleQuarters.forEach(quarter => {
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
  }, [selectedCompanies, selectedMetric, visibleQuarters, companiesData]);

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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-slate-800 border-slate-700 text-slate-100"
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Quarter Visibility
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-slate-800 border-slate-700 text-slate-100">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-200">Show/Hide Quarters</h4>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={showAllQuarters}
                          className="text-xs h-7 text-slate-300 hover:text-slate-100"
                        >
                          Show All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={hideAllQuarters}
                          className="text-xs h-7 text-slate-300 hover:text-slate-100"
                        >
                          Hide All
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2 border-t border-slate-700 pt-2">
                      {allQuarters.map(quarter => (
                        <div key={quarter} className="flex items-center space-x-2">
                          <Checkbox
                            id={`quarter-${quarter}`}
                            checked={quarterVisibility[quarter] !== false}
                            onCheckedChange={() => toggleQuarterVisibility(quarter)}
                            className="border-slate-600 data-[state=checked]:bg-slate-700"
                          />
                          <label
                            htmlFor={`quarter-${quarter}`}
                            className="text-sm text-slate-300 cursor-pointer flex-1"
                          >
                            {quarter}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
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
                  Metric Category
                </label>
                <Select 
                  value={selectedCategory} 
                  onValueChange={(v) => {
                    setSelectedCategory(v as MetricCategory | "all");
                    setSelectedMetric(""); // Reset metric when category changes
                    setMetricSearch(""); // Reset search
                  }}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="all" className="text-slate-100">All Categories</SelectItem>
                    <SelectItem value="universal" className="text-slate-100">Universal (5+ companies)</SelectItem>
                    <SelectItem value="segment" className="text-slate-100">Segment-Specific</SelectItem>
                    <SelectItem value="company-specific" className="text-slate-100">Company-Specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Search Metrics
                </label>
                <Input
                  placeholder="Type to search metrics..."
                  value={metricSearch}
                  onChange={(e) => setMetricSearch(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Metric
                </label>
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 max-h-[400px]">
                    {(() => {
                      if (filteredMetrics.length === 0) {
                        return (
                          <div className="px-2 py-4 text-sm text-slate-400 text-center">
                            No metrics found
                          </div>
                        );
                      }

                      // Group metrics by category for display
                      const universalMetrics = filteredMetrics.filter(m => {
                        const info = metricCategories.find(c => c.metric === m);
                        return info?.category === "universal";
                      });
                      const segmentMetrics = filteredMetrics.filter(m => {
                        const info = metricCategories.find(c => c.metric === m);
                        return info?.category === "segment";
                      });
                      const companyMetrics = filteredMetrics.filter(m => {
                        const info = metricCategories.find(c => c.metric === m);
                        return info?.category === "company-specific";
                      });
                      
                      return (
                        <>
                          {universalMetrics.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-700">
                                Universal ({universalMetrics.length})
                              </div>
                              {universalMetrics.map(metric => (
                                <SelectItem key={metric} value={metric} className="text-slate-100">
                                  {metric}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {segmentMetrics.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-700 mt-2">
                                Segment-Specific ({segmentMetrics.length})
                              </div>
                              {segmentMetrics.map(metric => (
                                <SelectItem key={metric} value={metric} className="text-slate-100">
                                  {metric}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {companyMetrics.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-700 mt-2">
                                Company-Specific ({companyMetrics.length})
                              </div>
                              {companyMetrics.map(metric => (
                                <SelectItem key={metric} value={metric} className="text-slate-100">
                                  {metric}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </SelectContent>
                </Select>
                {filteredMetrics.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    {filteredMetrics.length} metric{filteredMetrics.length !== 1 ? 's' : ''} available
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">
                    Companies (Select multiple)
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllCompanies}
                      className="text-xs h-7 text-slate-300 hover:text-slate-100"
                      disabled={companiesWithMetric.length === 0}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={deselectAllCompanies}
                      className="text-xs h-7 text-slate-300 hover:text-slate-100"
                      disabled={selectedCompanies.length === 0}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-700 rounded p-2 bg-slate-900">
                {companiesWithMetric.length === 0 && selectedMetric ? (
                  <div className="text-sm text-slate-400 py-2">
                    No companies have this metric
                  </div>
                ) : (
                  <>
                    {companiesWithMetric.map(company => (
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
                    ))}
                    {selectedCompanies.length > 0 && (
                      <div className="text-xs text-slate-400 pt-2 border-t border-slate-700">
                        {selectedCompanies.length} of {companiesWithMetric.length} selected
                      </div>
                    )}
                  </>
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

