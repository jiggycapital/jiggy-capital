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

interface WatchlistTableProps {
  watchlistData: any[];
  logos: Record<string, string>;
}

export function WatchlistTable({ watchlistData, logos }: WatchlistTableProps) {
  const tableData = useMemo(() => {
    return watchlistData.map(p => {
      const ticker = p.Ticker || p.Symbol;
      const change = parseNumeric(p["Change %"]) || 0;
      const w1Change = parseNumeric(p["1W Change %"]) || 0;
      const m1Change = parseNumeric(p["1M Change %"]) || 0;
      const m3Change = parseNumeric(p["3M Change %"]) || 0;
      const ytd = parseNumeric(p["YTD Change %"]) || 0;
      const yr1 = parseNumeric(p["1YR Change %"]) || 0;
      
      // Use Logo URL from sheet if available, otherwise fall back to global logos
      const logoUrl = p["Logo URL"] || logos[ticker];
      
      return {
        ticker,
        name: p.Name || p.Company || ticker,
        price: parseNumeric(p.Price) || 0,
        change,
        w1Change,
        m1Change,
        m3Change,
        ytd,
        yr1,
        marketCap: p["Market Cap"] || "-",
        logoUrl
      };
    });
  }, [watchlistData, logos]);

  const renderChangeCell = (value: number) => (
    <TableCell className={`text-right font-mono text-xs font-bold ${value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
      {value >= 0 ? '+' : ''}{value.toFixed(1)}%
    </TableCell>
  );

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-800/50">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="w-[200px] text-slate-400 font-bold py-3 sticky left-0 bg-slate-800/50 z-10">Company</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">Price</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">Daily</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">1W</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">1M</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">3M</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">YTD</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">1YR</TableHead>
              <TableHead className="text-right text-slate-400 font-bold">Mkt Cap</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row, idx) => (
              <TableRow key={`${row.ticker}-${idx}`} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                <TableCell className="font-medium py-3 sticky left-0 bg-slate-900/95 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {row.logoUrl ? (
                        <img src={row.logoUrl} alt={row.ticker} className="w-6 h-6 object-contain" />
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
                {renderChangeCell(row.change)}
                {renderChangeCell(row.w1Change)}
                {renderChangeCell(row.m1Change)}
                {renderChangeCell(row.m3Change)}
                {renderChangeCell(row.ytd)}
                {renderChangeCell(row.yr1)}
                <TableCell className="text-right font-mono text-xs text-slate-400">
                  {row.marketCap}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
