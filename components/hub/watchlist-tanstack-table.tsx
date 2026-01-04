"use client";

import { useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseNumeric, formatCurrency } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface WatchlistTanStackTableProps {
  watchlistData: any[];
  logos: Record<string, string>;
}

interface WatchlistRow {
  ticker: string;
  name: string;
  price: number;
  marketCap: string;
  change: number;
  w1Change: number;
  m1Change: number;
  m3Change: number;
  ytdChange: number;
  yr1Change: number;
  pe2026: string;
  fcf2026: string;
  revCagr: string;
  peg: string;
  logoUrl: string;
}

export function WatchlistTanStackTable({ watchlistData, logos }: WatchlistTanStackTableProps) {
  const tableData = useMemo(() => {
    return watchlistData.map(p => {
      const ticker = p.Ticker || p.Symbol || "";
      const logoUrl = p["Logo URL"] || logos[ticker] || "";
      
      return {
        ticker,
        name: p.Name || p.Company || ticker,
        price: parseNumeric(p.Price) || 0,
        marketCap: p["Market Cap"] || "-",
        change: parseNumeric(p["Change %"]) || 0,
        w1Change: parseNumeric(p["1W Change %"]) || 0,
        m1Change: parseNumeric(p["1M Change %"]) || 0,
        m3Change: parseNumeric(p["3M Change %"]) || 0,
        ytdChange: parseNumeric(p["YTD Change %"]) || 0,
        yr1Change: parseNumeric(p["1YR Change %"]) || 0,
        pe2026: p["2026 P/E"] || "-",
        fcf2026: p["2026 P/FCF"] || "-",
        revCagr: p["Fwd Rev CAGR"] || "-",
        peg: p["PEG"] || "-",
        logoUrl
      };
    });
  }, [watchlistData, logos]);

  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<WatchlistRow>[]>(
    () => [
      {
        accessorKey: "ticker",
        header: ({ column }) => (
          <div 
            className="flex items-center gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Company
            {{
              asc: <ArrowUp className="h-3 w-3" />,
              desc: <ArrowDown className="h-3 w-3" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const { ticker, name, logoUrl } = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-700">
                {logoUrl ? (
                  <img src={logoUrl} alt={ticker} className="w-6 h-6 object-contain" />
                ) : (
                  <span className="text-[10px] font-bold text-slate-500">{ticker.substring(0, 3)}</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-slate-100 truncate">{ticker}</span>
                <span className="text-[10px] text-slate-500 truncate uppercase tracking-tight">{name}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "price",
        header: ({ column }) => (
          <div className="text-right cursor-pointer select-none hover:text-slate-200" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Price</div>
        ),
        cell: ({ row }) => <div className="text-right font-mono text-sm text-slate-300">{formatCurrency(row.original.price)}</div>
      },
      {
        accessorKey: "change",
        header: "Daily",
        cell: ({ row }) => (
          <div className={`text-right font-mono text-xs font-bold ${row.original.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {row.original.change >= 0 ? '+' : ''}{row.original.change.toFixed(1)}%
          </div>
        )
      },
      { accessorKey: "w1Change", header: "1W", cell: ({ row }) => <div className={`text-right font-mono text-xs ${row.original.w1Change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{row.original.w1Change >= 0 ? '+' : ''}{row.original.w1Change.toFixed(1)}%</div> },
      { accessorKey: "m1Change", header: "1M", cell: ({ row }) => <div className={`text-right font-mono text-xs ${row.original.m1Change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{row.original.m1Change >= 0 ? '+' : ''}{row.original.m1Change.toFixed(1)}%</div> },
      { accessorKey: "m3Change", header: "3M", cell: ({ row }) => <div className={`text-right font-mono text-xs ${row.original.m3Change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{row.original.m3Change >= 0 ? '+' : ''}{row.original.m3Change.toFixed(1)}%</div> },
      { accessorKey: "ytdChange", header: "YTD", cell: ({ row }) => <div className={`text-right font-mono text-xs font-bold ${row.original.ytdChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{row.original.ytdChange >= 0 ? '+' : ''}{row.original.ytdChange.toFixed(1)}%</div> },
      { accessorKey: "yr1Change", header: "1YR", cell: ({ row }) => <div className={`text-right font-mono text-xs ${row.original.yr1Change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{row.original.yr1Change >= 0 ? '+' : ''}{row.original.yr1Change.toFixed(1)}%</div> },
      { accessorKey: "pe2026", header: "26e P/E", cell: ({ row }) => <div className="text-right font-mono text-xs text-slate-400">{row.original.pe2026}</div> },
      { accessorKey: "fcf2026", header: "26e P/FCF", cell: ({ row }) => <div className="text-right font-mono text-xs text-slate-400">{row.original.fcf2026}</div> },
      { accessorKey: "revCagr", header: "Rev CAGR", cell: ({ row }) => <div className="text-right font-mono text-xs text-slate-400">{row.original.revCagr}</div> },
      { accessorKey: "peg", header: "PEG", cell: ({ row }) => <div className="text-right font-mono text-xs text-slate-400">{row.original.peg}</div> },
      { accessorKey: "marketCap", header: "Mkt Cap", cell: ({ row }) => <div className="text-right font-mono text-xs text-slate-400">{row.original.marketCap}</div> },
    ],
    [logos]
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="max-h-[750px] overflow-auto custom-scrollbar">
        <Table className="relative">
          <TableHeader className="bg-slate-800/50 sticky top-0 z-20">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-slate-800 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id} 
                    className={`text-slate-400 font-bold py-4 px-2 ${
                      header.id === 'ticker' ? 'sticky left-0 z-30 bg-slate-800 border-r border-slate-800/50' : 'bg-slate-800/50'
                    }`}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id} 
                      className={`py-3 px-2 ${
                        cell.column.id === 'ticker' ? 'sticky left-0 bg-slate-900 z-10 border-r border-slate-800/50' : ''
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">No stocks in watchlist.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
