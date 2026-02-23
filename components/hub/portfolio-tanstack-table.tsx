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
  firstBuy: string;
  dailyChange: number;
  ytdGain: number;
  revCagr: number | string;
  fcfMultiple: number | string;
  peMultiple: number | string;
  marketCap: number;
  d50: number | string;
  d200: number | string;
  peg: number | string;
  isCash: boolean;
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

        const mCapRaw = p["Market Cap"] || "";
        const mCapNum = parseMarketCap(mCapRaw);

        const revCagr = isCash ? "" : (p[p._columnAOHeader] || p["25-27e Rev CAGR"] || p["2024 - 27e Rev CAGR"] || p["Rev CAGR"] || "");
        const pe = isCash ? "" : (p["2026e P/E"] || p["2026 P/E"] || p["P/E"] || "");
        const fcf = isCash ? "" : (p["P/2026e FCF"] || p["P/2026 FCF"] || p["P/FCF"] || "");
        const d50 = isCash ? "" : (p[p._columnAEHeader] || p["50D"]);
        const d200 = isCash ? "" : (p[p._columnAFHeader] || p["200D"]);
        const peg = isCash ? "" : (p[p._columnARHeader] || p["P/E/G"] || p["PEG"]);

        return {
          ticker: isCash ? "CASH" : ticker,
          name: isCash ? "Cash Position" : (p.Name || p.Company || ticker),
          price: isCash ? 0 : (parseNumeric(p.Price) || 0),
          weight,
          firstBuy: isCash ? "" : (p[p._columnEHeader] || ""),
          dailyChange: change,
          ytdGain: ytd,
          marketCap: isCash ? 0 : (mCapNum || 0),
          peMultiple: parseNumeric(pe) ?? pe,
          fcfMultiple: parseNumeric(fcf) ?? fcf,
          revCagr: parseNumeric(revCagr) ?? revCagr,
          d50: parseNumeric(d50) ?? d50,
          d200: parseNumeric(d200) ?? d200,
          peg: parseNumeric(peg) ?? peg,
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
          const { ticker, name, isCash } = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#111D33] flex items-center justify-center overflow-hidden shrink-0 border border-[#1E2D47]">
                {isCash ? (
                  <Wallet className="w-4 h-4 text-emerald-400" />
                ) : logos[ticker] ? (
                  <img src={logos[ticker]} alt={ticker} className="w-7 h-7 object-contain" />
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
        cell: ({ row }) => {
          const { isCash, price } = row.original;
          if (isCash) return null;
          return (
            <div className="text-right font-mono text-[13px] text-slate-300">
              {formatCurrency(price)}
            </div>
          );
        },
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
          const { isCash, marketCap } = row.original;
          if (isCash || !marketCap) return null;
          return (
            <div className="text-right font-mono text-[13px] text-slate-300">
              {formatCurrencyBillions(marketCap)}
            </div>
          );
        },
      },
      {
        accessorKey: "weight",
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-normal leading-tight text-right"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Weight
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right font-mono text-[13px] font-bold text-blue-400">
            {(row.getValue("weight") as number).toFixed(1)}%
          </div>
        ),
      },
      {
        accessorKey: "firstBuy",
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-normal leading-tight text-right max-w-[50px]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            First Buy
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right font-mono text-[12px] text-slate-400">
            {row.original.firstBuy}
          </div>
        ),
      },
      {
        accessorKey: "dailyChange",
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
          const { dailyChange, isCash } = row.original;
          if (isCash) return null;
          const bg = dailyChange >= 0
            ? dailyChange > 2 ? 'bg-emerald-500/15' : dailyChange > 0.5 ? 'bg-emerald-500/8' : ''
            : dailyChange < -2 ? 'bg-rose-500/15' : dailyChange < -0.5 ? 'bg-rose-500/8' : '';
          return (
            <div className={`text-right font-mono text-[13px] font-bold px-2 py-0.5 rounded ${bg} ${dailyChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {dailyChange >= 0 ? '+' : ''}{dailyChange.toFixed(1)}%
            </div>
          );
        },
      },
      {
        accessorKey: "ytdGain",
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
          const { ytdGain, isCash } = row.original;
          if (isCash) return null;
          const bg = ytdGain >= 0
            ? ytdGain > 10 ? 'bg-emerald-500/15' : ytdGain > 3 ? 'bg-emerald-500/8' : ''
            : ytdGain < -10 ? 'bg-rose-500/15' : ytdGain < -3 ? 'bg-rose-500/8' : '';
          return (
            <div className={`text-right font-mono text-[13px] font-bold px-2 py-0.5 rounded ${bg} ${ytdGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {ytdGain >= 0 ? '+' : ''}{ytdGain.toFixed(1)}%
            </div>
          );
        },
      },
      {
        accessorKey: "d50",
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.original.d50;
          const b = rowB.original.d50;
          const numA = typeof a === 'number' ? a : 0;
          const numB = typeof b === 'number' ? b : 0;
          return numA - numB;
        },
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-normal leading-tight text-right"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            50D
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const val = row.original.d50;
          const numVal = typeof val === 'number' ? val : null;
          return (
            <div className={`text-right font-mono text-[12px] font-bold ${numVal !== null ? (numVal >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-400'}`}>
              {numVal !== null ? formatPercentage(numVal) : (val || "-")}
            </div>
          );
        }
      },
      {
        accessorKey: "d200",
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.original.d200;
          const b = rowB.original.d200;
          const numA = typeof a === 'number' ? a : 0;
          const numB = typeof b === 'number' ? b : 0;
          return numA - numB;
        },
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-normal leading-tight text-right"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            200D
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const val = row.original.d200;
          const numVal = typeof val === 'number' ? val : null;
          return (
            <div className={`text-right font-mono text-[12px] font-bold ${numVal !== null ? (numVal >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-400'}`}>
              {numVal !== null ? formatPercentage(numVal) : (val || "-")}
            </div>
          );
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
          const { isCash, revCagr } = row.original;
          if (isCash) return null;
          return (
            <div className="text-right font-mono text-[13px] text-slate-300">
              {typeof revCagr === 'number' ? formatPercentage(revCagr) : (revCagr || "-")}
            </div>
          );
        },
      },
      {
        accessorKey: "fcfMultiple",
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-normal leading-tight text-right max-w-[60px]"
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
          const { isCash, fcfMultiple } = row.original;
          if (isCash) return null;
          return (
            <div className="text-right font-mono text-[13px] text-slate-300">
              {typeof fcfMultiple === 'number' ? `${fcfMultiple.toFixed(1)}x` : (fcfMultiple || "-")}
            </div>
          );
        },
      },
      {
        accessorKey: "peMultiple",
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors text-right whitespace-normal leading-tight max-w-[60px]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            2026e P/E
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const { isCash, peMultiple } = row.original;
          if (isCash) return null;
          return (
            <div className="text-right font-mono text-[13px] text-slate-300">
              {typeof peMultiple === 'number' ? `${peMultiple.toFixed(1)}x` : (peMultiple || "-")}
            </div>
          );
        },
      },
      {
        accessorKey: "peg",
        header: ({ column }) => (
          <div
            className="flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-normal leading-tight text-right"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            P/E/G
            {{
              asc: <ArrowUp className="h-3 w-3 shrink-0" />,
              desc: <ArrowDown className="h-3 w-3 shrink-0" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />}
          </div>
        ),
        cell: ({ row }) => {
          const { peg } = row.original;
          return (
            <div className="text-right font-mono text-[12px] text-slate-400">
              {typeof peg === 'number' ? peg.toFixed(2) : (peg || "-")}
            </div>
          );
        }
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
    <div className="rounded-xl border border-[#1E2D47] bg-[#111D33]/50 overflow-hidden flex flex-col h-full max-h-[750px]">
      <div className="overflow-auto custom-scrollbar flex-1 relative">
        <Table className="relative">
          <TableHeader className="bg-[#0D1A2E] sticky top-0 z-20 shadow-md">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-[#1E2D47] hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={`text-slate-400 font-bold py-4 ${header.id === 'ticker'
                      ? 'sticky left-0 z-30 bg-[#0D1A2E] border-r border-[#1E2D47]/50 min-w-[140px] max-w-[170px] md:min-w-[200px]'
                      : 'bg-[#0D1A2E]'
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
                  className="border-[#1E2D47] hover:bg-[#111D33]/60 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`py-3 ${cell.column.id === 'ticker'
                        ? 'sticky left-0 bg-[#0A1628] z-10 border-r border-[#1E2D47]/50 min-w-[140px] max-w-[170px] md:min-w-[200px]'
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
