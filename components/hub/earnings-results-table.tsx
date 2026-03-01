"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    TrendingUp,
    TrendingDown,
    Trophy,
    Briefcase,
    Eye,
    BarChart3,
} from "lucide-react";

export interface EarningsResult {
    ticker: string;
    company: string;
    source: "portfolio" | "watchlist";
    earningsDate: string;
    enteredResults: boolean;
    // Actual results
    revenue: number | null;
    eps: number | null;
    fcf: number | null;
    // Expected values
    expRevenue: number | null;
    expEps: number | null;
    expFcf: number | null;
    // Beat/miss percentages (from sheet, pre-computed)
    revenueBeatPercent: number | null;
    epsBeatPercent: number | null;
    fcfBeatPercent: number | null;
    // Guidance beat
    nextQRevBeatPercent: number | null;
    nextQEpsBeatPercent: number | null;
    // Revenue growth
    revenueYoYGrowth: string;
    epsYoYGrowth: string;
}

interface EarningsResultsTableProps {
    results: EarningsResult[];
    logos: Record<string, string>;
    loading: boolean;
    onSelectTicker?: (ticker: string) => void;
}

type SortKey =
    | "ticker"
    | "earningsDate"
    | "eps"
    | "epsBeatPercent"
    | "revenue"
    | "revenueBeatPercent"
    | "fcfBeatPercent"
    | "nextQRevBeatPercent";
type SortDirection = "asc" | "desc";

