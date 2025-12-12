"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";

// Extend ColumnMeta to include sticky property
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    sticky?: boolean;
  }
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchAllCompanyData, getAllMetrics, getAllQuarters, categorizeMetrics, getMetricsByCategory, type CompanyFinancialData, type MetricCategory } from "@/lib/financial-sheets";
import { formatCurrency, formatNumber, formatPercentage, parseNumeric } from "@/lib/utils";
import { Download, Settings2 } from "lucide-react";

interface TableRowData {
  company: string;
  metric: string;
  [key: string]: string | number | null; // Dynamic quarter columns
}

type ViewMode = "company" | "metric";

export function DRTableView() {
  const [companiesData, setCompaniesData] = useState<CompanyFinancialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("metric");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | "all">("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [quarterVisibility, setQuarterVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await fetchAllCompanyData();
      setCompaniesData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  // Get all unique companies, metrics, and quarters
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

  // Filter metrics by selected category
  const filteredMetrics = useMemo(() => {
    if (selectedCategory === "all") {
      return allMetrics;
    }
    return getMetricsByCategory(companiesData, selectedCategory);
  }, [allMetrics, selectedCategory, companiesData]);

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

  // Set default metric to "Net New Revenue Growth" when data loads
  useEffect(() => {
    if (allMetrics.length > 0 && !selectedMetric) {
      const netNewRevenueGrowth = allMetrics.find(m => 
        m.toLowerCase().includes("net new revenue growth")
      );
      if (netNewRevenueGrowth) {
        setSelectedMetric(netNewRevenueGrowth);
      }
    }
  }, [allMetrics, selectedMetric]);

  // Get visible quarters
  const visibleQuarters = useMemo(() => {
    return allQuarters.filter(quarter => quarterVisibility[quarter] !== false);
  }, [allQuarters, quarterVisibility]);

  // Transform data for table display
  // Default to metric view: one metric across all companies
  const tableData = useMemo<TableRowData[]>(() => {
    const data: TableRowData[] = [];
    
    // Metric view: one metric across all companies
    if (viewMode === "metric" || !selectedMetric || selectedMetric === "") {
      if (!selectedMetric || selectedMetric === "") {
        return []; // No metric selected
      }
      
      // Show selected metric across all companies that have it
      companiesData.forEach(company => {
        const metric = company.metrics.find(m => m.metric === selectedMetric);
        if (!metric) return; // Skip companies that don't have this metric
        
        const row: TableRowData = {
          company: company.companyName,
          metric: selectedMetric,
        };
        
        // Add quarter values
        metric.data.forEach(point => {
          row[point.quarter] = point.value;
        });
        
        data.push(row);
      });
    } else {
      // Company view: all metrics for selected company(ies)
      const companiesToShow = selectedCompany === "all" 
        ? companiesData 
        : companiesData.filter(c => c.companyName === selectedCompany);
      
      const metricsToShow = filteredMetrics;
      
      companiesToShow.forEach(company => {
        metricsToShow.forEach(metricName => {
          const metric = company.metrics.find(m => m.metric === metricName);
          if (!metric) return;
          
          const row: TableRowData = {
            company: company.companyName,
            metric: metricName,
          };
          
          // Add quarter values
          metric.data.forEach(point => {
            row[point.quarter] = point.value;
          });
          
          data.push(row);
        });
      });
    }
    
    return data;
  }, [companiesData, selectedCompany, selectedMetric, filteredMetrics, viewMode]);

  // Build columns dynamically
  const columns = useMemo<ColumnDef<TableRowData>[]>(() => {
    const baseColumns: ColumnDef<TableRowData>[] = [
      {
        accessorKey: "company",
        header: "Company",
        enableSorting: true,
        enableHiding: false,
        meta: {
          sticky: true,
        },
      },
    ];
    
    // Only show metric column in company view mode (not in metric view)
    if (viewMode === "company") {
      baseColumns.push({
        accessorKey: "metric",
        header: "Metric",
        enableSorting: true,
        enableHiding: false,
      });
    }
    
    // Add quarter columns (only visible ones)
    const quarterColumns: ColumnDef<TableRowData>[] = visibleQuarters.map(quarter => ({
      accessorKey: quarter,
      header: quarter,
      cell: ({ row }) => {
        const value = row.getValue(quarter) as number | null;
        if (value === null || value === undefined) {
          return <span className="text-slate-500">-</span>;
        }
        
        // Format based on metric type
        const metric = viewMode === "company" 
          ? (row.getValue("metric") as string)
          : selectedMetric;
        const metricLower = metric?.toLowerCase() || "";
        // Check if metric ends with "Growth" (case-insensitive)
        const endsWithGrowth = metricLower.endsWith("growth");
        const isPercentage = endsWithGrowth ||
                            metricLower.includes("%") || 
                            metricLower.includes("margin") ||
                            metricLower.includes("roic") ||
                            metricLower.includes("roe") ||
                            false;
        const isCurrency = !endsWithGrowth && (
                          metricLower.includes("revenue") ||
                          metricLower.includes("income") ||
                          metricLower.includes("cash flow") ||
                          metricLower.includes("ebitda") ||
                          metricLower.includes("profit") ||
                          metricLower.includes("debt") ||
                          metricLower.includes("equity") ||
                          false);
        
        if (isPercentage) {
          // Color-code percentages: green for positive, red for negative
          const colorClass = value > 0 
            ? "text-green-400" 
            : value < 0 
            ? "text-red-400" 
            : "text-slate-300";
          return <span className={`${colorClass} font-mono`}>{formatPercentage(value)}</span>;
        } else if (isCurrency) {
          return <span className="text-slate-300 font-mono">{formatCurrency(value)}</span>;
        } else {
          return <span className="text-slate-300 font-mono">{formatNumber(value)}</span>;
        }
      },
      enableSorting: true,
      sortingFn: (rowA, rowB, columnId) => {
        const valA = rowA.getValue(columnId) as number | null;
        const valB = rowB.getValue(columnId) as number | null;
        if (valA === null && valB === null) return 0;
        if (valA === null) return 1;
        if (valB === null) return -1;
        return valA - valB;
      },
    }));
    
    return [...baseColumns, ...quarterColumns];
  }, [visibleQuarters, viewMode, selectedMetric]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

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

  const handleExport = () => {
    if (tableData.length === 0) return;
    
    const headers = viewMode === "company" 
      ? ["Company", "Metric", ...visibleQuarters]
      : ["Company", ...visibleQuarters]; // Metric view: Company + quarters (metric is in the title)
    
    const rows = tableData.map(row => {
      if (viewMode === "company") {
        return [
          row.company,
          row.metric,
          ...visibleQuarters.map(q => {
            const val = row[q];
            return val !== null && val !== undefined ? String(val) : "";
          }),
        ].join(',');
      } else {
        return [
          row.company,
          ...visibleQuarters.map(q => {
            const val = row[q];
            return val !== null && val !== undefined ? String(val) : "";
          }),
        ].join(',');
      }
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = viewMode === "metric" && selectedMetric !== "all"
      ? `dr-table-${selectedMetric}-${new Date().toISOString().split('T')[0]}.csv`
      : `dr-table-${new Date().toISOString().split('T')[0]}.csv`;
    a.download = filename;
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
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-slate-100">DR Table - Financial Time Series</CardTitle>
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
                            id={quarter}
                            checked={quarterVisibility[quarter] !== false}
                            onCheckedChange={() => toggleQuarterVisibility(quarter)}
                            className="border-slate-600 data-[state=checked]:bg-slate-700"
                          />
                          <label
                            htmlFor={quarter}
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
              <Input
                placeholder="Search..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="max-w-sm bg-slate-800 border-slate-700 text-slate-100"
              />
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
          
          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => {
            setViewMode(v as ViewMode);
            if (v === "metric") {
              // Reset to empty when switching to metric view
              if (!selectedMetric || selectedMetric === "all") {
                setSelectedMetric("");
              }
            }
          }} className="mb-4">
            <TabsList className="bg-slate-800">
              <TabsTrigger value="metric" className="data-[state=active]:bg-slate-700">
                Metric View (One Metric Across Companies)
              </TabsTrigger>
              <TabsTrigger value="company" className="data-[state=active]:bg-slate-700">
                Company View (All Metrics for Company)
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {viewMode === "company" && (
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[200px] bg-slate-800 border-slate-700 text-slate-100">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">All Companies</SelectItem>
                  {allCompanies.map(company => (
                    <SelectItem key={company} value={company}>{company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Select 
              value={selectedCategory} 
              onValueChange={(v) => {
                setSelectedCategory(v as MetricCategory | "all");
                setSelectedMetric(""); // Reset metric when category changes
              }}
            >
              <SelectTrigger className="w-[200px] bg-slate-800 border-slate-700 text-slate-100">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="universal">Universal (5+ companies)</SelectItem>
                <SelectItem value="segment">Segment-Specific</SelectItem>
                <SelectItem value="company-specific">Company-Specific</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={selectedMetric || ""} 
              onValueChange={setSelectedMetric}
            >
              <SelectTrigger className="w-[300px] bg-slate-800 border-slate-700 text-slate-100">
                <SelectValue placeholder={viewMode === "metric" ? "Select a metric to view across companies" : "All Metrics"} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 max-h-[400px]">
                {(() => {
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
                      {viewMode === "company" && (
                        <SelectItem value="all">All Metrics</SelectItem>
                      )}
                      {universalMetrics.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-700">
                            Universal ({universalMetrics.length})
                          </div>
                          {universalMetrics.map(metric => (
                            <SelectItem key={metric} value={metric}>{metric}</SelectItem>
                          ))}
                        </>
                      )}
                      {segmentMetrics.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-700 mt-2">
                            Segment-Specific ({segmentMetrics.length})
                          </div>
                          {segmentMetrics.map(metric => (
                            <SelectItem key={metric} value={metric}>{metric}</SelectItem>
                          ))}
                        </>
                      )}
                      {companyMetrics.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-700 mt-2">
                            Company-Specific ({companyMetrics.length})
                          </div>
                          {companyMetrics.map(metric => (
                            <SelectItem key={metric} value={metric}>{metric}</SelectItem>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}
              </SelectContent>
            </Select>
            
            {viewMode === "metric" && selectedMetric && (
              <div className="text-sm text-slate-400 ml-2">
                Showing <span className="text-slate-300 font-semibold">{selectedMetric}</span> across {tableData.length} companies
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-800 overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-slate-800">
                    {headerGroup.headers.map((header, index) => {
                      const isSticky = header.column.columnDef.meta?.sticky;
                      return (
                        <TableHead
                          key={header.id}
                          className={`bg-slate-800 text-slate-200 font-semibold ${
                            header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-slate-700' : ''
                          } ${
                            isSticky ? 'sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.3)]' : ''
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                          style={isSticky ? { minWidth: '150px', maxWidth: '150px' } : undefined}
                        >
                          <div className="flex items-center gap-2">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                            {header.column.getCanSort() && (
                              <span className="text-slate-400">
                                {{
                                  asc: " ↑",
                                  desc: " ↓",
                                }[header.column.getIsSorted() as string] ?? " ↕"}
                              </span>
                            )}
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="border-slate-800 hover:bg-slate-800/50"
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isSticky = cell.column.columnDef.meta?.sticky;
                        return (
                          <TableCell
                            key={cell.id}
                            className={`font-mono text-xs text-slate-300 py-1 whitespace-nowrap ${
                              isSticky ? 'sticky left-0 z-10 bg-slate-900 shadow-[2px_0_4px_rgba(0,0,0,0.3)]' : ''
                            }`}
                            style={isSticky ? { minWidth: '150px', maxWidth: '150px' } : undefined}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-slate-400">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-400">
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}{" "}
              of {table.getFilteredRowModel().rows.length} entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="bg-slate-800 border-slate-700 text-slate-100"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="bg-slate-800 border-slate-700 text-slate-100"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

