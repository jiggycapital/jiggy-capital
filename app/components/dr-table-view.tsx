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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchAllCompanyData, getAllMetrics, getAllQuarters, categorizeMetrics, getMetricsByCategory, type CompanyFinancialData, type MetricCategory } from "@/lib/financial-sheets";
import { formatCurrency, formatNumber, formatPercentage, parseNumeric } from "@/lib/utils";
import { Download } from "lucide-react";

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
  const [viewMode, setViewMode] = useState<ViewMode>("company");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedMetric, setSelectedMetric] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | "all">("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

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

  // Transform data for table display
  const tableData = useMemo<TableRowData[]>(() => {
    const data: TableRowData[] = [];
    
    const companiesToShow = selectedCompany === "all" 
      ? companiesData 
      : companiesData.filter(c => c.companyName === selectedCompany);
    
    const metricsToShow = selectedMetric === "all"
      ? filteredMetrics
      : [selectedMetric];
    
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
    
    return data;
  }, [companiesData, selectedCompany, selectedMetric, filteredMetrics]);

  // Build columns dynamically
  const columns = useMemo<ColumnDef<TableRowData>[]>(() => {
    const baseColumns: ColumnDef<TableRowData>[] = [
      {
        accessorKey: "company",
        header: "Company",
        enableSorting: true,
        enableHiding: false,
      },
    ];
    
    // Only show metric column in company view mode
    if (viewMode === "company") {
      baseColumns.push({
        accessorKey: "metric",
        header: "Metric",
        enableSorting: true,
        enableHiding: false,
      });
    }
    
    // Add quarter columns
    const quarterColumns: ColumnDef<TableRowData>[] = allQuarters.map(quarter => ({
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
        const isPercentage = metric?.toLowerCase().includes("%") || 
                            metric?.toLowerCase().includes("margin") ||
                            metric?.toLowerCase().includes("roic") ||
                            metric?.toLowerCase().includes("roe") ||
                            false;
        const isCurrency = metric?.toLowerCase().includes("revenue") ||
                          metric?.toLowerCase().includes("income") ||
                          metric?.toLowerCase().includes("cash flow") ||
                          metric?.toLowerCase().includes("ebitda") ||
                          metric?.toLowerCase().includes("profit") ||
                          metric?.toLowerCase().includes("debt") ||
                          metric?.toLowerCase().includes("equity") ||
                          false;
        
        if (isPercentage) {
          return <span className="text-slate-300 font-mono">{formatPercentage(value)}</span>;
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
  }, [allQuarters]);

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

  const handleExport = () => {
    if (tableData.length === 0) return;
    
    const headers = viewMode === "company" 
      ? ["Company", "Metric", ...allQuarters]
      : ["Company", ...allQuarters];
    
    const rows = tableData.map(row => {
      if (viewMode === "company") {
        return [
          row.company,
          row.metric,
          ...allQuarters.map(q => {
            const val = row[q];
            return val !== null && val !== undefined ? String(val) : "";
          }),
        ].join(',');
      } else {
        return [
          row.company,
          ...allQuarters.map(q => {
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
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="mb-4">
            <TabsList className="bg-slate-800">
              <TabsTrigger value="company" className="data-[state=active]:bg-slate-700">
                Company View
              </TabsTrigger>
              <TabsTrigger value="metric" className="data-[state=active]:bg-slate-700">
                Metric View
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
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
            
            <Select 
              value={selectedCategory} 
              onValueChange={(v) => {
                setSelectedCategory(v as MetricCategory | "all");
                setSelectedMetric("all"); // Reset metric when category changes
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
              value={selectedMetric} 
              onValueChange={setSelectedMetric}
            >
              <SelectTrigger className="w-[250px] bg-slate-800 border-slate-700 text-slate-100">
                <SelectValue placeholder={viewMode === "metric" ? "Select Metric" : "All Metrics"} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 max-h-[400px]">
                {viewMode === "metric" ? (
                  // In metric view, metric selection is required - group by category
                  (() => {
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
                  })()
                ) : (
                  // In company view, "all" is allowed - group by category
                  (() => {
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
                        <SelectItem value="all">All Metrics</SelectItem>
                        {universalMetrics.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-700 mt-2">
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
                  })()
                )}
              </SelectContent>
            </Select>
            
            {viewMode === "metric" && selectedMetric !== "all" && (
              <div className="text-sm text-slate-400 ml-2">
                Showing <span className="text-slate-300 font-semibold">{selectedMetric}</span> across companies
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
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="bg-slate-800 text-slate-200 font-semibold"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
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
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="font-mono text-xs text-slate-300 py-1 whitespace-nowrap"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
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