export function EarningsResultsTable({
    results,
    logos,
    loading,
    onSelectTicker,
}: EarningsResultsTableProps) {
    const [filter, setFilter] = useState<"all" | "portfolio" | "watchlist">("all");
    const [sortKey, setSortKey] = useState<SortKey>("revenueBeatPercent");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

    const handleSort = useCallback(
        (key: SortKey) => {
            if (sortKey === key) {
                setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
            } else {
                setSortKey(key);
                setSortDirection(key === "ticker" || key === "earningsDate" ? "asc" : "desc");
            }
        },
        [sortKey]
    );

    // Only show rows where results have been entered
    const enteredResults = useMemo(() => {
        return results.filter((r) => r.enteredResults);
    }, [results]);

    const filteredAndSorted = useMemo(() => {
        let filtered = enteredResults;
        if (filter !== "all") {
            filtered = enteredResults.filter((r) => r.source === filter);
        }

        return [...filtered].sort((a, b) => {
            const direction = sortDirection === "asc" ? 1 : -1;
            const aVal = a[sortKey];
            const bVal = b[sortKey];

            if (aVal === null && bVal === null) return 0;
            if (aVal === null) return 1;
            if (bVal === null) return -1;

            if (typeof aVal === "string" && typeof bVal === "string") {
                return aVal.localeCompare(bVal) * direction;
            }
            if (typeof aVal === "number" && typeof bVal === "number") {
                return (aVal - bVal) * direction;
            }
            return 0;
        });
    }, [enteredResults, filter, sortKey, sortDirection]);

    // Summary stats
    const summaryStats = useMemo(() => {
        const filtered = filter === "all" ? enteredResults : enteredResults.filter((r) => r.source === filter);
        const withEps = filtered.filter((r) => r.epsBeatPercent !== null);
        const withRev = filtered.filter((r) => r.revenueBeatPercent !== null);
        const epsBeats = withEps.filter((r) => (r.epsBeatPercent ?? 0) > 0).length;
        const revBeats = withRev.filter((r) => (r.revenueBeatPercent ?? 0) > 0).length;

        const avgEpsBeat =
            withEps.length > 0
                ? withEps.reduce((sum, r) => sum + (r.epsBeatPercent ?? 0), 0) / withEps.length
                : 0;
        const avgRevBeat =
            withRev.length > 0
                ? withRev.reduce((sum, r) => sum + (r.revenueBeatPercent ?? 0), 0) / withRev.length
                : 0;

        return {
            total: filtered.length,
            withEps: withEps.length,
            withRev: withRev.length,
            epsBeats,
            epsBeatRate: withEps.length > 0 ? (epsBeats / withEps.length) * 100 : 0,
            revBeats,
            revBeatRate: withRev.length > 0 ? (revBeats / withRev.length) * 100 : 0,
            avgEpsBeat,
            avgRevBeat,
        };
    }, [enteredResults, filter]);

    const totalAll = results.filter((r) => r.enteredResults).length;
    const totalPortfolio = results.filter((r) => r.enteredResults && r.source === "portfolio").length;
    const totalWatchlist = results.filter((r) => r.enteredResults && r.source === "watchlist").length;

    const formatRevenue = (val: number | null) => {
        if (val === null) return "—";
        if (Math.abs(val) >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
        if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(0)}M`;
        if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
        return `$${val.toLocaleString()}`;
    };

    const formatBeatPercent = (val: number | null) => {
        if (val === null) return "—";
        const sign = val > 0 ? "+" : "";
        return `${sign}${val.toFixed(2)}%`;
    };

    const getBeatColor = (val: number | null) => {
        if (val === null) return "text-slate-500";
        if (val > 0) return "text-emerald-400";
        if (val < 0) return "text-rose-400";
        return "text-slate-400";
    };

    const getBeatBg = (val: number | null) => {
        if (val === null) return "";
        if (val > 0) return "bg-emerald-500/5";
        if (val < 0) return "bg-rose-500/5";
        return "";
    };

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortKey !== column)
            return <ArrowUpDown className="w-3 h-3 text-slate-600 ml-1 inline" />;
        return sortDirection === "asc" ? (
            <ArrowUp className="w-3 h-3 text-purple-400 ml-1 inline" />
        ) : (
            <ArrowDown className="w-3 h-3 text-purple-400 ml-1 inline" />
        );
    };

    return (
        <Card className="bg-slate-900/50 border-slate-800 shadow-2xl overflow-hidden">
            <CardHeader className="py-4 border-b border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-slate-100 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        Recent Earnings Results
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setFilter("all")}
                            className={`text-[9px] font-black px-2 py-1 rounded border uppercase tracking-tighter transition-all ${filter === "all"
                                ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                : "bg-slate-800/50 text-slate-500 border-slate-700/50 hover:text-slate-300"
                                }`}
                        >
                            All ({totalAll})
                        </button>
                        <button
                            onClick={() => setFilter("portfolio")}
                            className={`text-[9px] font-black px-2 py-1 rounded border uppercase tracking-tighter transition-all flex items-center gap-1 ${filter === "portfolio"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : "bg-slate-800/50 text-slate-500 border-slate-700/50 hover:text-slate-300"
                                }`}
                        >
                            <Briefcase className="w-2.5 h-2.5" />
                            Portfolio ({totalPortfolio})
                        </button>
                        <button
                            onClick={() => setFilter("watchlist")}
                            className={`text-[9px] font-black px-2 py-1 rounded border uppercase tracking-tighter transition-all flex items-center gap-1 ${filter === "watchlist"
                                ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                                : "bg-slate-800/50 text-slate-500 border-slate-700/50 hover:text-slate-300"
                                }`}
                        >
                            <Eye className="w-2.5 h-2.5" />
                            Watchlist ({totalWatchlist})
                        </button>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
                {/* Summary Stats Bar */}
                {!loading && enteredResults.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-slate-800/50">
                        <div className="px-4 py-3 border-r border-slate-800/50">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                Reported
                            </div>
                            <div className="text-lg font-black text-slate-100 font-mono tabular-nums">
                                {summaryStats.total}
                            </div>
                        </div>
                        <div className="px-4 py-3 border-r border-slate-800/50">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                EPS Beat Rate
                            </div>
                            <div className={`text-lg font-black font-mono tabular-nums ${summaryStats.epsBeatRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                                {summaryStats.epsBeatRate.toFixed(0)}%
                            </div>
                            <div className="text-[9px] text-slate-600 font-mono">
                                {summaryStats.epsBeats}/{summaryStats.withEps} beat
                            </div>
                        </div>
                        <div className="px-4 py-3 border-r border-slate-800/50">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                Rev Beat Rate
                            </div>
                            <div className={`text-lg font-black font-mono tabular-nums ${summaryStats.revBeatRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                                {summaryStats.revBeatRate.toFixed(0)}%
                            </div>
                            <div className="text-[9px] text-slate-600 font-mono">
                                {summaryStats.revBeats}/{summaryStats.withRev} beat
                            </div>
                        </div>
                        <div className="px-4 py-3">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                Avg Rev Beat
                            </div>
                            <div
                                className={`text-lg font-black font-mono tabular-nums ${getBeatColor(
                                    summaryStats.avgRevBeat
                                )}`}
                            >
                                {formatBeatPercent(summaryStats.avgRevBeat)}
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
                        <p className="text-slate-500 text-sm">
                            Loading earnings data...
                        </p>
                    </div>
                ) : filteredAndSorted.length === 0 ? (
                    <div className="py-16 text-center">
                        <BarChart3 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-sm text-slate-500 italic">
                            No earnings results entered yet
                        </p>
                        <p className="text-[10px] text-slate-600 mt-1">
                            Results populate from your Google Sheet — mark &quot;Entered Results&quot; for each ticker
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-800/80">
                                    <th
                                        className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors sticky left-0 bg-slate-900/90 backdrop-blur-sm z-10"
                                        onClick={() => handleSort("ticker")}
                                    >
                                        Company
                                        <SortIcon column="ticker" />
                                    </th>
                                    <th
                                        className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors text-right whitespace-nowrap"
                                        onClick={() => handleSort("revenue")}
                                    >
                                        Revenue
                                        <SortIcon column="revenue" />
                                    </th>
                                    <th
                                        className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors text-right whitespace-nowrap"
                                        onClick={() => handleSort("revenueBeatPercent")}
                                    >
                                        Rev Beat %
                                        <SortIcon column="revenueBeatPercent" />
                                    </th>
                                    <th
                                        className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors text-right whitespace-nowrap"
                                        onClick={() => handleSort("nextQRevBeatPercent")}
                                    >
                                        Guide Beat %
                                        <SortIcon column="nextQRevBeatPercent" />
                                    </th>
                                    <th
                                        className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors text-right whitespace-nowrap"
                                        onClick={() => handleSort("eps")}
                                    >
                                        EPS
                                        <SortIcon column="eps" />
                                    </th>
                                    <th
                                        className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors text-right whitespace-nowrap"
                                        onClick={() => handleSort("epsBeatPercent")}
                                    >
                                        EPS Beat %
                                        <SortIcon column="epsBeatPercent" />
                                    </th>
                                    <th
                                        className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors text-right whitespace-nowrap"
                                        onClick={() => handleSort("fcfBeatPercent")}
                                    >
                                        FCF Beat %
                                        <SortIcon column="fcfBeatPercent" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSorted.map((result, idx) => (
                                    <tr
                                        key={result.ticker}
                                        className={`border-b border-slate-800/30 hover:bg-slate-800/40 transition-all cursor-pointer group ${idx % 2 === 0 ? "bg-transparent" : "bg-slate-900/20"
                                            }`}
                                        onClick={() => onSelectTicker?.(result.ticker)}
                                    >
                                        {/* Company */}
                                        <td className="px-4 py-3 sticky left-0 bg-inherit backdrop-blur-sm z-10">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 group-hover:border-purple-500/40 transition-colors">
                                                    {logos[result.ticker] ? (
                                                        <img
                                                            src={logos[result.ticker]}
                                                            alt={result.ticker}
                                                            className="w-5 h-5 object-contain"
                                                        />
                                                    ) : (
                                                        <span className="text-[8px] font-bold text-slate-500">
                                                            {result.ticker}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-slate-100 group-hover:text-purple-300 transition-colors">
                                                            {result.ticker}
                                                        </span>
                                                        <span
                                                            className={`text-[7px] font-black px-1 py-0.5 rounded border uppercase tracking-tighter ${result.source === "portfolio"
                                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                                : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                                                }`}
                                                        >
                                                            {result.source}
                                                        </span>
                                                    </div>
                                                    <div className="text-[9px] text-slate-600 truncate max-w-[120px]">
                                                        {result.company}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Revenue */}
                                        <td className="px-3 py-3 text-right">
                                            <span className="text-xs font-bold text-slate-100 font-mono tabular-nums">
                                                {formatRevenue(result.revenue)}
                                            </span>
                                            {result.revenueYoYGrowth && (
                                                <div className="text-[9px] text-slate-500 font-mono">
                                                    {result.revenueYoYGrowth} Y/Y
                                                </div>
                                            )}
                                        </td>

                                        {/* Revenue Beat % */}
                                        <td
                                            className={`px-3 py-3 text-right ${getBeatBg(result.revenueBeatPercent)}`}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                {result.revenueBeatPercent !== null &&
                                                    result.revenueBeatPercent !== 0 &&
                                                    (result.revenueBeatPercent > 0 ? (
                                                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                                                    ) : (
                                                        <TrendingDown className="w-3 h-3 text-rose-400" />
                                                    ))}
                                                <span
                                                    className={`text-xs font-black font-mono tabular-nums ${getBeatColor(result.revenueBeatPercent)}`}
                                                >
                                                    {formatBeatPercent(result.revenueBeatPercent)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Guidance Beat % */}
                                        <td
                                            className={`px-3 py-3 text-right ${getBeatBg(result.nextQRevBeatPercent)}`}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                {result.nextQRevBeatPercent !== null &&
                                                    result.nextQRevBeatPercent !== 0 &&
                                                    (result.nextQRevBeatPercent > 0 ? (
                                                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                                                    ) : (
                                                        <TrendingDown className="w-3 h-3 text-rose-400" />
                                                    ))}
                                                <span
                                                    className={`text-xs font-black font-mono tabular-nums ${getBeatColor(result.nextQRevBeatPercent)}`}
                                                >
                                                    {formatBeatPercent(result.nextQRevBeatPercent)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* EPS */}
                                        <td className="px-3 py-3 text-right">
                                            <span className="text-xs font-bold text-slate-100 font-mono tabular-nums">
                                                {result.eps !== null
                                                    ? `$${result.eps.toFixed(2)}`
                                                    : "—"}
                                            </span>
                                        </td>

                                        {/* EPS Beat % */}
                                        <td
                                            className={`px-3 py-3 text-right ${getBeatBg(result.epsBeatPercent)}`}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                {result.epsBeatPercent !== null &&
                                                    result.epsBeatPercent !== 0 &&
                                                    (result.epsBeatPercent > 0 ? (
                                                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                                                    ) : (
                                                        <TrendingDown className="w-3 h-3 text-rose-400" />
                                                    ))}
                                                <span
                                                    className={`text-xs font-black font-mono tabular-nums ${getBeatColor(result.epsBeatPercent)}`}
                                                >
                                                    {formatBeatPercent(result.epsBeatPercent)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* FCF Beat % */}
                                        <td
                                            className={`px-3 py-3 text-right ${getBeatBg(result.fcfBeatPercent)}`}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                {result.fcfBeatPercent !== null &&
                                                    result.fcfBeatPercent !== 0 &&
                                                    (result.fcfBeatPercent > 0 ? (
                                                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                                                    ) : (
                                                        <TrendingDown className="w-3 h-3 text-rose-400" />
                                                    ))}
                                                <span
                                                    className={`text-xs font-black font-mono tabular-nums ${getBeatColor(result.fcfBeatPercent)}`}
                                                >
                                                    {formatBeatPercent(result.fcfBeatPercent)}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
