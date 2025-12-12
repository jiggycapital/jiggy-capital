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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColumnSelector } from "@/components/column-selector";
import { fetchSheetData, parseSheetData, type DatasetType } from "@/lib/google-sheets";
import { formatCurrency, formatNumber, formatPercentage, parseNumeric } from "@/lib/utils";
import { StockDetailSheet } from "@/components/stock-detail-sheet";
import type { PortfolioRow } from "@/types/portfolio";
import { Settings2, Download } from "lucide-react";

export function TableView() {
  const [positionsData, setPositionsData] = useState<PortfolioRow[]>([]);
  const [watchlistData, setWatchlistData] = useState<PortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"positions" | "watchlist" | "combined">("positions");
  const [selectedStock, setSelectedStock] = useState<PortfolioRow | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

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
    console.log('[TABLE DEBUG] Computing allColumns, currentData length:', currentData.length);
    if (currentData.length === 0) {
      console.log('[TABLE DEBUG] No data, returning empty columns');
      return [];
    }
    const keys = new Set<string>();
    currentData.forEach((row, index) => {
      const rowKeys = Object.keys(row);
      if (index === 0) {
        console.log('[TABLE DEBUG] First row keys:', rowKeys.slice(0, 10));
      }
      rowKeys.forEach(key => {
        if (key && key.trim() !== "") {
          keys.add(key);
        }
      });
    });
    const columns = Array.from(keys).filter(col => col && col.trim() !== "");
    console.log('[TABLE DEBUG] All columns computed:', {
      total: columns.length,
      firstFew: columns.slice(0, 10),
    });
    return columns;
  }, [currentData]);

  // Initialize column order and visibility if empty
  useEffect(() => {
    if (allColumns.length > 0 && columnOrder.length === 0) {
      setColumnOrder(allColumns);
      // Initialize all columns as visible by default
      const initialVisibility: VisibilityState = {};
      allColumns.forEach(col => {
        initialVisibility[col] = true;
      });
      setColumnVisibility(initialVisibility);
    }
  }, [allColumns, columnOrder.length]);

  // Get visible columns in order
  const visibleColumns = useMemo(() => {
    if (columnOrder.length === 0) {
      // Show first 20 columns by default if no order set yet
      return allColumns.slice(0, 20);
    }
    // Show columns that are not explicitly hidden (undefined or true means visible)
    return columnOrder.filter(col => columnVisibility[col] !== false);
  }, [columnOrder, columnVisibility, allColumns]);

  const columns = useMemo<ColumnDef<PortfolioRow>[]>(() => {
    console.log('[TABLE DEBUG] Building columns:', {
      visibleColumnsCount: visibleColumns.length,
      visibleColumns: visibleColumns.slice(0, 5),
      currentDataCount: currentData.length,
    });

    if (visibleColumns.length === 0) {
      console.warn('[TABLE DEBUG] No visible columns, returning empty array');
      return [];
    }

    if (currentData.length === 0) {
      console.warn('[TABLE DEBUG] No data, but have columns, creating placeholder columns');
    }

    const builtColumns = visibleColumns
      .filter(key => {
        if (!key || key.trim() === "") {
          console.warn('[TABLE DEBUG] Filtering out empty column key');
          return false;
        }
        return true;
      })
      .map(key => {
        try {
          const sampleValue = currentData.length > 0 ? currentData[0]?.[key] : null;
          const isNumeric = parseNumeric(String(sampleValue || "")) !== null;
          
          return {
            accessorKey: key,
            header: formatColumnName(key),
            cell: ({ row }) => {
              try {
                const value = row.getValue(key) as string;
                return formatCellValue(value, key, isNumeric);
              } catch (err) {
                console.error('[TABLE DEBUG] Error in cell renderer for', key, err);
                return <span className="text-slate-500">-</span>;
              }
            },
            enableSorting: true,
            enableHiding: true,
          };
        } catch (err) {
          console.error('[TABLE DEBUG] Error building column for', key, err);
          return null;
        }
      })
      .filter((col): col is ColumnDef<PortfolioRow> => col !== null);

    console.log('[TABLE DEBUG] Built columns:', {
      count: builtColumns.length,
      firstFew: builtColumns.slice(0, 3).map(c => c.accessorKey),
    });

    return builtColumns;
  }, [visibleColumns, currentData]);

  console.log('[TABLE DEBUG] Before useReactTable:', {
    dataCount: currentData.length,
    columnsCount: columns.length,
    visibleColumnsCount: visibleColumns.length,
    columnOrderLength: columnOrder.length,
    allColumnsLength: allColumns.length,
  });

  const table = useReactTable({
    data: currentData,
    columns: columns.length > 0 ? columns : [
      {
        accessorKey: 'placeholder',
        header: 'No Columns',
        cell: () => 'No columns available',
      } as ColumnDef<PortfolioRow>
    ],
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  console.log('[TABLE DEBUG] After useReactTable:', {
    headerGroupsCount: table.getHeaderGroups().length,
    rowModelCount: table.getRowModel().rows.length,
  });

  const handleColumnVisibilityChange = (columns: string[]) => {
    const newVisibility: VisibilityState = {};
    allColumns.forEach(col => {
      newVisibility[col] = columns.includes(col);
    });
    setColumnVisibility(newVisibility);
    setColumnOrder(columns);
  };

  const handleExport = () => {
    if (currentData.length === 0) return;
    
    const headers = visibleColumns.join(',');
    const rows = currentData.map(row => {
      return visibleColumns.map(col => {
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
    a.download = `jiggy-capital-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
            <CardTitle className="text-slate-100">Data Table</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="max-w-sm bg-slate-800 border-slate-700 text-slate-100"
              />
              <Button
                variant="outline"
                onClick={() => setShowColumnSelector(true)}
                className="bg-slate-800 border-slate-700 text-slate-100"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Columns
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

          <div className="rounded-md border border-slate-800 mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-slate-800 hover:bg-slate-800/50">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-slate-300 font-mono text-xs cursor-pointer select-none whitespace-nowrap"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-2">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: " ↑",
                            desc: " ↓",
                          }[header.column.getIsSorted() as string] ?? " ↕"}
                        </div>
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
                      className="border-slate-800 hover:bg-slate-800/50 cursor-pointer"
                      onClick={() => setSelectedStock(row.original)}
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

      {showColumnSelector && (
        <ColumnSelector
          allColumns={allColumns}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
          onClose={() => setShowColumnSelector(false)}
          onSave={(columns) => {
            handleColumnVisibilityChange(columns);
            setShowColumnSelector(false);
          }}
        />
      )}

      {selectedStock && (
        <StockDetailSheet
          stock={selectedStock}
          open={!!selectedStock}
          onOpenChange={(open) => !open && setSelectedStock(null)}
        />
      )}
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

function formatCellValue(value: string, columnKey: string, isNumeric: boolean): React.ReactNode {
  if (!value || value === "" || value === "#N/A" || value === "#DIV/0!") {
    return <span className="text-slate-500">-</span>;
  }

  if (isNumeric) {
    const num = parseNumeric(value);
    if (num === null) return value;

    const isGainColumn = columnKey.toLowerCase().includes("gain") ||
      columnKey.toLowerCase().includes("change") ||
      columnKey.toLowerCase().includes("return") ||
      columnKey.toLowerCase().includes("growth");

    if (isGainColumn) {
      const colorClass = num > 0 ? "text-green-400" : num < 0 ? "text-red-400" : "text-slate-300";
      return <span className={colorClass}>{formatPercentage(num)}</span>;
    }

    if (columnKey.toLowerCase().includes("cap") || columnKey.toLowerCase().includes("revenue") ||
        columnKey.toLowerCase().includes("ebitda") || columnKey.toLowerCase().includes("fcf")) {
      return <span className="text-slate-300">{formatCurrency(num)}</span>;
    }

    return <span className="text-slate-300">{formatNumber(num)}</span>;
  }

  return <span className="text-slate-300">{value}</span>;
}

