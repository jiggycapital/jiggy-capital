"use client";

import { useMemo } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { parseNumeric, formatPercentage, formatCurrency } from "@/lib/utils";

interface PortfolioTableProps {
  positionsData: any[];
  logos: Record<string, string>;
}

export function PortfolioTable({ positionsData, logos }: PortfolioTableProps) {
  const tableData = useMemo(() => {
    // Filter out CASH and sort by weight
    const totalValue = positionsData
      .map(row => parseNumeric(row["Market Value"] || row["Value"] || "0") || 0)
      .reduce((a, b) => a + b, 0);

    return positionsData
      .filter(p => p.Ticker !== "CASH" && p.Ticker !== "Cash")
      .map(p => {
        const ticker = p.Ticker || p.Symbol;
        const mktVal = parseNumeric(p["Market Value"] || p["Value"]) || 0;
        const weight = totalValue > 0 ? (mktVal / totalValue) * 100 : 0;
        const ytd = parseNumeric(p["YTD Gain"] || p[p._columnATHeader]) || 0;
        const change = parseNumeric(p["Change %"] || p[p._columnVHeader]) || 0;
        
        return {
          ticker,
          name: p.Name || p.Company || ticker,
          price: parseNumeric(p.Price) || 0,
          weight,
          ytd,
          change,
          marketCap: p["Market Cap"] || "-",
          pe: p["2026 P/E"] || p["P/E"] || "-",
          fcf: p["P/2026 FCF"] || p["P/FCF"] || "-",
          revCagr: p["2024 - 27e Rev CAGR"] || p["Rev CAGR"] || "-",
        };
      })
      .sort((a, b) => b.weight - a.weight);
  }, [positionsData]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-800/50">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="w-[180px] text-slate-400 font-bold py-3 sticky left-0 bg-slate-800/50 z-10">Company</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">Price</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">Weight</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">Daily</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">YTD</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">25-27e Rev CAGR</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">P/2026e FCF</TableHead>
              <TableHead className="text-right text-slate-400 font-bold whitespace-nowrap">2026e P/E</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.ticker} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                <TableCell className="font-medium py-3 sticky left-0 bg-slate-900/95 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {logos[row.ticker] ? (
                        <img src={logos[row.ticker]} alt={row.ticker} className="w-6 h-6 object-contain" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">{row.ticker}</span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-slate-100 truncate">{row.ticker}</span>
                      <span className="text-[10px] text-slate-500 truncate">{row.name}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-slate-300">
                  {formatCurrency(row.price)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-bold text-blue-400">
                  {row.weight.toFixed(1)}%
                </TableCell>
                <TableCell className={`text-right font-mono text-sm font-bold ${row.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {row.change >= 0 ? '+' : ''}{row.change.toFixed(1)}%
                </TableCell>
                <TableCell className={`text-right font-mono text-sm font-bold ${row.ytd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {row.ytd >= 0 ? '+' : ''}{row.ytd.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-slate-300">
                  {row.revCagr}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-slate-300">
                  {row.fcf}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-slate-300">
                  {row.pe}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
