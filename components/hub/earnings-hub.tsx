"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchSheetData, parseSheetData, fetchLogos } from "@/lib/google-sheets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EarningsCalendar } from "./earnings-calendar";
import { EarningsDetail } from "./earnings-detail";
import {
    Mic,
    Calendar,
    TrendingUp,
    Clock,
    AlertTriangle,
    Zap,
    ChevronRight,
    ExternalLink,
} from "lucide-react";

interface EarningsEvent {
    ticker: string;
    date: string;
    title: string;
    source: "portfolio" | "watchlist";
}

export function EarningsHub() {
    const [positionsData, setPositionsData] = useState<any[]>([]);
    const [watchlistData, setWatchlistData] = useState<any[]>([]);
    const [logos, setLogos] = useState<Record<string, string>>({});
    const [irLinks, setIrLinks] = useState<Record<string, string>>({});
    const [events, setEvents] = useState<EarningsEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

    // Load sheet data
    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const [portfolioRows, watchlistRows, logosData, logosPt2Rows] =
                    await Promise.all([
                        fetchSheetData("portfolio"),
                        fetchSheetData("watchlistDashboard"),
                        fetchLogos(),
                        fetchSheetData("logosPt2"),
                    ]);

                const parsedPositions = parseSheetData(portfolioRows);
                setPositionsData(parsedPositions);

                const parsedWatchlist = parseSheetData(watchlistRows);
                setWatchlistData(parsedWatchlist);

                setLogos(logosData.logos);

                // Parse IR links
                const irMap: Record<string, string> = { ...logosData.irLinks };
                const logosPt2Parsed = parseSheetData(logosPt2Rows);
                logosPt2Parsed.forEach((row) => {
                    const ticker = row.Ticker || row.Symbol;
                    const irLink =
                        row["IR Link"] ||
                        row.Link ||
                        row[
                        Object.keys(row).find((k) =>
                            k.toLowerCase().includes("ir")
                        ) || ""
                        ];
                    if (ticker && irLink) {
                        irMap[ticker.toUpperCase()] = irLink;
                    }
                });
                setIrLinks(irMap);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load data");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Extract tickers
    const portfolioTickers = useMemo(() => {
        return positionsData
            .filter(
                (p) =>
                    p.Ticker &&
                    p.Ticker !== "CASH" &&
                    p.Ticker !== "Cash" &&
                    p.Ticker !== "SUM"
            )
            .map((p) => p.Ticker.toUpperCase());
    }, [positionsData]);

    const watchlistTickers = useMemo(() => {
        return watchlistData
            .filter(
                (w) =>
                    (w.Ticker || w.Symbol) &&
                    (w.Ticker || w.Symbol) !== "CASH" &&
                    (w.Ticker || w.Symbol) !== "SUM"
            )
            .map((w) => (w.Ticker || w.Symbol).toUpperCase());
    }, [watchlistData]);

    const allTickers = useMemo(() => {
        return [...new Set([...portfolioTickers, ...watchlistTickers])];
    }, [portfolioTickers, watchlistTickers]);

    // Fetch earnings calendar
    useEffect(() => {
        async function fetchEarnings() {
            if (allTickers.length === 0) return;

            try {
                setEventsLoading(true);

                // Check localStorage cache
                const CACHE_KEY = "earnings_hub_calendar_v1";
                const CACHE_EXPIRY = 12 * 60 * 60 * 1000; // 12 hours

                try {
                    const cached = localStorage.getItem(CACHE_KEY);
                    if (cached) {
                        const { timestamp, data } = JSON.parse(cached);
                        if (Date.now() - timestamp < CACHE_EXPIRY) {
                            setEvents(data);
                            setEventsLoading(false);
                            return;
                        }
                    }
                } catch (e) {
                    console.warn("Failed to read earnings cache:", e);
                }

                const allEvents: EarningsEvent[] = [];
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const fromDate = today.toISOString().split("T")[0];
                const toDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0];

                const sleep = (ms: number) =>
                    new Promise((resolve) => setTimeout(resolve, ms));

                for (const ticker of allTickers) {
                    try {
                        const resp = await fetch(
                            `/api/finnhub?endpoint=calendar/earnings&symbol=${ticker}&from=${fromDate}&to=${toDate}`
                        );

                        if (resp.ok) {
                            const data = await resp.json();
                            if (
                                data.earningsCalendar &&
                                Array.isArray(data.earningsCalendar)
                            ) {
                                data.earningsCalendar.forEach((e: any) => {
                                    let tickerToUse = e.symbol;
                                    if (tickerToUse === "7974.T") tickerToUse = "NTDOY";

                                    allEvents.push({
                                        ticker: tickerToUse,
                                        date: e.date,
                                        title: "Earnings Call",
                                        source: portfolioTickers.includes(ticker)
                                            ? "portfolio"
                                            : "watchlist",
                                    });
                                });
                            }
                        }
                        await sleep(80);
                    } catch (e) {
                        console.error(`Error fetching earnings for ${ticker}:`, e);
                    }
                }

                const sortedEvents = allEvents
                    .filter((e) => new Date(e.date) >= today)
                    .sort(
                        (a, b) =>
                            new Date(a.date).getTime() - new Date(b.date).getTime()
                    );

                // Cache
                try {
                    localStorage.setItem(
                        CACHE_KEY,
                        JSON.stringify({ timestamp: Date.now(), data: sortedEvents })
                    );
                } catch (e) {
                    console.warn("Failed to cache earnings:", e);
                }

                setEvents(sortedEvents);
            } catch (err) {
                console.error("Failed to load earnings:", err);
            } finally {
                setEventsLoading(false);
            }
        }

        fetchEarnings();
    }, [allTickers, portfolioTickers]);

    // Compute "this week" events
    const thisWeekEvents = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + 7);

        return events.filter((e) => {
            const d = new Date(e.date);
            return d >= today && d < endOfWeek;
        });
    }, [events]);

    // Get countdown label
    const getCountdown = useCallback((dateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        const diff = Math.ceil(
            (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff === 0) return "Today";
        if (diff === 1) return "Tomorrow";
        return `In ${diff} days`;
    }, []);

    const getCountdownColor = useCallback((dateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        const diff = Math.ceil(
            (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff === 0) return "text-rose-400 bg-rose-500/10 border-rose-500/20";
        if (diff === 1) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    }, []);

    if (loading) {
        return (
            <div className="space-y-6 max-w-[1600px] mx-auto p-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20">
                        <Mic className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
                            Earnings Hub
                        </h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                            Earnings Intelligence Center
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-32 bg-slate-900/50" />
                    <Skeleton className="h-32 bg-slate-900/50" />
                    <Skeleton className="h-32 bg-slate-900/50" />
                </div>
                <Skeleton className="h-[500px] bg-slate-900/50" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-rose-400 bg-rose-400/10 rounded-xl border border-rose-400/20">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 shadow-lg shadow-purple-500/5">
                        <Mic className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
                            Earnings Hub
                        </h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                            Portfolio & Watchlist Earnings Intelligence
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        Tracking {allTickers.length} tickers
                    </span>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
            </div>

            {/* Reporting This Week Hero */}
            <Card className="bg-gradient-to-br from-slate-900/80 via-purple-950/20 to-slate-900/80 border-purple-500/10 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full -translate-y-32 translate-x-32 pointer-events-none" />
                <CardHeader className="pb-3 relative z-10">
                    <CardTitle className="text-sm font-bold flex items-center justify-between text-slate-100 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-400" />
                            Reporting This Week
                        </div>
                        <span className="text-[10px] text-slate-500 lowercase font-normal italic">
                            Next 7 days
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                    {eventsLoading ? (
                        <div className="flex items-center gap-3 py-4">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400" />
                            <span className="text-sm text-slate-500">
                                Loading earnings calendar...
                            </span>
                        </div>
                    ) : thisWeekEvents.length === 0 ? (
                        <div className="py-6 text-center">
                            <Calendar className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                            <p className="text-sm text-slate-500 italic">
                                No earnings scheduled this week for your tickers
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {thisWeekEvents.map((event, i) => (
                                <button
                                    key={`${event.ticker}-${i}`}
                                    onClick={() => setSelectedTicker(event.ticker)}
                                    className="group flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/30 hover:bg-slate-800/60 transition-all cursor-pointer text-left"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 group-hover:border-purple-500/40 transition-colors shadow-inner">
                                        {logos[event.ticker] ? (
                                            <img
                                                src={logos[event.ticker]}
                                                alt={event.ticker}
                                                className="w-6 h-6 object-contain"
                                            />
                                        ) : (
                                            <span className="text-[9px] font-bold text-slate-500">
                                                {event.ticker}
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-sm font-bold text-slate-100 group-hover:text-purple-300 transition-colors">
                                                {event.ticker}
                                            </span>
                                            <span
                                                className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-tighter ${event.source === "portfolio"
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                        : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                                    }`}
                                            >
                                                {event.source}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-500 font-mono">
                                                {new Date(event.date)
                                                    .toLocaleDateString(undefined, {
                                                        weekday: "short",
                                                        month: "short",
                                                        day: "numeric",
                                                    })
                                                    .toUpperCase()}
                                            </span>
                                            <span
                                                className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${getCountdownColor(
                                                    event.date
                                                )}`}
                                            >
                                                {getCountdown(event.date)}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 shrink-0 transition-colors" />
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Earnings Calendar */}
                <div className={selectedTicker ? "lg:col-span-5" : "lg:col-span-12"}>
                    <EarningsCalendar
                        events={events}
                        loading={eventsLoading}
                        logos={logos}
                        irLinks={irLinks}
                        selectedTicker={selectedTicker}
                        onSelectTicker={setSelectedTicker}
                        portfolioTickers={portfolioTickers}
                        watchlistTickers={watchlistTickers}
                    />
                </div>

                {/* Detail Panel */}
                {selectedTicker && (
                    <div className="lg:col-span-7">
                        <EarningsDetail
                            ticker={selectedTicker}
                            logos={logos}
                            irLinks={irLinks}
                            onClose={() => setSelectedTicker(null)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
