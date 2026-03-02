"use client";

import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatNumber, formatPercentage, parseNumeric } from "@/lib/utils";
import type { PortfolioRow } from "@/types/portfolio";

interface StockDetailSheetProps {
  stock: PortfolioRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockDetailSheet({ stock, open, onOpenChange }: StockDetailSheetProps) {
  const ticker = stock.Ticker || stock.Symbol || "N/A";
  const company = stock.Company || stock.Name || "N/A";

  // Extract revenue history (2018-2027e)
  const revenueHistory = useMemo(() => {
    const years = [];
    for (let year = 2018; year <= 2027; year++) {
      const key = `${year} Revenue` || `${year}e Revenue` || `${year} Rev`;
      const value = stock[key] || stock[`${year}e Revenue`] || stock[`${year} Rev`];
      const num = parseNumeric(value as string);
      if (num !== null) {
        years.push({
          year: year <= new Date().getFullYear() ? year.toString() : `${year}e`,
          revenue: num,
        });
      }
    }
    return years;
  }, [stock]);

  // Extract profitability metrics
  const profitabilityHistory = useMemo(() => {
    const data = [];
    for (let year = 2018; year <= 2027; year++) {
      const ebitda = parseNumeric(String(stock[`${year} EBITDA`] || stock[`${year}e EBITDA`] || ""));
      const fcf = parseNumeric(String(stock[`${year} FCF`] || stock[`${year}e FCF`] || stock[`${year} Free Cash Flow`] || ""));
      const revenue = parseNumeric(String(stock[`${year} Revenue`] || stock[`${year}e Revenue`] || ""));

      if (revenue !== null) {
        data.push({
          year: year <= new Date().getFullYear() ? year.toString() : `${year}e`,
          ebitdaMargin: ebitda && revenue ? (ebitda / revenue) * 100 : null,
          fcfMargin: fcf && revenue ? (fcf / revenue) * 100 : null,
        });
      }
    }
    return data.filter(d => d.ebitdaMargin !== null || d.fcfMargin !== null);
  }, [stock]);

  // Valuation metrics
  const valuationMetrics = useMemo(() => {
    const currentPE = parseNumeric(String(stock["P/E"] || stock["Current P/E"] || stock["P/E (NTM)"] || ""));
    const pe2026 = parseNumeric(String(stock["2026e P/E"] || stock["2026 P/E"] || ""));
    const historicalPE = parseNumeric(String(stock["Historical Avg P/E"] || stock["5Y Avg P/E"] || ""));

    return {
      currentPE,
      pe2026,
      historicalPE,
    };
  }, [stock]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto bg-jiggy-surface border-l border-jiggy-border" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle className="text-slate-100 text-3xl font-black italic tracking-tighter">{ticker}</SheetTitle>
          <SheetDescription className="text-emerald-400 font-bold tracking-widest uppercase text-[10px]">{company}</SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-6">
          <Tabs defaultValue="revenue" className="w-full">
            <TabsList className="bg-jiggy-surface-2 border border-jiggy-border p-1.5 rounded-2xl shadow-inner mb-2">
              <TabsTrigger value="revenue" className="data-[state=active]:bg-emerald-400 data-[state=active]:text-slate-950 font-black tracking-widest uppercase text-[10px] px-6 py-2 rounded-xl transition-all">
                Revenue Growth
              </TabsTrigger>
              <TabsTrigger value="profitability" className="data-[state=active]:bg-emerald-400 data-[state=active]:text-slate-950 font-black tracking-widest uppercase text-[10px] px-6 py-2 rounded-xl transition-all">
                Profitability
              </TabsTrigger>
              <TabsTrigger value="valuation" className="data-[state=active]:bg-emerald-400 data-[state=active]:text-slate-950 font-black tracking-widest uppercase text-[10px] px-6 py-2 rounded-xl transition-all">
                Valuation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="mt-4 outline-none">
              <Card className="bg-jiggy-surface-2 border-jiggy-border rounded-2xl shadow-2xl">
                <CardHeader className="border-b border-jiggy-border">
                  <CardTitle className="text-slate-100">Revenue History & Estimates</CardTitle>
                  <CardDescription className="text-slate-400">
                    2018 - 2027e Revenue (Millions)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={revenueHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#25332f" />
                      <XAxis dataKey="year" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#06090e", border: "1px solid #16202e", color: "#e2e8f0", borderRadius: '12px' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profitability" className="mt-4 outline-none">
              <Card className="bg-jiggy-surface-2 border-jiggy-border rounded-2xl shadow-2xl">
                <CardHeader className="border-b border-jiggy-border">
                  <CardTitle className="text-slate-100">Profitability Margins</CardTitle>
                  <CardDescription className="text-slate-400">
                    EBITDA Margin vs FCF Margin (%)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={profitabilityHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#25332f" />
                      <XAxis dataKey="year" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#06090e", border: "1px solid #16202e", color: "#e2e8f0", borderRadius: '12px' }}
                        formatter={(value: number) => `${value?.toFixed(2)}%`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="ebitdaMargin"
                        stroke="#facc15"
                        name="EBITDA Margin"
                        strokeWidth={3}
                      />
                      <Line
                        type="monotone"
                        dataKey="fcfMargin"
                        stroke="#10b981"
                        name="FCF Margin"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="valuation" className="mt-4 outline-none">
              <Card className="bg-jiggy-surface-2 border-jiggy-border rounded-2xl shadow-2xl">
                <CardHeader className="border-b border-jiggy-border">
                  <CardTitle className="text-slate-100">Valuation Metrics</CardTitle>
                  <CardDescription className="text-slate-400">
                    P/E Comparison
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-jiggy-surface p-6 rounded-2xl border border-jiggy-border shadow-sm">
                        <div className="text-emerald-500/70 font-black tracking-widest uppercase text-[10px] mb-2">Current P/E</div>
                        <div className="text-slate-100 text-3xl font-black italic">
                          {valuationMetrics.currentPE ? formatNumber(valuationMetrics.currentPE) : "-"}
                        </div>
                      </div>
                      <div className="bg-jiggy-surface p-6 rounded-2xl border border-jiggy-border shadow-sm">
                        <div className="text-emerald-500/70 font-black tracking-widest uppercase text-[10px] mb-2">2026e P/E</div>
                        <div className="text-slate-100 text-3xl font-black italic">
                          {valuationMetrics.pe2026 ? formatNumber(valuationMetrics.pe2026) : "-"}
                        </div>
                      </div>
                      <div className="bg-jiggy-surface p-6 rounded-2xl border border-jiggy-border shadow-sm">
                        <div className="text-emerald-500/70 font-black tracking-widest uppercase text-[10px] mb-2">Historical Avg</div>
                        <div className="text-slate-100 text-3xl font-black italic">
                          {valuationMetrics.historicalPE ? formatNumber(valuationMetrics.historicalPE) : "-"}
                        </div>
                      </div>
                    </div>
                    {valuationMetrics.currentPE && valuationMetrics.pe2026 && (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={[
                            { name: "Current", value: valuationMetrics.currentPE },
                            { name: "2026e", value: valuationMetrics.pe2026 },
                            { name: "Historical Avg", value: valuationMetrics.historicalPE || 0 },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#25332f" />
                          <XAxis dataKey="name" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                          <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#06090e", border: "1px solid #16202e", color: "#e2e8f0", borderRadius: '12px' }}
                          />
                          <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

