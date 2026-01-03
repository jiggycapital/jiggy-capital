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
  sortingFns,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColumnSelector } from "@/components/column-selector";
import { fetchSheetData, parseSheetData, fetchLogos, extractColumnCategories, type DatasetType } from "@/lib/google-sheets";
import { formatCurrency, formatCurrencyBillions, formatMultiple, formatNumber, formatPercentage, formatDate, parseNumeric } from "@/lib/utils";
import { StockDetailSheet } from "@/components/stock-detail-sheet";
import type { PortfolioRow } from "@/types/portfolio";
import { Settings2, Download, Save, FolderOpen, Trash2 } from "lucide-react";

export function TableView() {
  const [positionsData, setPositionsData] = useState<PortfolioRow[]>([]);
  const [watchlistData, setWatchlistData] = useState<PortfolioRow[]>([]);
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [columnCategories, setColumnCategories] = useState<Record<string, string>>({});
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
  const [templates, setTemplates] = useState<Record<string, string[]>>({});
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  useEffect(() => {
    loadData();
    loadTemplates();
  }, []);

  // Load templates from localStorage
  function loadTemplates() {
    try {
      const saved = localStorage.getItem('jiggy-table-templates');
      if (saved) {
        setTemplates(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  }

  // Save templates to localStorage
  function saveTemplates(newTemplates: Record<string, string[]>) {
    try {
      localStorage.setItem('jiggy-table-templates', JSON.stringify(newTemplates));
      setTemplates(newTemplates);
    } catch (err) {
      console.error('Failed to save templates:', err);
    }
  }

  // Get default template columns
  function getDefaultTemplateColumns(allCols: string[]): string[] {
    const defaultCols = ['Ticker', 'Company', 'Market Cap', 'Change %', '25-27e Rev CAGR', 'P/2026e FCF', '2026e P/E'];
    // Try to find matching columns (case-insensitive, partial match)
    const found: string[] = [];
    defaultCols.forEach(defaultCol => {
      const match = allCols.find(col => {
        const colLower = col.toLowerCase();
        const defaultLower = defaultCol.toLowerCase();
        return colLower === defaultLower || 
               colLower.includes(defaultLower) || 
               defaultLower.includes(colLower);
      });
      if (match) {
        found.push(match);
      }
    });
    return found.length > 0 ? found : allCols.slice(0, 5);
  }

  // Save current view as template
  function saveCurrentAsTemplate() {
    if (!newTemplateName.trim()) return;
    const newTemplates = { ...templates, [newTemplateName.trim()]: visibleColumns };
    saveTemplates(newTemplates);
    setShowSaveTemplateDialog(false);
    setNewTemplateName("");
  }

  // Load a template
  function loadTemplate(templateName: string) {
    const template = templates[templateName];
    if (template) {
      // Filter to only include columns that exist in allColumns
      const validColumns = template.filter(col => allColumns.includes(col));
      if (validColumns.length > 0) {
        handleColumnVisibilityChange(validColumns);
      }
    }
    setShowTemplateMenu(false);
  }

  // Delete a template
  function deleteTemplate(templateName: string) {
    const newTemplates = { ...templates };
    delete newTemplates[templateName];
    saveTemplates(newTemplates);
  }

  async function loadData() {
    try {
      setLoading(true);
      const [positionsRows, watchlistRows, logosData] = await Promise.all([
        fetchSheetData("positions"),
        fetchSheetData("watchlist"),
        fetchLogos(),
      ]);
      
      // Extract categories from positions sheet (use positions as primary source)
      const categories = extractColumnCategories(positionsRows);
      setColumnCategories(categories);
      
      setPositionsData(parseSheetData(positionsRows));
      setWatchlistData(parseSheetData(watchlistRows));
      setLogos(logosData.logos);
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
      // Check if we have a saved default template or use the default columns
      const defaultTemplate = getDefaultTemplateColumns(allColumns);
      setColumnOrder(allColumns);
      
      // Set visibility: show default template columns, hide others
      const initialVisibility: VisibilityState = {};
      allColumns.forEach(col => {
        initialVisibility[col] = defaultTemplate.includes(col);
      });
      setColumnVisibility(initialVisibility);
      
      // Set initial column order to have default template columns first
      const ordered = [...defaultTemplate, ...allColumns.filter(col => !defaultTemplate.includes(col))];
      setColumnOrder(ordered);
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

    const builtColumns: ColumnDef<PortfolioRow>[] = visibleColumns
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
          
          // Create a custom sorting function for numeric columns
          // Use a closure to capture the key value
          const numericSortingFn = (rowA: any, rowB: any, columnId: string) => {
            // Use the columnId parameter (which should be the key)
            const valA = parseNumeric(String(rowA.getValue(columnId) || ""));
            const valB = parseNumeric(String(rowB.getValue(columnId) || ""));
            if (valA === null && valB === null) return 0;
            if (valA === null) return 1; // nulls go to end
            if (valB === null) return -1; // nulls go to end
            return valA - valB;
          };
          
          // Build column definition - conditionally include sortingFn only for numeric columns
          const columnDef: ColumnDef<PortfolioRow> = {
            accessorKey: key,
            header: formatColumnName(key),
            cell: ({ row }) => {
              try {
                const value = row.getValue(key) as string;
                // Check if this is the Ticker column and we have a logo
                const isTickerColumn = key.toLowerCase() === 'ticker' || key.toLowerCase() === 'symbol';
                if (isTickerColumn && value) {
                  const ticker = String(value).toUpperCase().trim();
                  const logoUrl = logos[ticker];
                  if (logoUrl) {
                    return (
                      <div className="flex items-center gap-2">
                        <img 
                          src={logoUrl} 
                          alt={`${ticker} logo`}
                          className="h-6 w-6 object-contain flex-shrink-0"
                          onError={(e) => {
                            // Hide image on error, show ticker only
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <span>{value}</span>
                      </div>
                    );
                  }
                }
                // Special handling for Company column - clean and truncate
                const isCompanyColumn = key.toLowerCase() === 'company' || key.toLowerCase() === 'name';
                if (isCompanyColumn && value) {
                  const cleaned = cleanCompanyName(String(value));
                  return (
                    <span className="text-slate-300 truncate block max-w-[150px]" title={String(value)}>
                      {cleaned}
                    </span>
                  );
                }
                
                return formatCellValue(value, key, isNumeric, columnCategories[key]);
              } catch (err) {
                console.error('[TABLE DEBUG] Error in cell renderer for', key, err);
                return <span className="text-slate-500">-</span>;
              }
            },
            enableSorting: true,
            enableHiding: true,
          };

          // Only add sortingFn for numeric columns - TanStack Table will use default alphanumeric for others
          if (isNumeric) {
            columnDef.sortingFn = numericSortingFn;
          }

          return columnDef;
        } catch (err) {
          console.error('[TABLE DEBUG] Error building column for', key, err);
          // Return a valid column definition even on error
          return {
            accessorKey: key,
            header: formatColumnName(key),
            cell: () => <span className="text-slate-500">Error</span>,
            enableSorting: false,
            enableHiding: true,
          } as ColumnDef<PortfolioRow>;
        }
      })
      .filter((col): col is ColumnDef<PortfolioRow> => col !== null && col !== undefined);

    console.log('[TABLE DEBUG] Built columns:', {
      count: builtColumns.length,
      firstFew: builtColumns.slice(0, 3).map(c => {
        if ('accessorKey' in c) {
          return c.accessorKey;
        }
        return 'unknown';
      }),
    });

    return builtColumns;
  }, [visibleColumns, currentData, logos]);

  console.log('[TABLE DEBUG] Before useReactTable:', {
    dataCount: currentData.length,
    columnsCount: columns.length,
    visibleColumnsCount: visibleColumns.length,
    columnOrderLength: columnOrder.length,
    allColumnsLength: allColumns.length,
  });

  // Determine if pagination should be enabled (only for Holdings/Positions)
  const usePagination = activeTab === "positions";
  const pageSize = usePagination ? 50 : 10000; // Large number effectively disables pagination

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
      pagination: {
        pageIndex: 0,
        pageSize: pageSize,
      },
    },
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
  });

  // Reset pagination when switching tabs
  useEffect(() => {
    table.setPageIndex(0);
    table.setPageSize(pageSize);
  }, [activeTab, pageSize]);

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
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
            <CardTitle className="text-slate-100 text-lg md:text-xl">Data Table</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              <Input
                placeholder="Search..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full sm:max-w-sm bg-slate-800 border-slate-700 text-slate-100 text-sm md:text-base"
              />
              <DropdownMenu open={showTemplateMenu} onOpenChange={setShowTemplateMenu}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-slate-800 border-slate-700 text-slate-100"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Templates
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-800 border-slate-700 text-slate-100 w-56">
                  <DropdownMenuLabel>Templates</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem
                    onClick={() => {
                      setShowSaveTemplateDialog(true);
                      setShowTemplateMenu(false);
                    }}
                    className="cursor-pointer focus:bg-slate-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Current View
                  </DropdownMenuItem>
                  {Object.keys(templates).length > 0 && (
                    <>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuLabel>Load Template</DropdownMenuLabel>
                      {Object.keys(templates).map((templateName) => (
                        <DropdownMenuItem
                          key={templateName}
                          onClick={() => loadTemplate(templateName)}
                          className="cursor-pointer focus:bg-slate-700"
                        >
                          <FolderOpen className="h-4 w-4 mr-2" />
                          {templateName}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuLabel>Delete Template</DropdownMenuLabel>
                      {Object.keys(templates).map((templateName) => (
                        <DropdownMenuItem
                          key={templateName}
                          onClick={() => deleteTemplate(templateName)}
                          className="cursor-pointer focus:bg-slate-700 text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {templateName}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                onClick={() => setShowColumnSelector(true)}
                className="bg-slate-800 border-slate-700 text-slate-100 text-xs md:text-sm"
                size="sm"
              >
                <Settings2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Columns</span>
                <span className="sm:hidden">Cols</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                className="bg-slate-800 border-slate-700 text-slate-100 text-xs md:text-sm"
                size="sm"
              >
                <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Export</span>
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

          <div className="rounded-md border border-slate-800 mt-4 overflow-x-auto overflow-y-auto max-h-[calc(100vh-200px)] md:max-h-[calc(100vh-300px)] -mx-4 md:mx-0">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-900 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-slate-800 hover:bg-slate-800/50">
                    {headerGroup.headers.map((header) => {
                      const isCompanyColumn = header.column.id.toLowerCase() === 'company' || header.column.id.toLowerCase() === 'name';
                      return (
                      <TableHead
                        key={header.id}
                        className={`text-slate-300 font-mono text-[10px] md:text-xs cursor-pointer select-none whitespace-nowrap bg-slate-900 px-2 md:px-4 ${isCompanyColumn ? 'w-[120px] md:w-[150px] max-w-[120px] md:max-w-[150px]' : ''}`}
                        onClick={header.column.getToggleSortingHandler()}
                        style={isCompanyColumn ? { width: '150px', maxWidth: '150px' } : undefined}
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
                      className="border-slate-800 hover:bg-slate-800/50 cursor-pointer"
                      onClick={() => setSelectedStock(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="font-mono text-[10px] md:text-xs text-slate-300 py-1 md:py-2 whitespace-nowrap px-2 md:px-4"
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

          {usePagination && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2">
              <div className="text-xs md:text-sm text-slate-400">
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}{" "}
                of {table.getFilteredRowModel().rows.length} entries
              </div>
              <div className="flex items-center gap-1 md:gap-2">
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
          )}
          {!usePagination && (
            <div className="mt-4 text-sm text-slate-400">
              Showing all {table.getFilteredRowModel().rows.length} entries
            </div>
          )}
        </CardContent>
      </Card>

      {showColumnSelector && (
        <ColumnSelector
          allColumns={allColumns}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
          columnCategories={columnCategories}
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

      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
            <DialogDescription className="text-slate-400">
              Save your current column configuration as a template for quick access.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Template name..."
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTemplateName.trim()) {
                  saveCurrentAsTemplate();
                }
              }}
              className="bg-slate-800 border-slate-700 text-slate-100"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveTemplateDialog(false);
                setNewTemplateName("");
              }}
              className="bg-slate-800 border-slate-700 text-slate-100"
            >
              Cancel
            </Button>
            <Button
              onClick={saveCurrentAsTemplate}
              disabled={!newTemplateName.trim()}
              className="bg-slate-700 hover:bg-slate-600 text-slate-100"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatColumnName(name: string): string {
  // Common financial acronyms that should not be split (case-insensitive matching)
  const acronyms = ['EBITDA', 'FCF', 'GP', 'PE', 'P/E', 'EV', 'ROE', 'ROA', 'ROIC', 'EPS', 'DPS', 'CAGR', 'YTD', 'TTM', 'LTM', 'NOPAT', 'WACC', 'DCF', 'NPV', 'IRR', 'P/E', 'EV/EBITDA'];
  
  // First, replace underscores with spaces
  let formatted = name.replace(/_/g, " ");
  
  // Protect slashes - ensure no spaces around them
  formatted = formatted.replace(/\s*\/\s*/g, '/');
  
  // Protect acronyms by temporarily replacing them with placeholders
  const acronymMap = new Map<string, string>();
  acronyms.forEach((acronym, index) => {
    const placeholder = `__ACRONYM${index}__`;
    // Match acronym case-insensitively, as whole words
    const regex = new RegExp(`\\b${acronym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(formatted)) {
      formatted = formatted.replace(regex, placeholder);
      acronymMap.set(placeholder, acronym);
    }
  });
  
  // Now add spaces before capital letters (camelCase -> camel Case)
  // But only if not preceded by a slash or number
  formatted = formatted.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  
  // Restore acronyms
  acronymMap.forEach((acronym, placeholder) => {
    formatted = formatted.replace(new RegExp(placeholder, 'g'), acronym);
  });
  
  // Capitalize first letter of each word
  formatted = formatted.replace(/\b\w/g, (l) => l.toUpperCase());
  
  // Clean up multiple spaces
  formatted = formatted.replace(/\s+/g, ' ').trim();
  
  return formatted;
}

// Clean company names by removing common suffixes and truncating
function cleanCompanyName(name: string): string {
  if (!name) return name;
  
  // Remove common suffixes (case-insensitive, with various punctuation)
  let cleaned = name
    .replace(/\s+(Inc|Incorporated|Corp|Corporation|Ltd|Limited|LLC|LLP|PLC|Holding|Holdings|Holdings Ltd|Holdings Inc|Holdings Corp|Group|Co|Company|Co\.|S\.A\.|S\.A|NV|N\.V\.|ADR|Unsponsored|Sponsored).*$/i, '')
    .replace(/\s+-\s+.*$/i, '') // Remove everything after " - " (like " - ADR Representing...")
    .trim();
  
  // Truncate to 20 characters with ellipsis
  if (cleaned.length > 20) {
    cleaned = cleaned.substring(0, 20) + '...';
  }
  
  return cleaned;
}

function formatCellValue(value: string, columnKey: string, isNumeric: boolean, category?: string): React.ReactNode {
  if (!value || value === "" || value === "#N/A" || value === "#DIV/0!") {
    return <span className="text-slate-500">-</span>;
  }

  const columnKeyLower = columnKey.toLowerCase();
  const categoryLower = category?.toLowerCase() || "";

  // Earnings Checklist: Text
  if (categoryLower.includes("earnings checklist")) {
    return <span className="text-slate-300">{value}</span>;
  }

  // Earnings Comps: Earnings Date = Date, everything else = Currency
  if (categoryLower.includes("earnings comps")) {
    if (columnKeyLower.includes("earnings date") || columnKeyLower.includes("date")) {
      return <span className="text-slate-300">{formatDate(value)}</span>;
    }
    if (isNumeric) {
      const num = parseNumeric(value);
      if (num !== null) {
        return <span className="text-slate-300">{formatCurrency(num)}</span>;
      }
    }
    return <span className="text-slate-300">{value}</span>;
  }

  // Earnings Expectations: Currency and then Percentages
  if (categoryLower.includes("earnings expectations")) {
    if (isNumeric) {
      const num = parseNumeric(value);
      if (num !== null) {
        // Check if it's a percentage column (usually has % in name or is a ratio)
        if (columnKeyLower.includes("percent") || columnKeyLower.includes("%") || 
            columnKeyLower.includes("ratio") || columnKeyLower.includes("margin") ||
            columnKeyLower.includes("growth") || columnKeyLower.includes("change")) {
          const colorClass = num > 0 ? "text-green-400" : num < 0 ? "text-red-400" : "text-slate-300";
          return <span className={colorClass}>{formatPercentage(num)}</span>;
        }
        return <span className="text-slate-300">{formatCurrency(num)}</span>;
      }
    }
    return <span className="text-slate-300">{value}</span>;
  }

  // Earnings Results: Revenue (Currency) and then Percentages
  if (categoryLower.includes("earnings results")) {
    if (isNumeric) {
      const num = parseNumeric(value);
      if (num !== null) {
        if (columnKeyLower.includes("revenue")) {
          return <span className="text-slate-300">{formatCurrency(num)}</span>;
        }
        // Everything else is percentage
        const colorClass = num > 0 ? "text-green-400" : num < 0 ? "text-red-400" : "text-slate-300";
        return <span className={colorClass}>{formatPercentage(num)}</span>;
      }
    }
    return <span className="text-slate-300">{value}</span>;
  }

  // Price Action (not 52W): Price is Currency, everything else is Percentages
  if (categoryLower.includes("price action") && !categoryLower.includes("52w")) {
    if (isNumeric) {
      const num = parseNumeric(value);
      if (num !== null) {
        if (columnKeyLower.includes("price") && !columnKeyLower.includes("change") && 
            !columnKeyLower.includes("%") && !columnKeyLower.includes("percent") &&
            !columnKeyLower.includes("52w")) {
          return <span className="text-slate-300">{formatCurrency(num)}</span>;
        }
        // Everything else is percentage
        const colorClass = num > 0 ? "text-green-400" : num < 0 ? "text-red-400" : "text-slate-300";
        return <span className={colorClass}>{formatPercentage(num)}</span>;
      }
    }
    return <span className="text-slate-300">{value}</span>;
  }

  // Fundamentals: Mix - FCF Yield is %, P/E is multiple with "x"
  if (categoryLower.includes("fundamentals") || categoryLower.includes("fundementals")) {
    if (isNumeric) {
      const num = parseNumeric(value);
      if (num !== null) {
        if (columnKeyLower.includes("fcf yield") || columnKeyLower.includes("yield")) {
          return <span className="text-slate-300">{formatPercentage(num)}</span>;
        }
        if (columnKeyLower.includes("p/e") || columnKeyLower.includes("pe") || 
            columnKeyLower.includes("multiple") || columnKeyLower.includes("p/fcf") ||
            columnKeyLower.includes("ev/") || columnKeyLower.includes("p/s")) {
          return <span className="text-slate-300">{formatMultiple(num)}</span>;
        }
        // Default to currency for other numeric values
        return <span className="text-slate-300">{formatCurrency(num)}</span>;
      }
    }
    return <span className="text-slate-300">{value}</span>;
  }

  // Historical Financials: Currency in Billions, then Percentages for Gross Margin
  if (categoryLower.includes("historical financials")) {
    if (isNumeric) {
      const num = parseNumeric(value);
      if (num !== null) {
        if (columnKeyLower.includes("margin") || columnKeyLower.includes("percent") || 
            columnKeyLower.includes("%") || columnKeyLower.includes("ratio")) {
          return <span className="text-slate-300">{formatPercentage(num)}</span>;
        }
        // Revenue, EBITDA, FCF, etc. in billions
        return <span className="text-slate-300">{formatCurrencyBillions(num)}</span>;
      }
    }
    return <span className="text-slate-300">{value}</span>;
  }

  // Historical Margins/Growth: Percentages
  if (categoryLower.includes("historical margins") || categoryLower.includes("historical growth")) {
    if (isNumeric) {
      const num = parseNumeric(value);
      if (num !== null) {
        const colorClass = num > 0 ? "text-green-400" : num < 0 ? "text-red-400" : "text-slate-300";
        return <span className={colorClass}>{formatPercentage(num)}</span>;
      }
    }
    return <span className="text-slate-300">{value}</span>;
  }

  // Forward Estimates: Currency in Billions (except EPS which is regular currency)
  // Handle variations like "Forward Estimates (12/9)" or just "Forward Estimates"
  // Note: Google Sheets may already format values in billions, so we need to detect the scale
  if (categoryLower.includes("forward estimates") || 
      (categoryLower.includes("forward") && categoryLower.includes("estimate") && !categoryLower.includes("growth"))) {
    // Try to parse as numeric even if not initially detected as numeric
    const num = parseNumeric(value);
    if (num !== null) {
      // EPS columns should be formatted as regular currency, not billions
      // Check for EPS in column name (case-insensitive)
      if (columnKeyLower.includes("eps") || 
          columnKeyLower.includes("earnings per share") ||
          columnKeyLower.includes("earnings/share")) {
        return <span className="text-slate-300">{formatCurrency(num)}</span>;
      }
      // Everything else in Forward Estimates is in billions
      // Only format as billions if the value is actually meaningful (not zero or very small)
      if (num === 0 || Math.abs(num) < 0.001) {
        return <span className="text-slate-500">-</span>;
      }
      
      // Google Sheets may export values in different scales. 
      // If the value is less than 1000, it's likely already in billions (e.g., 29.51 for $29.51B)
      // If it's 1000-1e6, it might be in millions
      // If it's > 1e6, it's likely in raw units (thousands or actual value)
      // We'll use a heuristic: if value < 1000, treat as already in billions; otherwise divide by 1e9
      if (Math.abs(num) < 1000) {
        // Already appears to be in billions format (e.g., 29.51)
        // Multiply by 1e9 to get the actual value, then format
        return <span className="text-slate-300">{formatCurrencyBillions(num * 1e9)}</span>;
      } else if (Math.abs(num) < 1e6) {
        // Might be in millions, convert to billions
        return <span className="text-slate-300">{formatCurrencyBillions(num * 1e3)}</span>;
      } else {
        // Raw value (likely in actual dollars), convert to billions
        return <span className="text-slate-300">{formatCurrencyBillions(num)}</span>;
      }
    }
    // If parsing fails, return the raw value
    return <span className="text-slate-300">{value || "-"}</span>;
  }

  // Forward Growth Estimates: Percentages
  // Handle both "Forward" and "Foward" (typo) variations
  // Check for various category name patterns
  const isForwardGrowthCategory = 
      categoryLower.includes("forward growth estimates") || 
      categoryLower.includes("foward growth estimates") ||
      categoryLower.includes("forward growth") ||
      categoryLower.includes("foward growth") ||
      (categoryLower.includes("forward") && categoryLower.includes("growth")) ||
      (categoryLower.includes("foward") && categoryLower.includes("growth"));
  
  if (isForwardGrowthCategory) {
    // Try to parse as numeric even if not initially detected as numeric
    const num = parseNumeric(value);
    if (num !== null) {
      const colorClass = num > 0 ? "text-green-400" : num < 0 ? "text-red-400" : "text-slate-300";
      return <span className={colorClass}>{formatPercentage(num)}</span>;
    }
    return <span className="text-slate-300">{value}</span>;
  }

  // Forward Multiples: Number with "x" at end
  if (categoryLower.includes("forward multiples")) {
    if (isNumeric) {
      const num = parseNumeric(value);
      if (num !== null) {
        return <span className="text-slate-300">{formatMultiple(num)}</span>;
      }
    }
    return <span className="text-slate-300">{value}</span>;
  }

  // Moving Averages: Currency for first two, then Percentages
  if (categoryLower.includes("moving averages")) {
    if (isNumeric) {
      const num = parseNumeric(value);
      if (num !== null) {
        // First two columns are typically price columns
        // Check if it's a price column (not a percentage column)
        if ((columnKeyLower.includes("high") || columnKeyLower.includes("low") || 
             columnKeyLower.includes("price") || columnKeyLower.includes("average")) && 
            !columnKeyLower.includes("%") && !columnKeyLower.includes("percent") &&
            !columnKeyLower.includes("change")) {
          return <span className="text-slate-300">{formatCurrency(num)}</span>;
        }
        // Everything else is percentage
        const colorClass = num > 0 ? "text-green-400" : num < 0 ? "text-red-400" : "text-slate-300";
        return <span className={colorClass}>{formatPercentage(num)}</span>;
      }
    }
    return <span className="text-slate-300">{value}</span>;
  }

  // 52W Price Action: Currency for first two, then Percentages
  if (categoryLower.includes("52w price action") || categoryLower.includes("52w")) {
    if (isNumeric) {
      const num = parseNumeric(value);
      if (num !== null) {
        // First two columns are typically "52w High" and "52w Low"
        if ((columnKeyLower.includes("52w high") || columnKeyLower.includes("52w low") || 
             (columnKeyLower.includes("high") && columnKeyLower.includes("52")) ||
             (columnKeyLower.includes("low") && columnKeyLower.includes("52"))) && 
            !columnKeyLower.includes("%") && !columnKeyLower.includes("percent") &&
            !columnKeyLower.includes("change")) {
          return <span className="text-slate-300">{formatCurrency(num)}</span>;
        }
        // Everything else is percentage
        const colorClass = num > 0 ? "text-green-400" : num < 0 ? "text-red-400" : "text-slate-300";
        return <span className={colorClass}>{formatPercentage(num)}</span>;
      }
    }
    return <span className="text-slate-300">{value}</span>;
  }

  // Fallback: Use original logic for uncategorized columns
  if (isNumeric) {
    const num = parseNumeric(value);
    if (num === null) return <span className="text-slate-300">{value}</span>;

    const isGainColumn = columnKeyLower.includes("gain") ||
      columnKeyLower.includes("change") ||
      columnKeyLower.includes("return") ||
      columnKeyLower.includes("growth");

    if (isGainColumn) {
      const colorClass = num > 0 ? "text-green-400" : num < 0 ? "text-red-400" : "text-slate-300";
      return <span className={colorClass}>{formatPercentage(num)}</span>;
    }

    // Market Cap and Enterprise Value should be in billions format
    if (columnKeyLower.includes("market cap") || columnKeyLower.includes("enterprise value") || 
        (columnKeyLower.includes("ev") && !columnKeyLower.includes("revenue"))) {
      return <span className="text-slate-300">{formatCurrencyBillions(num)}</span>;
    }

    // Check for multiples (P/E, P/FCF, EV/, P/S, etc.)
    if (columnKeyLower.includes("p/e") || columnKeyLower.includes("pe") || 
        columnKeyLower.includes("p/fcf") || columnKeyLower.includes("pfcf") ||
        columnKeyLower.includes("ev/") || columnKeyLower.includes("ev ") ||
        columnKeyLower.includes("p/s") || columnKeyLower.includes("ps") ||
        columnKeyLower.includes("multiple")) {
      return <span className="text-slate-300">{formatMultiple(num)}</span>;
    }

    if (columnKeyLower.includes("revenue") || columnKeyLower.includes("ebitda") || 
        columnKeyLower.includes("fcf") || columnKeyLower.includes("cap")) {
      return <span className="text-slate-300">{formatCurrency(num)}</span>;
    }

    return <span className="text-slate-300">{formatNumber(num)}</span>;
  }

  return <span className="text-slate-300">{value}</span>;
}

