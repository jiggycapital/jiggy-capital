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
import { ArrowUpDown, ArrowUp, ArrowDown, Wallet } from "lucide-react";

interface PortfolioTanStackTableProps {
  positionsData: any[];
  logos: Record<string, string>;
}

interface PortfolioRow {
  ticker: string;
  name: string;
  price: number;
  weight: number;
  dailyChange: number;
  ytdGain: number;
  revCagr: string;
  fcfMultiple: string;
  peMultiple: string;
  marketCap: string;
}

export function PortfolioTanStackTable({ positionsData, logos }: PortfolioTanStackTableProps) {
  const tableData = useMemo(() => {
    const totalValue = positionsData
      .map(p => {
        const ticker = (p.Ticker || p.Symbol || "").toUpperCase();
        const isCash = ticker === "CASH";
        if (isCash) {
          return parseNumeric(p["Cash Position"] || p[p._columnSHeader]) || parseNumeric(p["Market Value"] || p["Value"] || "0") || 0;
        }
        return parseNumeric(p["Market Value"] || p["Value"] || "0") || 0;
      })
      .reduce((a, b) => a + b, 0);

    return positionsData
      .filter(p => {
        const ticker = (p.Ticker || p.Symbol || "").toUpperCase();
        return ticker && ticker !== "" && ticker !== "SUM"; // Keep CASH, only filter SUM or empty
      })
      .map(p => {
        const rawTicker = (p.Ticker || p.Symbol || "");
        const ticker = rawTicker.toUpperCase();
        const isCash = ticker === "CASH";
        
        const mktVal = isCash 
          ? (parseNumeric(p["Cash Position"] || p[p._columnSHeader]) || parseNumeric(p["Market Value"] || p["Value"]) || 0)
          : (parseNumeric(p["Market Value"] || p["Value"]) || 0);
        
        const weight = totalValue > 0 ? (mktVal / totalValue) * 100 : 0;
        
        // Use column AT/V/AO headers if available from positionsData mapping
        const ytd = isCash ? 0 : (parseNumeric(p["YTD Gain"] || p[p._columnATHeader]) || 0);
        const change = isCash ? 0 : (parseNumeric(p["Change %"] || p[p._columnVHeader] || p["Daily PnL %"]) || 0);
        const revCagr = isCash ? "" : (p[p._columnAOHeader] || p["25-27e Rev CAGR"] || p["2024 - 27e Rev CAGR"] || p["Rev CAGR"] || "");
        
        return {
          ticker: isCash ? "CASH" : ticker,
          name: isCash ? "Cash Position" : (p.Name || p.Company || ticker),
          price: isCash ? 0 : (parseNumeric(p.Price) || 0),
          weight,
          dailyChange: change,
          ytdGain: ytd,
          marketCap: isCash ? "" : (p["Market Cap"] || ""),
          peMultiple: isCash ? "" : (p["2026e P/E"] || p["2026 P/E"] || p["P/E"] || ""),
          fcfMultiple: isCash ? "" : (p["P/2026e FCF"] || p["P/2026 FCF"] || p["P/FCF"] || ""),
          revCagr,
          isCash,
        } as PortfolioRow & { isCash: boolean };
      });
  }, [positionsData]);

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "weight",
      desc: true,
    },
  ]);

  const columns = useMemo<ColumnDef<PortfolioRow>[]>(
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
          const { ticker, name, isCash } = row.original as any;
          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-700">
                {isCash ? (
                  <Wallet className="w-4 h-4 text-emerald-400" />
                ) : logos[ticker] ? (
                  <img src={logos[ticker]} alt={ticker} className="w-6 h-6 object-contain" />
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
          <div 
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Price
            {{
              asc: <ArrowUp className="h-3 w-3" />,
              desc: <ArrowDown className="h-3 w-3" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const { isCash, price } = row.original as any;
          if (isCash) return null;
          return (
            <div className="text-right font-mono text-sm text-slate-300">
              {formatCurrency(price)}
            </div>
          );
        },
      },
      {
        accessorKey: "weight",
        header: ({ column }) => (
          <div 
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Weight
            {{
              asc: <ArrowUp className="h-3 w-3" />,
              desc: <ArrowDown className="h-3 w-3" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm font-bold text-blue-400">
            {(row.getValue("weight") as number).toFixed(1)}%
          </div>
        ),
      },
      {
        accessorKey: "dailyChange",
        header: ({ column }) => (
          <div 
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Daily
            {{
              asc: <ArrowUp className="h-3 w-3" />,
              desc: <ArrowDown className="h-3 w-3" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const { dailyChange, isCash } = row.original as any;
          if (isCash) return null;
          return (
            <div className={`text-right font-mono text-sm font-bold ${dailyChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {dailyChange >= 0 ? '+' : ''}{dailyChange.toFixed(1)}%
            </div>
          );
        },
      },
      {
        accessorKey: "ytdGain",
        header: ({ column }) => (
          <div 
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            YTD
            {{
              asc: <ArrowUp className="h-3 w-3" />,
              desc: <ArrowDown className="h-3 w-3" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const { ytdGain, isCash } = row.original as any;
          if (isCash) return null;
          return (
            <div className={`text-right font-mono text-sm font-bold ${ytdGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {ytdGain >= 0 ? '+' : ''}{ytdGain.toFixed(1)}%
            </div>
          );
        },
      },
      {
        accessorKey: "marketCap",
        header: ({ column }) => (
          <div 
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Market Cap
            {{
              asc: <ArrowUp className="h-3 w-3" />,
              desc: <ArrowDown className="h-3 w-3" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const { isCash, marketCap } = row.original as any;
          if (isCash) return null;
          return (
            <div className="text-right font-mono text-sm text-slate-300">
              {marketCap}
            </div>
          );
        },
      },
      {
        accessorKey: "revCagr",
        header: ({ column }) => (
          <div 
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors text-right"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            25-27e Rev CAGR
            {{
              asc: <ArrowUp className="h-3 w-3" />,
              desc: <ArrowDown className="h-3 w-3" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const { isCash, revCagr } = row.original as any;
          if (isCash) return null;
          return (
            <div className="text-right font-mono text-sm text-slate-300">
              {revCagr}
            </div>
          );
        },
      },
      {
        accessorKey: "fcfMultiple",
        header: ({ column }) => (
          <div 
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            P/2026e FCF
            {{
              asc: <ArrowUp className="h-3 w-3" />,
              desc: <ArrowDown className="h-3 w-3" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const { isCash, fcfMultiple } = row.original as any;
          if (isCash) return null;
          return (
            <div className="text-right font-mono text-sm text-slate-300">
              {fcfMultiple}
            </div>
          );
        },
      },
      {
        accessorKey: "peMultiple",
        header: ({ column }) => (
          <div 
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors text-right"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            2026e P/E
            {{
              asc: <ArrowUp className="h-3 w-3" />,
              desc: <ArrowDown className="h-3 w-3" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const { isCash, peMultiple } = row.original as any;
          if (isCash) return null;
          return (
            <div className="text-right font-mono text-sm text-slate-300">
              {peMultiple}
            </div>
          );
        },
      },
    ],
    [logos]
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
    },
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
                    className={`text-slate-400 font-bold py-4 ${
                      header.id === 'ticker' ? 'sticky left-0 z-30 bg-slate-800 border-r border-slate-800/50' : 'bg-slate-800/50'
                    }`}
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
                  data-state={row.getIsSelected() && "selected"}
                  className="border-slate-800 hover:bg-slate-800/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id} 
                      className={`py-3 ${
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
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                  No positions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
