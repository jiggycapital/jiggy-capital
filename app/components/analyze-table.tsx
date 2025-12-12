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
import { fetchSheetData, parseSheetData, type DatasetType } from "@/lib/google-sheets";
import { formatCurrency, formatNumber, formatPercentage, parseNumeric } from "@/lib/utils";
import { StockDetailSheet } from "@/components/stock-detail-sheet";
import type { PortfolioRow } from "@/types/portfolio";

export function AnalyzeTable() {
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

  const columns = useMemo<ColumnDef<PortfolioRow>[]>(() => {
    if (currentData.length === 0) return [];
    
    const allKeys = new Set<string>();
    currentData.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    
    const keys = Array.from(allKeys);
    
    return keys.map(key => {
      const sampleValue = currentData[0]?.[key];
      const isNumeric = parseNumeric(sampleValue as string) !== null;
      
      return {
        accessorKey: key,
        header: formatColumnName(key),
        cell: ({ row }) => {
          const value = row.getValue(key) as string;
          return formatCellValue(value, key, isNumeric);
        },
        enableSorting: true,
        enableHiding: true,
      };
    });
  }, [currentData]);

  const table = useReactTable({
    data: currentData,
    columns,
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
      columnVisibility: {
        // Hide some columns by default
      },
    },
  });

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-slate-800 border-slate-700 text-slate-100">
                        Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="text-slate-100"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
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

          <div className="rounded-md border border-slate-800 mt-4">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-slate-800 hover:bg-slate-800/50">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-slate-300 font-mono text-xs cursor-pointer select-none"
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
                          className="font-mono text-xs text-slate-300 py-1"
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

    // Color coding for gains/losses
    const isGainColumn = columnKey.toLowerCase().includes("gain") ||
      columnKey.toLowerCase().includes("change") ||
      columnKey.toLowerCase().includes("return") ||
      columnKey.toLowerCase().includes("growth");

    if (isGainColumn) {
      const colorClass = num > 0 ? "text-green-400" : num < 0 ? "text-red-400" : "text-slate-300";
      return <span className={colorClass}>{formatPercentage(num)}</span>;
    }

    // Currency formatting
    if (columnKey.toLowerCase().includes("cap") || columnKey.toLowerCase().includes("revenue") ||
        columnKey.toLowerCase().includes("ebitda") || columnKey.toLowerCase().includes("fcf")) {
      return <span className="text-slate-300">{formatCurrency(num)}</span>;
    }

    return <span className="text-slate-300">{formatNumber(num)}</span>;
  }

  return <span className="text-slate-300">{value}</span>;
}

