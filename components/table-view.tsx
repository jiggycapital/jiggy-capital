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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CriteriaPicker } from "@/components/criteria-picker";
import { fetchSheetData, parseSheetData, fetchLogos, extractColumnCategories } from "@/lib/google-sheets";
import { formatCurrency, formatCurrencyBillions, formatMultiple, formatNumber, formatPercentage, formatDate, parseNumeric } from "@/lib/utils";
import { StockDetailSheet } from "@/components/stock-detail-sheet";
import { Settings2, Download, Save, FolderOpen, Trash2, Wallet, Search, Layout, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function TableView() {
  const [positionsData, setPositionsData] = useState<any[]>([]);
  const [watchlistData, setWatchlistData] = useState<any[]>([]);
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [columnCategories, setColumnCategories] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"positions" | "watchlist" | "combined">("positions");
  const [selectedStock, setSelectedStock] = useState<any | null>(null);
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
  const [rawPositionsRows, setRawPositionsRows] = useState<string[][]>([]);

  useEffect(() => {
    loadData();
    loadTemplates();
  }, []);

  function loadTemplates() {
    try {
      const saved = localStorage.getItem('jiggy-table-templates-v2');
      if (saved) setTemplates(JSON.parse(saved));
    } catch (err) {}
  }

  function saveTemplates(newTemplates: Record<string, string[]>) {
    try {
      localStorage.setItem('jiggy-table-templates-v2', JSON.stringify(newTemplates));
      setTemplates(newTemplates);
    } catch (err) {}
  }

  function saveCurrentAsTemplate() {
    if (!newTemplateName.trim()) return;
    const newTemplates = { ...templates, [newTemplateName.trim()]: visibleColumns };
    saveTemplates(newTemplates);
    setShowSaveTemplateDialog(false);
    setNewTemplateName("");
  }

  function loadTemplate(templateName: string) {
    const template = templates[templateName];
    if (template) {
      const validColumns = template.filter(col => allColumns.includes(col));
      if (validColumns.length > 0) {
        handleColumnVisibilityChange(validColumns);
      }
    }
    setShowTemplateMenu(false);
  }

  async function loadData() {
    try {
      setLoading(true);
      const [positionsRows, watchlistRows, logosData] = await Promise.all([
        fetchSheetData("positions"),
        fetchSheetData("watchlist"),
        fetchLogos(),
      ]);
      
      setRawPositionsRows(positionsRows);
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

  const allColumns = useMemo(() => {
    if (currentData.length === 0) return [];
    const keys = new Set<string>();
    currentData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key && key.trim() !== "" && !key.startsWith('_')) keys.add(key);
      });
    });
    return Array.from(keys);
  }, [currentData]);

  const visibleColumns = useMemo(() => {
    if (columnOrder.length === 0) {
      const defaults = ['Ticker', 'Company', 'Market Cap', 'Change %', '2026e P/E', 'PEG'];
      return allColumns.filter(c => defaults.some(d => c.toLowerCase().includes(d.toLowerCase()))).slice(0, 10);
    }
    return columnOrder.filter(col => columnVisibility[col] !== false);
  }, [columnOrder, columnVisibility, allColumns]);

  const columns = useMemo<ColumnDef<any>[]>(() => {
    return visibleColumns.map(key => {
      const isTicker = key.toLowerCase() === 'ticker' || key.toLowerCase() === 'symbol';
      const isMarketCap = key.toLowerCase().includes("market cap") || key.toLowerCase().includes("ev");
      
      return {
        accessorKey: key,
        header: key,
        cell: ({ row }) => {
          const value = row.getValue(key);
          if (isTicker) {
            const ticker = String(value).toUpperCase();
            const name = row.original.Name || row.original.Company || "";
            return (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 overflow-hidden">
                  {logos[ticker] ? (
                    <img src={logos[ticker]} alt="" className="w-5 h-5 object-contain" />
                  ) : (
                    <span className="text-[9px] font-bold text-slate-500">{ticker.substring(0, 3)}</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-bold text-slate-100 leading-tight truncate">{ticker}</span>
                  {name && (
                    <span className="text-[9px] text-slate-500 truncate uppercase tracking-tighter leading-tight">
                      {name}
                    </span>
                  )}
                </div>
              </div>
            );
          }
          let numVal = parseNumeric(String(value || ""));
          if (isMarketCap && numVal !== null && numVal > 5000) {
            numVal = numVal / 1000;
          }
          return formatCellValue(isMarketCap && numVal !== null ? `${numVal}` : String(value || ""), key, numVal !== null, columnCategories[key]);
        },
        sortingFn: (rowA, rowB) => {
          const valA = rowA.getValue(key);
          const valB = rowB.getValue(key);
          
          if (isTicker || typeof valA === 'string') {
            const a = String(valA || "").toLowerCase();
            const b = String(valB || "").toLowerCase();
            
            // Try numeric sort first if they look like numbers but parseNumeric failed (e.g. string with extra chars)
            const numA = parseNumeric(a);
            const numB = parseNumeric(b);
            
            if (numA !== null && numB !== null) {
              return numA - numB;
            }
            
            return a.localeCompare(b);
          }

          let a = parseNumeric(String(valA || "")) ?? -Infinity;
          let b = parseNumeric(String(valB || "")) ?? -Infinity;
          
          if (isMarketCap) {
            if (a > 5000) a = a / 1000;
            if (b > 5000) b = b / 1000;
          }
          
          return a - b;
        },
      };
    });
  }, [visibleColumns, logos, columnCategories]);

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
      pagination: {
        pageIndex: 0,
        pageSize: 50,
      },
    },
  });

  const handleColumnVisibilityChange = (columns: string[]) => {
    const newVisibility: VisibilityState = {};
    allColumns.forEach(col => {
      newVisibility[col] = columns.includes(col);
    });
    setColumnVisibility(newVisibility);
    setColumnOrder(columns);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px] text-slate-400">Loading data...</div>;
  if (error) return <div className="flex items-center justify-center min-h-[400px] text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-4">
      <Card className="bg-[#0f172a] border-slate-800 shadow-2xl">
        <CardHeader className="p-6 border-b border-slate-800/50">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-slate-100 text-xl font-bold tracking-tight">Data Table</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Unified view of holdings and watchlist</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search Tickers..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9 bg-[#1e293b] border-slate-700 text-slate-100 h-9"
                />
              </div>
              
              <DropdownMenu open={showTemplateMenu} onOpenChange={setShowTemplateMenu}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-[#1e293b] border-slate-700 text-slate-300">
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Templates
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#1e293b] border-slate-700 text-slate-100 w-56">
                  <DropdownMenuItem onClick={() => { setShowSaveTemplateDialog(true); setShowTemplateMenu(false); }} className="cursor-pointer">
                    <Save className="h-4 w-4 mr-2" />
                    Save Current View
                  </DropdownMenuItem>
                  {Object.keys(templates).length > 0 && (
                    <>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-500">Saved Layouts</DropdownMenuLabel>
                      {Object.keys(templates).map((name) => (
                        <DropdownMenuItem key={name} onClick={() => loadTemplate(name)} className="cursor-pointer">
                          <Layout className="h-4 w-4 mr-2" />
                          {name}
                          <Button variant="ghost" size="icon" className="ml-auto h-4 w-4 text-rose-400" onClick={(e) => { e.stopPropagation(); const next = { ...templates }; delete next[name]; saveTemplates(next); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowColumnSelector(true)} 
                className="bg-blue-600 hover:bg-blue-700 border-none text-white font-bold"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Modify Columns
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="px-6 py-4 bg-[#0a0f1d] border-b border-slate-800 flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
              <TabsList className="bg-[#1e293b] border-slate-700">
                <TabsTrigger value="positions" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs font-bold px-4">Holdings</TabsTrigger>
                <TabsTrigger value="watchlist" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs font-bold px-4">Watchlist</TabsTrigger>
                <TabsTrigger value="combined" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs font-bold px-4">Combined</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {currentData.length} Companies
            </div>
          </div>

          <div className="overflow-x-auto relative min-h-[400px]">
            <Table>
              <TableHeader className="bg-[#0f172a] sticky top-0 z-10 shadow-xl">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-slate-800 hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="text-slate-400 font-bold py-4">
                        <div 
                          className={cn(
                            "flex items-center gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors",
                            header.id !== 'ticker' && "justify-end"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span className="whitespace-normal leading-tight max-w-[100px] text-[11px] uppercase tracking-wider">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {header.column.getIsSorted() ? (
                            header.column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-20" />
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => setSelectedStock(row.original)}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className={cn("py-3", cell.column.id !== 'ticker' && "text-right")}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={columns.length} className="h-32 text-center text-slate-500">No results found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {showColumnSelector && (
        <CriteriaPicker
          title="Modify Columns"
          allCriteria={allColumns}
          selectedCriteria={visibleColumns}
          criteriaCategories={columnCategories}
          onClose={() => setShowColumnSelector(false)}
          onSave={(cols) => { handleColumnVisibilityChange(cols); setShowColumnSelector(false); }}
        />
      )}

      {selectedStock && <StockDetailSheet stock={selectedStock} open={!!selectedStock} onOpenChange={(open) => !open && setSelectedStock(null)} />}

      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent className="bg-[#0f172a] border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>Save Layout Template</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input placeholder="Template name..." value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} className="bg-slate-900 border-slate-800" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSaveTemplateDialog(false)}>Cancel</Button>
            <Button onClick={saveCurrentAsTemplate} className="bg-blue-600 hover:bg-blue-700">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatCellValue(value: string, columnKey: string, isNumeric: boolean, category?: string): React.ReactNode {
  if (!value || value === "" || value === "#N/A" || value === "#DIV/0!") return <span className="text-slate-600">-</span>;
  const col = columnKey.toLowerCase();
  const cat = category?.toLowerCase() || "";
  const num = parseNumeric(value);

  if (num !== null) {
    if (cat.includes("price action") || cat.includes("growth") || col.includes("%") || col.includes("change")) {
      return <span className={cn("font-mono", num >= 0 ? "text-emerald-400" : "text-rose-400")}>{formatPercentage(num)}</span>;
    }
    if (cat.includes("multiples") || col.includes("p/e") || col.includes("p/fcf") || col.includes("peg")) {
      return <span className="font-mono text-slate-300">{num.toFixed(1)}x</span>;
    }
    if (col.includes("market cap") || col.includes("ev")) return <span className="font-mono text-slate-300">${num.toFixed(1)}B</span>;
    if (col.includes("price")) return <span className="font-mono text-slate-300">{formatCurrency(num)}</span>;
    return <span className="font-mono text-slate-300">{formatNumber(num)}</span>;
  }
  return <span className="text-slate-400 text-xs">{value}</span>;
}
