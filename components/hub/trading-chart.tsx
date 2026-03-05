"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Loader2, Search, ChevronDown, X, Briefcase, Eye } from "lucide-react";
import { fetchSheetData, parseSheetData, fetchLogos } from "@/lib/google-sheets";

// --- Types ---

type CandleInterval = "5m" | "60m" | "1d" | "1wk" | "1mo" | "3mo";
type TimeRange = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y" | "max";

interface TickerInfo {
    ticker: string;
    source: "position" | "watchlist";
    earningsDate?: string;
    revenueBeat?: number | null;
    epsBeat?: number | null;
    weight?: number;
    price?: number;
}

// --- Constants ---

const INTERVALS: { label: string; value: CandleInterval }[] = [
    { label: "5m", value: "5m" },
    { label: "1H", value: "60m" },
    { label: "1D", value: "1d" },
    { label: "1W", value: "1wk" },
    { label: "1M", value: "1mo" },
    { label: "Q", value: "3mo" },
];

const TIME_RANGES: { label: string; value: TimeRange }[] = [
    { label: "1D", value: "1d" },
    { label: "5D", value: "5d" },
    { label: "1M", value: "1mo" },
    { label: "3M", value: "3mo" },
    { label: "6M", value: "6mo" },
    { label: "1Y", value: "1y" },
    { label: "5Y", value: "5y" },
    { label: "Max", value: "max" },
];

const RANGE_LABELS: Record<TimeRange, string> = {
    "1d": "Today", "5d": "5 Day", "1mo": "1 Month", "3mo": "3 Month",
    "6mo": "6 Month", "1y": "1 Year", "5y": "5 Year", "max": "All Time",
};

function defaultIntervalForRange(range: TimeRange): CandleInterval {
    switch (range) {
        case "1d": return "5m";
        case "5d": return "5m";
        case "1mo": return "60m";
        case "3mo": return "1d";
        case "6mo": return "1d";
        case "1y": return "1d";
        case "5y": return "1wk";
        case "max": return "1wk";
        default: return "1d";
    }
}

const VALID_RANGES: Record<CandleInterval, TimeRange[]> = {
    "5m": ["1d", "5d", "1mo"],
    "60m": ["5d", "1mo", "3mo", "6mo", "1y"],
    "1d": ["1mo", "3mo", "6mo", "1y", "5y", "max"],
    "1wk": ["3mo", "6mo", "1y", "5y", "max"],
    "1mo": ["1y", "5y", "max"],
    "3mo": ["5y", "max"],
};

function computeSMA(prices: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    for (let i = 0; i < prices.length; i++) {
        if (i < period - 1) { result.push(null); }
        else {
            let sum = 0;
            for (let j = i - period + 1; j <= i; j++) sum += prices[j];
            result.push(sum / period);
        }
    }
    return result;
}

function tsToDate(ts: number): string {
    const d = new Date(ts * 1000);
    return d.toISOString().split("T")[0];
}

function parsePercent(val: string | undefined): number | null {
    if (!val) return null;
    const cleaned = val.replace('%', '').replace('+', '').trim();
    const num = parseFloat(cleaned);
    if (isNaN(num) || num === -100) return null;
    return num;
}

