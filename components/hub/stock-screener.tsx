"use client";

import { useState, useMemo, useEffect } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Star, 
  Trash2, 
  Plus,
  Filter,
  X,
  ChevronDown,
  Settings2,
  SlidersHorizontal
} from "lucide-react";
import { parseNumeric, formatCurrency, formatPercentage } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CriteriaPicker } from "@/components/criteria-picker";
import { extractColumnCategories } from "@/lib/google-sheets";

interface StockScreenerProps {
  positionsData: any[];
  watchlistData: any[];
  logos: Record<string, string>;
  rawPositionsRows?: string[][];
  rawWatchlistRows?: string[][];
}

interface ScreenerRow {
  ticker: string;
  name: string;
  [key: string]: any;
}

interface FavoriteScreen {
  id: string;
  name: string;
  filters: ColumnFiltersState;
  sorting: SortingState;
  criteria: string[];
}

export function StockScreener({ 
  positionsData, 
  watchlistData, 
  logos, 
  rawPositionsRows,
  rawWatchlistRows 
}: StockScreenerProps) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [favorites, setFavorites] = useState<FavoriteScreen[]>([]);
  const [newScreenName, setNewScreenName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showCriteriaPicker, setShowCriteriaPicker] = useState(false);
  
  // Active criteria for screening
  const [activeCriteria, setActiveCriteria] = useState<string[]>([
    "2026e P/E", "25-27e Rev CAGR", "PEG", "Market Cap"
  ]);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("jiggy_screener_favorites_v2");
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  const saveFavorites = (newFavorites: FavoriteScreen[]) => {
    setFavorites(newFavorites);
    localStorage.setItem("jiggy_screener_favorites_v2", JSON.stringify(newFavorites));
  };

  const handleSaveScreen = () => {
    if (!newScreenName.trim()) return;
    const newScreen: FavoriteScreen = {
      id: Date.now().toString(),
      name: newScreenName,
      filters: columnFilters,
      sorting: sorting,
      criteria: activeCriteria,
    };
    saveFavorites([...favorites, newScreen]);
    setNewScreenName("");
    setIsSaving(false);
  };

  const handleDeleteScreen = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveFavorites(favorites.filter(f => f.id !== id));
  };

  const handleApplyScreen = (screen: FavoriteScreen) => {
    setActiveCriteria(screen.criteria);
    setTimeout(() => {
      setColumnFilters(screen.filters);
      setSorting(screen.sorting);
    }, 0);
  };

  const criteriaCategories = useMemo(() => {
    if (rawPositionsRows) {
      return extractColumnCategories(rawPositionsRows);
    }
    return {};
  }, [rawPositionsRows]);

  const allAvailableCriteria = useMemo(() => {
    if (positionsData.length > 0) {
      return Object.keys(positionsData[0]).filter(k => !k.startsWith('_'));
    }
    return [];
  }, [positionsData]);

  const tableData = useMemo(() => {
    const holdingsMap = new Map();
    positionsData.forEach(p => {
      const ticker = (p.Ticker || p.Symbol || "").toUpperCase();
      if (ticker && ticker !== "CASH" && ticker !== "SUM") {
        holdingsMap.set(ticker, p);
      }
    });

    const allTickers = new Set([
      ...holdingsMap.keys(),
      ...watchlistData.map(w => (w.Ticker || w.Symbol || "").toUpperCase()).filter(Boolean)
    ]);

    return Array.from(allTickers).map(ticker => {
      const holding = holdingsMap.get(ticker);
      const watchlist = watchlistData.find(w => (w.Ticker || w.Symbol || "").toUpperCase() === ticker);
      const source = holding || watchlist || {};

      const row: ScreenerRow = {
        ticker,
        name: source.Name || source.Company || ticker,
        isHolding: !!holding,
        sector: source.Sector || "Other",
      };

      // Map all available metrics
      allAvailableCriteria.forEach(key => {
        row[key] = source[key];
        const numVal = parseNumeric(source[key]);
        if (numVal !== null) {
          row[`${key}_num`] = numVal;
        }
      });

      return row;
    });
  }, [positionsData, watchlistData, allAvailableCriteria]);

  const columns = useMemo<ColumnDef<ScreenerRow>[]>(
    () => {
      const baseCols: ColumnDef<ScreenerRow>[] = [
        {
          accessorKey: "ticker",
          header: "Company",
          cell: ({ row }) => (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden border border-slate-700">
                {logos[row.original.ticker] ? (
                  <img src={logos[row.original.ticker]} alt="" className="w-4 h-4 object-contain" />
                ) : (
                  <span className="text-[8px] font-bold text-slate-500">{row.original.ticker.substring(0, 3)}</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-slate-100 leading-tight truncate">{row.original.ticker}</span>
                {row.original.isHolding && <span className="text-[8px] text-blue-400 font-bold uppercase tracking-tighter">Holding</span>}
              </div>
            </div>
          ),
        },
      ];

      const dynamicCols = activeCriteria.map(key => ({
        accessorKey: key,
        header: key,
        cell: ({ row }: any) => {
          const val = row.original[key];
          const numVal = row.original[`${key}_num`];
          const cat = criteriaCategories[key]?.toLowerCase() || "";
          
          if (numVal !== null && numVal !== undefined) {
            if (cat.includes("price action") || cat.includes("growth") || key.includes("%") || key.includes("Change")) {
              return <div className={cn("font-mono font-bold", numVal >= 0 ? "text-emerald-400" : "text-rose-400")}>{formatPercentage(numVal)}</div>;
            }
            if (cat.includes("multiples") || key.includes("P/E") || key.includes("P/FCF") || key.includes("PEG")) {
              return <div className="font-mono text-slate-300">{numVal.toFixed(1)}x</div>;
            }
            if (key.includes("Price")) return <div className="font-mono text-slate-300">{formatCurrency(numVal)}</div>;
            return <div className="font-mono text-slate-300">{val}</div>;
          }
          return <div className="text-slate-400 text-xs">{val || "-"}</div>;
        },
        sortingFn: (rowA: any, rowB: any) => {
          const a = rowA.original[`${key}_num`] ?? -Infinity;
          const b = rowB.original[`${key}_num`] ?? -Infinity;
          return a - b;
        },
        filterFn: "includesString",
      }));

      return [...baseCols, ...dynamicCols];
    },
    [logos, activeCriteria, criteriaCategories]
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Header & Favorites */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-600/20">
              <SlidersHorizontal className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Stock Screener</h1>
              <p className="text-sm text-slate-500">Unified universe of {tableData.length} companies</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700 border-none text-white gap-2 font-bold"
              onClick={() => setShowCriteriaPicker(true)}
            >
              <Plus className="h-4 w-4" />
              Modify Screen
            </Button>
            
            <Popover open={isSaving} onOpenChange={setIsSaving}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300 gap-2">
                  <Star className="h-4 w-4" />
                  Save View
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 bg-slate-900 border-slate-700 p-4 shadow-2xl">
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-slate-200">Save Current Screen</h4>
                  <Input
                    placeholder="Screen name..."
                    value={newScreenName}
                    onChange={(e) => setNewScreenName(e.target.value)}
                    className="bg-slate-950 border-slate-800 h-9 text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsSaving(false)}>Cancel</Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveScreen}>Save</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Favorites Bar */}
        {favorites.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-2 shrink-0">Favorites:</span>
            {favorites.map((fav) => (
              <div 
                key={fav.id}
                className="group flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-slate-800/40 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/60 transition-all cursor-pointer shrink-0"
                onClick={() => handleApplyScreen(fav)}
              >
                <span className="text-xs font-medium text-slate-300">{fav.name}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDeleteScreen(fav.id, e)}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col gap-4 bg-slate-900/40 border border-slate-800/60 p-4 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search Ticker..."
              value={(table.getColumn("ticker")?.getFilterValue() as string) ?? ""}
              onChange={(e) => table.getColumn("ticker")?.setFilterValue(e.target.value)}
              className="pl-9 bg-slate-950 border-slate-800 focus:border-blue-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest w-16">Sector:</div>
            <select 
              className="w-full h-9 bg-slate-950 border border-slate-800 rounded-md px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
              onChange={(e) => table.getColumn("sector")?.setFilterValue(e.target.value || undefined)}
            >
              <option value="">All Sectors</option>
              {Array.from(new Set(tableData.map(d => d.sector))).sort().map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          
          {/* Quick Filters for active criteria */}
          {activeCriteria.slice(0, 2).map(key => (
            <div key={key} className="flex items-center gap-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate w-24">{key}:</div>
              <Input
                placeholder="Filter..."
                className="bg-slate-950 border-slate-800 h-9 text-xs"
                onChange={(e) => table.getColumn(key)?.setFilterValue(e.target.value)}
              />
            </div>
          ))}
        </div>
        
        <div className="flex justify-end gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest gap-2"
            onClick={() => {
              table.resetColumnFilters();
              setSorting([]);
            }}
          >
            <X className="h-3 w-3" />
            Reset All
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto relative">
          <Table>
            <TableHeader className="bg-slate-800/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-slate-800 hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-slate-400 font-bold py-4">
                      {header.isPlaceholder ? null : (
                        <div 
                          className={cn(
                            "flex items-center gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors",
                            header.id !== 'ticker' && "justify-end"
                          )}
                          onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                        >
                          <span className="whitespace-normal leading-tight max-w-[100px] text-xs">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {header.column.getIsSorted() ? (
                            header.column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            header.column.getCanSort() && <ArrowUpDown className="h-3 w-3 opacity-30" />
                          )}
                        </div>
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
                    className="border-slate-800 hover:bg-slate-800/30 transition-colors group"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell 
                        key={cell.id} 
                        className={cn(
                          "py-3",
                          cell.column.id !== 'ticker' && "text-right"
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-slate-500">
                    No results found. Try adjusting your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between px-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
        <div>Total Universe: {tableData.length} Companies</div>
        <div>Matches: {table.getFilteredRowModel().rows.length}</div>
      </div>

      {showCriteriaPicker && (
        <CriteriaPicker
          allCriteria={allAvailableCriteria}
          selectedCriteria={activeCriteria}
          criteriaCategories={criteriaCategories}
          onClose={() => setShowCriteriaPicker(false)}
          onSave={(criteria) => {
            setActiveCriteria(criteria);
            setShowCriteriaPicker(false);
          }}
        />
      )}
    </div>
  );
}
