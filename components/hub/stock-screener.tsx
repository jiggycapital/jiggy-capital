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
  ChevronDown
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

interface StockScreenerProps {
  positionsData: any[];
  watchlistData: any[];
  logos: Record<string, string>;
}

interface ScreenerRow {
  ticker: string;
  name: string;
  price: number;
  marketCap: string;
  marketCapNum: number;
  weight: number;
  dailyChange: number;
  ytdGain: number;
  revCagr: string;
  revCagrNum: number;
  fcfMultiple: string;
  fcfMultipleNum: number;
  peMultiple: string;
  peMultipleNum: number;
  peg: string;
  pegNum: number;
  d50: string;
  d50Num: number;
  d200: string;
  d200Num: number;
  sector: string;
  isHolding: boolean;
}

interface FavoriteScreen {
  id: string;
  name: string;
  filters: ColumnFiltersState;
  sorting: SortingState;
}

export function StockScreener({ positionsData, watchlistData, logos }: StockScreenerProps) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [favorites, setFavorites] = useState<FavoriteScreen[]>([]);
  const [newScreenName, setNewScreenName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("jiggy_screener_favorites");
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: FavoriteScreen[]) => {
    setFavorites(newFavorites);
    localStorage.setItem("jiggy_screener_favorites", JSON.stringify(newFavorites));
  };

  const handleSaveScreen = () => {
    if (!newScreenName.trim()) return;
    const newScreen: FavoriteScreen = {
      id: Date.now().toString(),
      name: newScreenName,
      filters: columnFilters,
      sorting: sorting,
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
    setColumnFilters(screen.filters);
    setSorting(screen.sorting);
  };

  const tableData = useMemo(() => {
    const holdingsMap = new Map();
    const totalHoldingsValue = positionsData
      .map(p => parseNumeric(p["Market Value"] || p["Value"] || "0") || 0)
      .reduce((a, b) => a + b, 0);

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

      const marketValue = parseNumeric(source["Market Value"] || source["Value"] || "0") || 0;
      const weight = totalHoldingsValue > 0 ? (marketValue / totalHoldingsValue) * 100 : 0;

      // Numerical parsing for filtering/sorting
      const price = parseNumeric(source.Price) || 0;
      const mktCapRaw = source["Market Cap"] || "";
      const mktCapNum = parseNumeric(mktCapRaw.replace(/[BT]/g, '')) || 0;
      const dailyChange = parseNumeric(source["Change %"] || source["Daily PnL %"] || source["Daily Change"] || "0") || 0;
      const ytdGain = parseNumeric(source["YTD Gain"] || source["YTD"] || "0") || 0;
      
      const revCagrStr = source["25-27e Rev CAGR"] || source["Rev CAGR"] || source["Fwd Rev CAGR"] || "";
      const revCagrNum = parseNumeric(revCagrStr) || 0;
      
      const fcfMultipleStr = source["P/2026e FCF"] || source["2026e P/FCF"] || source["P/FCF"] || "";
      const fcfMultipleNum = parseNumeric(fcfMultipleStr) || 0;
      
      const peMultipleStr = source["2026e P/E"] || source["P/E"] || "";
      const peMultipleNum = parseNumeric(peMultipleStr) || 0;
      
      const pegStr = source["PEG"] || source["P/E/G"] || "";
      const pegNum = parseNumeric(pegStr) || 0;
      
      const d50Str = source["50D"] || "";
      const d50Num = parseNumeric(d50Str) || 0;
      
      const d200Str = source["200D"] || "";
      const d200Num = parseNumeric(d200Str) || 0;

      return {
        ticker,
        name: source.Name || source.Company || ticker,
        price,
        marketCap: mktCapRaw,
        marketCapNum: mktCapRaw.includes('T') ? mktCapNum * 1000 : mktCapNum,
        weight,
        dailyChange,
        ytdGain,
        revCagr: revCagrStr,
        revCagrNum,
        fcfMultiple: fcfMultipleStr,
        fcfMultipleNum,
        peMultiple: peMultipleStr,
        peMultipleNum,
        peg: pegStr,
        pegNum,
        d50: d50Str,
        d50Num,
        d200: d200Str,
        d200Num,
        sector: source.Sector || "Unknown",
        isHolding: !!holding,
      } as ScreenerRow;
    });
  }, [positionsData, watchlistData]);

  const columns = useMemo<ColumnDef<ScreenerRow>[]>(
    () => [
      {
        accessorKey: "ticker",
        header: ({ column }) => (
          <div className="flex items-center gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Ticker
            {column.getIsSorted() ? (column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden border border-slate-700">
              {logos[row.original.ticker] ? (
                <img src={logos[row.original.ticker]} alt="" className="w-4 h-4 object-contain" />
              ) : (
                <span className="text-[8px] font-bold text-slate-500">{row.original.ticker.substring(0, 3)}</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-100 leading-tight">{row.original.ticker}</span>
              {row.original.isHolding && <span className="text-[8px] text-blue-400 font-bold uppercase tracking-tighter">Holding</span>}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => <div className="font-mono text-slate-300">{formatCurrency(row.original.price)}</div>,
      },
      {
        accessorKey: "marketCapNum",
        header: "Mkt Cap",
        cell: ({ row }) => <div className="font-mono text-slate-300">{row.original.marketCap}</div>,
      },
      {
        accessorKey: "dailyChange",
        header: "Daily",
        cell: ({ row }) => (
          <div className={`font-mono font-bold ${row.original.dailyChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatPercentage(row.original.dailyChange)}
          </div>
        ),
      },
      {
        accessorKey: "ytdGain",
        header: "YTD",
        cell: ({ row }) => (
          <div className={`font-mono font-bold ${row.original.ytdGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatPercentage(row.original.ytdGain)}
          </div>
        ),
      },
      {
        accessorKey: "revCagrNum",
        header: "Fwd Rev CAGR",
        cell: ({ row }) => <div className="font-mono text-slate-300">{row.original.revCagr}</div>,
        filterFn: "inNumberRange",
      },
      {
        accessorKey: "fcfMultipleNum",
        header: "2026e P/FCF",
        cell: ({ row }) => <div className="font-mono text-slate-300">{row.original.fcfMultiple}</div>,
        filterFn: "inNumberRange",
      },
      {
        accessorKey: "peMultipleNum",
        header: "2026e P/E",
        cell: ({ row }) => <div className="font-mono text-slate-300">{row.original.peMultiple}</div>,
        filterFn: "inNumberRange",
      },
      {
        accessorKey: "pegNum",
        header: "PEG",
        cell: ({ row }) => <div className="font-mono text-slate-300">{row.original.peg}</div>,
        filterFn: "inNumberRange",
      },
      {
        accessorKey: "d50Num",
        header: "50D",
        cell: ({ row }) => (
          <div className={`font-mono font-bold ${row.original.d50Num >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {row.original.d50}
          </div>
        ),
      },
      {
        accessorKey: "d200Num",
        header: "200D",
        cell: ({ row }) => (
          <div className={`font-mono font-bold ${row.original.d200Num >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {row.original.d200}
          </div>
        ),
      },
      {
        accessorKey: "sector",
        header: "Sector",
        cell: ({ row }) => <div className="text-slate-400 text-xs">{row.original.sector}</div>,
      },
    ],
    [logos]
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
              <Filter className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Stock Screener</h1>
              <p className="text-sm text-slate-500">Filter and discover high-growth opportunities</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Popover open={isSaving} onOpenChange={setIsSaving}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300 gap-2">
                  <Star className="h-4 w-4" />
                  Save Current Screen
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 bg-slate-900 border-slate-700 p-4">
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-slate-200">Save Custom Screen</h4>
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
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24">Min CAGR%:</div>
            <Input
              type="number"
              placeholder="0"
              className="bg-slate-950 border-slate-800 h-9"
              value={(table.getColumn("revCagrNum")?.getFilterValue() as [number, number])?.[0] ?? ""}
              onChange={(e) => {
                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                table.getColumn("revCagrNum")?.setFilterValue((old: any) => [val, old?.[1]]);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24">Max PEG:</div>
            <Input
              type="number"
              step="0.1"
              placeholder="Any"
              className="bg-slate-950 border-slate-800 h-9"
              value={(table.getColumn("pegNum")?.getFilterValue() as [number, number])?.[1] ?? ""}
              onChange={(e) => {
                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                table.getColumn("pegNum")?.setFilterValue((old: any) => [old?.[0], val]);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest w-16">Sector:</div>
            <select 
              className="w-full h-9 bg-slate-950 border border-slate-800 rounded-md px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
              value={(table.getColumn("sector")?.getFilterValue() as string) ?? ""}
              onChange={(e) => table.getColumn("sector")?.setFilterValue(e.target.value || undefined)}
            >
              <option value="">All Sectors</option>
              {Array.from(new Set(tableData.map(d => d.sector))).sort().map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex justify-end">
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
            Clear All Filters
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
                          {flexRender(header.column.columnDef.header, header.getContext())}
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
        <div>Total Companies: {tableData.length}</div>
        <div>Filtered Results: {table.getFilteredRowModel().rows.length}</div>
      </div>
    </div>
  );
}