function parseNumeric(val: string | undefined): number | null {
    if (!val) return null;
    const cleaned = val.replace(/[$,%+]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

const chartCache: Record<string, { data: any; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000;

// --- Grouped Ticker Picker ---
function TickerPicker({
    tickerInfos,
    logos,
    selectedTicker,
    onSelect,
}: {
    tickerInfos: TickerInfo[];
    logos: Record<string, string>;
    selectedTicker: string;
    onSelect: (ticker: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch("");
            }
        }
        if (isOpen) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && searchRef.current) searchRef.current.focus();
    }, [isOpen]);

    const positions = tickerInfos.filter(t => t.source === "position");
    const watchlist = tickerInfos.filter(t => t.source === "watchlist");

    const filterList = (list: TickerInfo[]) =>
        search ? list.filter(t => t.ticker.toLowerCase().includes(search.toLowerCase())) : list;

    const filteredPositions = filterList(positions);
    const filteredWatchlist = filterList(watchlist);

    const TickerRow = ({ info }: { info: TickerInfo }) => (
        <button
            onClick={() => { onSelect(info.ticker); setIsOpen(false); setSearch(""); }}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2 hover:bg-emerald-500/10 transition-colors text-left",
                info.ticker === selectedTicker && "bg-emerald-500/5"
            )}
        >
            {logos[info.ticker] ? (
                <img src={logos[info.ticker]} alt="" className="w-7 h-7 rounded-lg object-contain bg-terminal-bg border border-jiggy-border/50 p-0.5" />
            ) : (
                <div className="w-7 h-7 rounded-lg bg-jiggy-surface-2 border border-jiggy-border/50 flex items-center justify-center">
                    <span className="text-[8px] font-black text-slate-500">{info.ticker.slice(0, 2)}</span>
                </div>
            )}
            <span className={cn(
                "text-xs font-bold tracking-wide flex-1",
                info.ticker === selectedTicker ? "text-emerald-400" : "text-slate-300"
            )}>{info.ticker}</span>
            {info.ticker === selectedTicker && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
        </button>
    );

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2.5 h-10 bg-terminal-bg border border-jiggy-border rounded-xl px-3 hover:border-emerald-500/40 transition-all cursor-pointer"
            >
                {logos[selectedTicker] ? (
                    <img src={logos[selectedTicker]} alt="" className="w-6 h-6 rounded-md object-contain" />
                ) : (
                    <div className="w-6 h-6 rounded-md bg-jiggy-surface-2 flex items-center justify-center">
                        <span className="text-[8px] font-black text-slate-500">{selectedTicker?.slice(0, 2)}</span>
                    </div>
                )}
                <span className="text-sm font-black text-slate-200 tracking-tight">{selectedTicker}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-500 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-[#0d1117] border border-jiggy-border rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                    <div className="p-2 border-b border-jiggy-border">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search tickers..."
                                className="w-full h-8 bg-terminal-bg border border-jiggy-border rounded-lg pl-8 pr-8 text-xs text-slate-200 font-bold placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                            />
                            {search && (
                                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <X className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto overscroll-contain">
                        {/* Positions Section */}
                        {filteredPositions.length > 0 && (
                            <>
                                <div className="sticky top-0 bg-[#0d1117]/95 backdrop-blur-sm px-3 py-1.5 border-b border-jiggy-border/50">
                                    <div className="flex items-center gap-1.5">
                                        <Briefcase className="w-3 h-3 text-emerald-400" />
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Positions</span>
                                        <span className="text-[9px] text-slate-600 font-bold ml-auto">{filteredPositions.length}</span>
                                    </div>
                                </div>
                                {filteredPositions.map(info => <TickerRow key={info.ticker} info={info} />)}
                            </>
                        )}

                        {/* Watchlist Section */}
                        {filteredWatchlist.length > 0 && (
                            <>
                                <div className="sticky top-0 bg-[#0d1117]/95 backdrop-blur-sm px-3 py-1.5 border-b border-jiggy-border/50">
                                    <div className="flex items-center gap-1.5">
                                        <Eye className="w-3 h-3 text-amber-400" />
                                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Watchlist</span>
                                        <span className="text-[9px] text-slate-600 font-bold ml-auto">{filteredWatchlist.length}</span>
                                    </div>
                                </div>
                                {filteredWatchlist.map(info => <TickerRow key={info.ticker} info={info} />)}
                            </>
                        )}

                        {filteredPositions.length === 0 && filteredWatchlist.length === 0 && (
                            <div className="px-3 py-4 text-center text-xs text-slate-500">No tickers found</div>
                        )}
                    </div>

                    <div className="px-3 py-1.5 border-t border-jiggy-border">
                        <p className="text-[9px] text-slate-600 font-bold">
                            {positions.length} positions · {watchlist.length} watchlist
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Main Component ---

export function TradingChart() {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const candleSeriesRef = useRef<any>(null);
    const volumeSeriesRef = useRef<any>(null);
    const ma50SeriesRef = useRef<any>(null);
    const ma200SeriesRef = useRef<any>(null);

    const [lcModule, setLcModule] = useState<any>(null);
    const [tickerInfos, setTickerInfos] = useState<TickerInfo[]>([]);
    const [logos, setLogos] = useState<Record<string, string>>({});
    const [selectedTicker, setSelectedTicker] = useState<string>("");
    const [timeRange, setTimeRange] = useState<TimeRange>("1y");
    const [interval, setInterval] = useState<CandleInterval>("1d");
    const [tickersLoading, setTickersLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [priceChange, setPriceChange] = useState<number>(0);
    const [priceChangePct, setPriceChangePct] = useState<number>(0);

    const selectedInfo = tickerInfos.find(t => t.ticker === selectedTicker);

    const handleRangeChange = useCallback((newRange: TimeRange) => {
        setTimeRange(newRange);
        if (!VALID_RANGES[interval].includes(newRange)) {
            setInterval(defaultIntervalForRange(newRange));
        }
    }, [interval]);

    const handleIntervalChange = useCallback((newInterval: CandleInterval) => {
        setInterval(newInterval);
        if (!VALID_RANGES[newInterval].includes(timeRange)) {
            const validRanges = VALID_RANGES[newInterval];
            setTimeRange(validRanges[Math.floor(validRanges.length / 2)]);
        }
    }, [timeRange]);

    const validRangesForInterval = VALID_RANGES[interval];

    // Step 1: Load tickers with earnings data + source categorization
    useEffect(() => {
        let cancelled = false;
        async function loadTickers() {
            try {
                const [positionsRows, watchlistRows, portfolioRows] = await Promise.all([
                    fetchSheetData("positions"),
                    fetchSheetData("watchlist"),
                    fetchSheetData("portfolio"),
                ]);
                const positions = parseSheetData(positionsRows);
                const watchlist = parseSheetData(watchlistRows);
                const portfolio = parseSheetData(portfolioRows);

                // Build portfolio weight map
                const totalValue = portfolio.reduce((sum, p) => {
                    return sum + (parseNumeric(p["Market Value"] || p["Value"]) || 0);
                }, 0);
                const portfolioMap: Record<string, { weight: number; price: number }> = {};
                portfolio.forEach(p => {
                    const t = (p.Ticker || p.Symbol || "").toUpperCase();
                    if (t && t !== "CASH" && t !== "SUM") {
                        const mv = parseNumeric(p["Market Value"] || p["Value"]) || 0;
                        portfolioMap[t] = {
                            weight: totalValue > 0 ? (mv / totalValue) * 100 : 0,
                            price: parseNumeric(p.Price) || 0,
                        };
                    }
                });

                const infos: TickerInfo[] = [];
                const seen = new Set<string>();

                // Positions first
                positions.forEach(row => {
                    const t = (row.ticker || row.Ticker || "").toUpperCase();
                    if (!t || t === "CASH" || t === "SUM" || seen.has(t)) return;
                    seen.add(t);
                    infos.push({
                        ticker: t,
                        source: "position",
                        earningsDate: row["Earnings Date"] || "",
                        revenueBeat: parsePercent(row["Revenue Beat / Miss %"]),
                        epsBeat: parsePercent(row["EPS Beat / Miss %"]),
                        weight: portfolioMap[t]?.weight,
                        price: portfolioMap[t]?.price,
                    });
                });

                // Watchlist
                watchlist.forEach(row => {
                    const t = (row.ticker || row.Ticker || "").toUpperCase();
                    if (!t || t === "CASH" || t === "SUM" || seen.has(t)) return;
                    seen.add(t);
                    infos.push({
                        ticker: t,
                        source: "watchlist",
                        earningsDate: row["Earnings Date"] || "",
                        revenueBeat: parsePercent(row["Revenue Beat / Miss %"]),
                        epsBeat: parsePercent(row["EPS Beat / Miss %"]),
                    });
                });

                if (!cancelled) {
                    setTickerInfos(infos);
                    if (infos.length > 0) setSelectedTicker(infos[0].ticker);
                }

                const { logos: logosData } = await fetchLogos();
                if (!cancelled) setLogos(logosData);
            } catch (err) {
                if (!cancelled) setError("Failed to load tickers");
            } finally {
                if (!cancelled) setTickersLoading(false);
            }
        }
        loadTickers();
        return () => { cancelled = true; };
    }, []);

    // Step 2: Load lightweight-charts
    useEffect(() => {
        let cancelled = false;
        import("lightweight-charts").then(mod => { if (!cancelled) setLcModule(mod); });
        return () => { cancelled = true; };
    }, []);

    // Step 3: Create chart
    useEffect(() => {
        if (!lcModule || !chartContainerRef.current) return;
        const container = chartContainerRef.current;
        const { width, height } = container.getBoundingClientRect();
        const isIntraday = interval === "5m" || interval === "60m";

        const chart = lcModule.createChart(container, {
            width: Math.max(width, 100),
            height: Math.max(height, 300),
            layout: {
                background: { type: lcModule.ColorType.Solid, color: "transparent" },
                textColor: "#64748b",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: "rgba(49, 64, 59, 0.5)", style: lcModule.LineStyle.Dotted },
                horzLines: { color: "rgba(49, 64, 59, 0.5)", style: lcModule.LineStyle.Dotted },
            },
            crosshair: {
                mode: lcModule.CrosshairMode.Normal,
                vertLine: { color: "rgba(194, 160, 119, 0.3)", width: 1, style: lcModule.LineStyle.Dashed, labelBackgroundColor: "#1a2520" },
                horzLine: { color: "rgba(194, 160, 119, 0.3)", width: 1, style: lcModule.LineStyle.Dashed, labelBackgroundColor: "#1a2520" },
            },
            rightPriceScale: { borderColor: "#31403b", scaleMargins: { top: 0.05, bottom: 0.15 } },
            timeScale: { borderColor: "#31403b", timeVisible: isIntraday, secondsVisible: false },
            handleScroll: { vertTouchDrag: false },
            handleScale: { axisPressedMouseMove: false },
        });

        chartRef.current = chart;

        candleSeriesRef.current = chart.addSeries(lcModule.CandlestickSeries, {
            upColor: "#22c55e", downColor: "#ef4444",
            borderUpColor: "#22c55e", borderDownColor: "#ef4444",
            wickUpColor: "#22c55e", wickDownColor: "#ef4444",
        });

        volumeSeriesRef.current = chart.addSeries(lcModule.HistogramSeries, {
            priceFormat: { type: "volume" }, priceScaleId: "volume",
        });
        chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

        ma50SeriesRef.current = chart.addSeries(lcModule.LineSeries, {
            color: "#34d399", lineWidth: 2, lineStyle: lcModule.LineStyle.Dashed,
            priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false,
        });

        ma200SeriesRef.current = chart.addSeries(lcModule.LineSeries, {
            color: "#c2a077", lineWidth: 2, lineStyle: lcModule.LineStyle.Dashed,
            priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false,
        });

        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0]) {
                const { width: w, height: h } = entries[0].contentRect;
                if (w > 0 && h > 0) chart.applyOptions({ width: w, height: h });
            }
        });
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
            candleSeriesRef.current = null;
            volumeSeriesRef.current = null;
            ma50SeriesRef.current = null;
            ma200SeriesRef.current = null;
        };
    }, [lcModule, interval]);

    // Step 4: Load data + add earnings markers
    useEffect(() => {
        if (!selectedTicker || !chartRef.current || !candleSeriesRef.current) return;
        let cancelled = false;

        async function loadData() {
            setDataLoading(true);
            setError(null);
            try {
                const cacheKey = `${selectedTicker}_${timeRange}_${interval}`;
                let data = chartCache[cacheKey]?.data;

                if (!data || Date.now() - (chartCache[cacheKey]?.ts || 0) > CACHE_TTL) {
                    const res = await fetch(
                        `/api/yahoo-chart?symbol=${encodeURIComponent(selectedTicker)}&range=${timeRange}&interval=${interval}`
                    );
                    if (!res.ok) throw new Error(`Failed to fetch ${selectedTicker}`);
                    data = await res.json();
                    if (!data.prices || data.prices.length === 0) throw new Error(`No data for ${selectedTicker}`);
                    chartCache[cacheKey] = { data, ts: Date.now() };
                }

                if (cancelled) return;

                const { prices, opens, highs, lows, timestamps, volumes } = data;
                const ma50Full = computeSMA(prices, 50);
                const ma200Full = computeSMA(prices, 200);
                const isIntraday = interval === "5m" || interval === "60m";

                const candleData: any[] = [];
                const volumeData: any[] = [];
                const ma50Data: any[] = [];
                const ma200Data: any[] = [];

                for (let i = 0; i < prices.length; i++) {
                    const time = isIntraday ? (timestamps[i] as any) : tsToDate(timestamps[i]);
                    const isUp = prices[i] >= opens[i];
                    candleData.push({ time, open: opens[i], high: highs[i], low: lows[i], close: prices[i] });
                    volumeData.push({ time, value: volumes[i], color: isUp ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)" });
                    if (ma50Full[i] !== null) ma50Data.push({ time, value: ma50Full[i] });
                    if (ma200Full[i] !== null) ma200Data.push({ time, value: ma200Full[i] });
                }

                if (cancelled) return;

                candleSeriesRef.current?.setData(candleData);
                volumeSeriesRef.current?.setData(volumeData);
                ma50SeriesRef.current?.setData(ma50Data);
                ma200SeriesRef.current?.setData(ma200Data);


                // --- Add entry price line for owned positions ---
                const info = tickerInfos.find(t => t.ticker === selectedTicker);
                if (info?.source === "position" && info.price && info.price > 0) {
                    candleSeriesRef.current?.createPriceLine({
                        price: info.price,
                        color: "#8b5cf6",
                        lineWidth: 1,
                        lineStyle: 2, // Dashed
                        axisLabelVisible: true,
                        title: "Position",
                    });
                }

                chartRef.current?.timeScale().fitContent();

                if (candleData.length > 0) {
                    const latest = candleData[candleData.length - 1];
                    const first = candleData[0];
                    setCurrentPrice(latest.close);
                    setPriceChange(latest.close - first.open);
                    setPriceChangePct(((latest.close - first.open) / first.open) * 100);
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load data");
            } finally {
                if (!cancelled) setDataLoading(false);
            }
        }

        loadData();
        return () => { cancelled = true; };
    }, [selectedTicker, timeRange, interval, lcModule, tickerInfos]);

    const isUp = priceChange >= 0;

    return (
        <div className="flex flex-col h-[calc(100dvh-3rem-5rem)] md:h-[calc(100vh-var(--header-height,0px))]">
            {/* Toolbar */}
            <div className="shrink-0 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-jiggy-border shadow-2xl z-30">
                <div className="px-2 md:px-4 py-2 md:py-2.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                    {/* Row 1: Ticker + Badge + Price */}
                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                        <TickerPicker
                            tickerInfos={tickerInfos}
                            logos={logos}
                            selectedTicker={selectedTicker}
                            onSelect={setSelectedTicker}
                        />

                        {/* Source Badge */}
                        {selectedInfo && (
                            <div className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                selectedInfo.source === "position"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            )}>
                                {selectedInfo.source === "position" ? <Briefcase className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                {selectedInfo.source === "position" ? "Position" : "Watchlist"}
                                {selectedInfo.weight != null && (
                                    <span className="ml-1 opacity-70">{selectedInfo.weight.toFixed(1)}%</span>
                                )}
                            </div>
                        )}

                        {/* Price Display */}
                        {currentPrice !== null && (
                            <div className="flex items-center gap-3">
                                <span className="text-base md:text-lg font-black text-slate-100 font-mono tabular-nums">
                                    ${currentPrice.toFixed(2)}
                                </span>
                                <div className={cn(
                                    "flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold font-mono",
                                    isUp ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                )}>
                                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    <span>{isUp ? "+" : ""}{priceChange.toFixed(2)}</span>
                                    <span className="text-[10px] opacity-70">({isUp ? "+" : ""}{priceChangePct.toFixed(2)}%)</span>
                                </div>
                                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                                    {RANGE_LABELS[timeRange]} Chg
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Row 2: Interval + Range */}
                    <div className="flex items-center gap-2 md:gap-3 overflow-x-auto snap-x md:overflow-visible md:ml-auto">

                        {/* Candle Interval */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest pl-1">Interval</span>
                            <div className="flex bg-terminal-bg rounded-xl p-0.5 border border-jiggy-border shadow-inner">
                                {INTERVALS.map(iv => (
                                    <Button key={iv.value} variant="ghost" size="sm"
                                        className={cn(
                                            "px-1.5 md:px-2.5 py-1 h-7 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all rounded-lg",
                                            interval === iv.value
                                                ? "bg-jiggy-gold text-slate-950 shadow-md"
                                                : "text-slate-500 hover:text-slate-400 hover:bg-jiggy-surface-2"
                                        )}
                                        onClick={() => handleIntervalChange(iv.value)}
                                    >{iv.label}</Button>
                                ))}
                            </div>
                        </div>

                        {/* Time Range */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest pl-1">Range</span>
                            <div className="flex bg-terminal-bg rounded-xl p-0.5 border border-jiggy-border shadow-inner">
                                {TIME_RANGES.map(tr => {
                                    const isValid = validRangesForInterval.includes(tr.value);
                                    return (
                                        <Button key={tr.value} variant="ghost" size="sm" disabled={!isValid}
                                            className={cn(
                                                "px-1.5 md:px-2.5 py-1 h-7 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all rounded-lg",
                                                timeRange === tr.value
                                                    ? "bg-emerald-400 text-slate-950 shadow-md"
                                                    : isValid
                                                        ? "text-slate-500 hover:text-slate-400 hover:bg-jiggy-surface-2"
                                                        : "text-slate-700 opacity-40 cursor-not-allowed"
                                            )}
                                            onClick={() => isValid && handleRangeChange(tr.value)}
                                        >{tr.label}</Button>
                                    );
                                })}
                            </div>
                        </div>

                        {dataLoading && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />}
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 min-h-0 relative bg-[#0B0F19]/40">
                {/* Jiggy Capital branding — top left */}
                <div className="absolute top-4 left-5 flex items-center gap-3 pointer-events-none z-[3] opacity-40">
                    <img src="/jiggy-icon.png" alt="" className="w-7 h-7 md:w-10 md:h-10 object-contain" />
                    <span className="hidden md:inline text-base font-black text-slate-500 tracking-[0.25em] uppercase">Jiggy Capital</span>
                </div>

                {/* Company logo watermark */}
                {logos[selectedTicker] && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
                        <img
                            src={logos[selectedTicker]}
                            alt=""
                            className="w-48 h-48 md:w-72 md:h-72 object-contain opacity-[0.07] select-none"
                            draggable={false}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    </div>
                )}

                {(!lcModule || tickersLoading) && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                                {tickersLoading ? "Loading tickers..." : "Initializing chart..."}
                            </p>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50 backdrop-blur-sm">
                        <p className="text-rose-400 text-sm font-bold">{error}</p>
                    </div>
                )}
                <div ref={chartContainerRef} className="w-full h-full relative z-[2]" />
            </div>
        </div>
    );
}
