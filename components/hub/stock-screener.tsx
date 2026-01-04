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
  SlidersHorizontal,
  Layout,
  Globe,
  Briefcase,
  Target
} from "lucide-react";
import { parseNumeric, formatCurrency, formatPercentage, formatCurrencyBillions, formatNumber, formatMultiple } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  isHolding: boolean;
  [key: string]: any;
}

interface ActiveFilter {
  key: string;
  min?: string;
  max?: string;
  search?: string;
}

interface FavoriteScreen {
  id: string;
  name: string;
  filters: ColumnFiltersState;
  sorting: SortingState;
  activeFilters: ActiveFilter[];
}

export function StockScreener({ 
  positionsData, 
  watchlistData, 
  logos, 
  rawPositionsRows,
  rawWatchlistRows 
}: StockScreenerProps) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([
    { key: "2026e P/E" },
    { key: "25-27e Rev CAGR" },
    { key: "Market Cap" }
  ]);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'Market Cap', desc: true }]);
  const [favorites, setFavorites] = useState<FavoriteScreen[]>([]);
  const [newScreenName, setNewScreenName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showCriteriaPicker, setShowCriteriaPicker] = useState(false);
  const [globalTickerSearch, setGlobalTickerSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("All Sectors");

  // Load favorites
  useEffect(() => {
    const saved = localStorage.getItem("jiggy_screener_favorites_v3");
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveFavorites = (newFavorites: FavoriteScreen[]) => {
    setFavorites(newFavorites);
    localStorage.setItem("jiggy_screener_favorites_v3", JSON.stringify(newFavorites));
  };

  const handleSaveScreen = () => {
    if (!newScreenName.trim()) return;
    const newScreen: FavoriteScreen = {
      id: Date.now().toString(),
      name: newScreenName,
      filters: [],
      sorting: sorting,
      activeFilters: activeFilters,
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
    setActiveFilters(screen.activeFilters);
    setSorting(screen.sorting);
  };

  const criteriaCategories = useMemo(() => {
    const cats: Record<string, string> = {};
    if (rawPositionsRows) Object.assign(cats, extractColumnCategories(rawPositionsRows));
    if (rawWatchlistRows) Object.assign(cats, extractColumnCategories(rawWatchlistRows));
    return cats;
  }, [rawPositionsRows, rawWatchlistRows]);

  const allAvailableCriteria = useMemo(() => {
    const keys = new Set<string>();
    [...positionsData, ...watchlistData].forEach(row => {
      Object.keys(row).forEach(k => {
        if (!k.startsWith('_') && k !== 'ticker' && k !== 'name' && k !== 'isHolding') {
          keys.add(k);
        }
      });
    });
    return Array.from(keys).sort();
  }, [positionsData, watchlistData]);

  const tableData = useMemo(() => {
    const holdingsMap = new Map();
    positionsData.forEach(p => {
      const ticker = (p.Ticker || p.Symbol || "").toUpperCase();
      if (ticker && ticker !== "CASH" && ticker !== "SUM") holdingsMap.set(ticker, p);
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

      allAvailableCriteria.forEach(key => {
        row[key] = source[key];
        const numVal = parseNumeric(source[key]);
        if (numVal !== null) row[`${key}_num`] = numVal;
      });

      return row;
    });
  }, [positionsData, watchlistData, allAvailableCriteria]);

  // Apply custom filtering logic based on activeFilters state
  const filteredData = useMemo(() => {
    return tableData.filter(row => {
      // 1. Ticker Search
      if (globalTickerSearch && !row.ticker.toLowerCase().includes(globalTickerSearch.toLowerCase())) return false;
      
      // 2. Sector Filter
      if (selectedSector !== "All Sectors" && row.sector !== selectedSector) return false;

      // 3. Dynamic Criteria Filters
      for (const filter of activeFilters) {
        const val = row[filter.key];
        const numVal = row[`${filter.key}_num`];

        if (numVal !== undefined && numVal !== null) {
          if (filter.min && numVal < parseFloat(filter.min)) return false;
          if (filter.max && numVal > parseFloat(filter.max)) return false;
        } else if (filter.search && val) {
          if (!String(val).toLowerCase().includes(filter.search.toLowerCase())) return false;
        }
      }
      return true;
    });
  }, [tableData, globalTickerSearch, selectedSector, activeFilters]);

  const columns = useMemo<ColumnDef<ScreenerRow>[]>(() => {
    const base: ColumnDef<ScreenerRow>[] = [
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

    const dynamic = activeFilters.map(f => ({
      accessorKey: f.key,
      header: f.key,
      cell: ({ row }: any) => {
        const val = row.original[f.key];
        const numVal = row.original[`${f.key}_num`];
        const cat = criteriaCategories[f.key]?.toLowerCase() || "";
        
        if (numVal !== null && numVal !== undefined) {
          if (cat.includes("price action") || cat.includes("growth") || f.key.includes("%") || f.key.includes("Change")) {
            return <div className={cn("font-mono font-bold", numVal >= 0 ? "text-emerald-400" : "text-rose-400")}>{formatPercentage(numVal)}</div>;
          }
          if (cat.includes("multiples") || f.key.includes("P/E") || f.key.includes("P/FCF") || f.key.includes("PEG")) {
            return <div className="font-mono text-slate-300">{numVal.toFixed(1)}x</div>;
          }
          if (f.key.toLowerCase().includes("market cap") || f.key.toLowerCase().includes("ev")) {
            return <div className="font-mono text-slate-300">{formatCurrencyBillions(numVal)}</div>;
          }
          if (f.key.toLowerCase().includes("price")) return <div className="font-mono text-slate-300">{formatCurrency(numVal)}</div>;
          return <div className="font-mono text-slate-300">{val}</div>;
        }
        return <div className="text-slate-400 text-xs truncate max-w-[120px]">{val || "-"}</div>;
      },
      sortingFn: (rowA: any, rowB: any) => {
        const a = rowA.original[`${f.key}_num`] ?? (typeof rowA.original[f.key] === 'string' ? rowA.original[f.key] : -Infinity);
        const b = rowB.original[`${f.key}_num`] ?? (typeof rowB.original[f.key] === 'string' ? rowB.original[f.key] : -Infinity);
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return String(a).localeCompare(String(b));
      },
    }));

    return [...base, ...dynamic];
  }, [logos, activeFilters, criteriaCategories]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const updateFilter = (key: string, updates: Partial<ActiveFilter>) => {
    setActiveFilters(prev => prev.map(f => f.key === key ? { ...f, ...updates } : f));
  };

  const removeFilter = (key: string) => {
    setActiveFilters(prev => prev.filter(f => f.key !== key));
  };

  const handleApplyCriteria = (selected: string[]) => {
    // Keep existing filters if they are still selected, add new ones
    setActiveFilters(prev => {
      const existing = prev.filter(f => selected.includes(f.key));
      const newKeys = selected.filter(s => !prev.find(f => f.key === s));
      return [...existing, ...newKeys.map(k => ({ key: k }))];
    });
    setShowCriteriaPicker(false);
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            <SlidersHorizontal className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase">Stock Screener</h1>
            <p className="text-slate-500 font-medium">Custom screens across {tableData.length} global securities</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {favorites.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-[#1e293b] border-slate-700 text-slate-300">
                  <Star className="h-4 w-4 mr-2" />
                  My Saved Screens
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1e293b] border-slate-700 text-white w-56">
                {favorites.map(f => (
                  <DropdownMenuItem key={f.id} onClick={() => handleApplyScreen(f)} className="flex items-center justify-between cursor-pointer group">
                    <span>{f.name}</span>
                    <Trash2 className="h-3 w-3 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleDeleteScreen(f.id, e)} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={() => setIsSaving(true)} variant="outline" className="bg-slate-900 border-slate-700 text-slate-400 hover:text-white">
            <Star className="h-4 w-4 mr-2" />
            Save View
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Creation perspective - Sidebar-style filters */}
        <div className="lg:col-span-4 space-y-6">
          {/* STEP 1: Universe */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-[10px] font-bold text-white">1</div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Define your universe</h2>
            </div>
            
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Ticker Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input 
                    placeholder="Filter by symbols..." 
                    className="pl-10 bg-[#0a0f1d] border-slate-800 h-11 focus:border-blue-500/50 transition-all"
                    value={globalTickerSearch}
                    onChange={(e) => setGlobalTickerSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Sector / Industry</label>
                <select 
                  className="w-full h-11 bg-[#0a0f1d] border border-slate-800 rounded-xl px-4 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                >
                  <option value="All Sectors">All Sectors</option>
                  {Array.from(new Set(tableData.map(d => d.sector))).sort().map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* STEP 2: Criteria */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-[10px] font-bold text-white">2</div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Filter Results</h2>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-2 space-y-1 shadow-xl overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {activeFilters.map((filter) => {
                  const isNumeric = rowHasNumericVal(tableData, filter.key);
                  return (
                    <div key={filter.key} className="bg-[#0a0f1d] border border-slate-800/50 rounded-xl p-4 space-y-3 relative group">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter truncate max-w-[180px]">
                            {criteriaCategories[filter.key] || "General"}
                          </div>
                          <div className="text-xs font-bold text-slate-200">{filter.key}</div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10"
                          onClick={() => removeFilter(filter.key)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {isNumeric ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Min</span>
                            <Input 
                              type="number" 
                              placeholder="Any" 
                              className="h-8 bg-[#1e293b] border-none text-xs"
                              value={filter.min || ""}
                              onChange={(e) => updateFilter(filter.key, { min: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Max</span>
                            <Input 
                              type="number" 
                              placeholder="Any" 
                              className="h-8 bg-[#1e293b] border-none text-xs"
                              value={filter.max || ""}
                              onChange={(e) => updateFilter(filter.key, { max: e.target.value })}
                            />
                          </div>
                        </div>
                      ) : (
                        <Input 
                          placeholder="Search text..." 
                          className="h-8 bg-[#1e293b] border-none text-xs"
                          value={filter.search || ""}
                          onChange={(e) => updateFilter(filter.key, { search: e.target.value })}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <Button 
                variant="ghost" 
                className="w-full py-6 text-blue-400 hover:bg-blue-400/5 hover:text-blue-300 font-bold gap-2 border-t border-slate-800 rounded-none"
                onClick={() => setShowCriteriaPicker(true)}
              >
                <Plus className="h-4 w-4" />
                Add Filter Criteria
              </Button>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[10px] font-bold text-slate-500 hover:text-rose-400 uppercase tracking-widest gap-2"
              onClick={() => {
                setActiveFilters([]);
                setSelectedSector("All Sectors");
                setGlobalTickerSearch("");
              }}
            >
              <Trash2 className="h-3 w-3" />
              Reset All Filters
            </Button>
          </div>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Screener Results</h2>
              <Badge variant="outline" className="bg-blue-600/10 border-blue-600/20 text-blue-400 font-mono text-[10px]">
                {filteredData.length} Matches
              </Badge>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto relative">
              <Table>
                <TableHeader className="bg-slate-900/50 sticky top-0 z-10">
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
                            <span className="whitespace-normal leading-tight max-w-[100px] text-[10px] uppercase tracking-widest">
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
                      <TableRow key={row.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors group">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className={cn("py-3", cell.column.id !== 'ticker' && "text-right")}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-64 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Search className="h-8 w-8 opacity-20 mb-2" />
                          <p className="font-bold text-slate-400">No companies found</p>
                          <p className="text-xs">Try loosening your criteria or searching for another ticker</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={isSaving} onOpenChange={setIsSaving}>
        <DialogContent className="bg-[#0f172a] border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold italic uppercase tracking-tighter">Save Current Screen</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-sm text-slate-400">This will save your universe filters, criteria, and sorting order.</p>
            <Input 
              placeholder="Screen name (e.g. High Growth Tech)" 
              className="bg-slate-900 border-slate-800"
              value={newScreenName}
              onChange={(e) => setNewScreenName(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsSaving(false)}>Cancel</Button>
            <Button onClick={handleSaveScreen} className="bg-blue-600 hover:bg-blue-700 font-bold px-8">Save Screen</Button>
          </div>
        </DialogContent>
      </Dialog>

      {showCriteriaPicker && (
        <CriteriaPicker
          title="Add Filter Criteria"
          allCriteria={allAvailableCriteria}
          selectedCriteria={activeFilters.map(f => f.key)}
          criteriaCategories={criteriaCategories}
          onClose={() => setShowCriteriaPicker(false)}
          onSave={handleApplyCriteria}
        />
      )}
    </div>
  );
}

function rowHasNumericVal(data: any[], key: string): boolean {
  return data.some(row => row[`${key}_num`] !== undefined);
}
