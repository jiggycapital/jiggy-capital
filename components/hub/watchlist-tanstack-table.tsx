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
import { parseNumeric, parseMarketCap, formatCurrency, formatPercentage, formatCurrencyBillions } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface WatchlistTanStackTableProps {
  watchlistData: any[];
  logos: Record<string, string>;
}

interface WatchlistRow {
  ticker: string;
  name: string;
  price: number;
  marketCap: number;
  change: number;
  w1Change: number;
  ytdChange: number;
  pe2026: number | string;
  fcf2026: number | string;
  revCagr: number | string;
  peg: number | string;
  logoUrl: string;
}

export function WatchlistTanStackTable({ watchlistData, logos }: WatchlistTanStackTableProps) {
  const tableData = useMemo(() => {
    return watchlistData.map(p => {
      const ticker = p.Ticker || p.Symbol || "";
      const logoUrl = p["Logo URL"] || logos[ticker] || "";

      const mCapRaw = p["Market Cap"] || "";
      const mCapNum = parseMarketCap(mCapRaw);

      return {
        ticker,
        name: p.Name || p.Company || ticker,
        price: parseNumeric(p.Price) || 0,
        marketCap: mCapNum || 0,
        change: parseNumeric(p["Change %"]) || 0,
        w1Change: parseNumeric(p["1W Change %"]) || 0,
        ytdChange: parseNumeric(p["YTD Change %"]) || 0,
        pe2026: parseNumeric(p["2026 P/E"] || p["26e P/E"]) ?? (p["2026 P/E"] || p["26e P/E"] || "-"),
        fcf2026: parseNumeric(p["2026 P/FCF"] || p["26e P/FCF"]) ?? (p["2026 P/FCF"] || p["26e P/FCF"] || "-"),
        revCagr: parseNumeric(p["Fwd Rev CAGR"] || p["Rev CAGR"]) ?? (p["Fwd Rev CAGR"] || p["Rev CAGR"] || "-"),
        peg: parseNumeric(p["PEG"]) ?? (p["PEG"] || "-"),
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
            className="flex items-center gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-normal leading-tight"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Company
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const { ticker, name, logoUrl } = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#151536] flex items-center justify-center overflow-hidden shrink-0 border border-[#2A2A61]">
                {logoUrl ? (
                  <img src={logoUrl} alt={ticker} className="w-7 h-7 object-contain" />
                ) : (
                  <span className="text-[10px] font-extrabold text-slate-500">{ticker.substring(0, 3)}</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold text-slate-100 truncate leading-tight">{ticker}</span>
                <span className="text-[9px] text-slate-500 truncate uppercase tracking-tighter leading-tight">{name}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "price",
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-normal leading-tight text-right"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Price
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => <div className="text-right font-mono text-[13px] text-slate-300">{formatCurrency(row.original.price)}</div>
      },
      {
        accessorKey: "marketCap",
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-normal leading-tight text-right max-w-[50px]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Mkt Cap
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const { marketCap } = row.original;
          if (!marketCap) return null;
          return (
            <div className="text-right font-mono text-[13px] text-slate-400">
              {formatCurrencyBillions(marketCap)}
            </div>
          );
        }
      },
      {
        accessorKey: "change",
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-normal leading-tight text-right"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Daily
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const val = row.original.change;
          const bg = val >= 0
            ? val > 2 ? 'bg-emerald-500/15' : val > 0.5 ? 'bg-emerald-500/8' : ''
            : val < -2 ? 'bg-rose-500/15' : val < -0.5 ? 'bg-rose-500/8' : '';
          return (
            <div className={`text-right font-mono text-[13px] font-bold px-2 py-0.5 rounded ${bg} ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {val >= 0 ? '+' : ''}{val.toFixed(1)}%
            </div>
          );
        }
      },
      {
        accessorKey: "w1Change",
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-normal leading-tight text-right"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            1W
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const val = row.original.w1Change;
          const bg = val >= 0
            ? val > 3 ? 'bg-emerald-500/15' : val > 1 ? 'bg-emerald-500/8' : ''
            : val < -3 ? 'bg-rose-500/15' : val < -1 ? 'bg-rose-500/8' : '';
          return (
            <div className={`text-right font-mono text-[13px] px-2 py-0.5 rounded ${bg} ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {val >= 0 ? '+' : ''}{val.toFixed(1)}%
            </div>
          );
        }
      },
      {
        accessorKey: "ytdChange",
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-normal leading-tight text-right"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            YTD
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const val = row.original.ytdChange;
          const bg = val >= 0
            ? val > 10 ? 'bg-emerald-500/15' : val > 3 ? 'bg-emerald-500/8' : ''
            : val < -10 ? 'bg-rose-500/15' : val < -3 ? 'bg-rose-500/8' : '';
          return (
            <div className={`text-right font-mono text-[13px] font-bold px-2 py-0.5 rounded ${bg} ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {val >= 0 ? '+' : ''}{val.toFixed(1)}%
            </div>
          );
        }
      },
      {
        accessorKey: "pe2026",
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-normal leading-tight text-right max-w-[50px]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            26e P/E
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const val = row.original.pe2026;
          return <div className="text-right font-mono text-[13px] text-slate-400">{typeof val === 'number' ? `${val.toFixed(1)}x` : (val || "-")}</div>;
        }
      },
      {
        accessorKey: "fcf2026",
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-normal leading-tight text-right max-w-[50px]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            2026e P/FCF
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const val = row.original.fcf2026;
          return <div className="text-right font-mono text-[13px] text-slate-400">{typeof val === 'number' ? `${val.toFixed(1)}x` : (val || "-")}</div>;
        }
      },
      {
        accessorKey: "revCagr",
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors text-right whitespace-normal leading-tight max-w-[60px]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Fwd Rev CAGR
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const val = row.original.revCagr;
          return <div className="text-right font-mono text-[13px] text-slate-400">{typeof val === 'number' ? formatPercentage(val) : (val || "-")}</div>;
        }
      },
      {
        accessorKey: "peg",
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-normal leading-tight text-right max-w-[50px]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            PEG
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const val = row.original.peg;
          return <div className="text-right font-mono text-[13px] text-slate-400">{typeof val === 'number' ? val.toFixed(2) : (val || "-")}</div>;
        }
      },
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
    <div className="rounded-xl border border-[#2A2A61] bg-[#151536]/50 overflow-hidden flex flex-col h-full max-h-[750px]">
      <div className="overflow-auto custom-scrollbar flex-1 relative">
        <Table className="relative">
          <TableHeader className="bg-[#1A1A40] sticky top-0 z-20 shadow-md">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-[#2A2A61] hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={`text-slate-400 font-bold py-4 px-2 ${header.id === 'ticker'
                      ? 'sticky left-0 z-30 bg-[#1A1A40] border-r border-[#2A2A61]/50 min-w-[140px] max-w-[170px] md:min-w-[200px]'
                      : 'bg-[#1A1A40]'
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
                <TableRow key={row.id} className="border-[#2A2A61] hover:bg-[#151536]/60 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`py-3 px-2 ${cell.column.id === 'ticker'
                        ? 'sticky left-0 bg-[#0A0A1A] z-10 border-r border-[#2A2A61]/50 min-w-[140px] max-w-[170px] md:min-w-[200px]'
                        : ''
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
