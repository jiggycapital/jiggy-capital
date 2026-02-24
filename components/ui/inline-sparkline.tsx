"use client";

import { useEffect, useState, memo } from "react";

interface InlineSparklineProps {
    ticker: string;
    width?: number;
    height?: number;
    days?: number; // number of trading days to show (default 30)
}

interface CandleData {
    c: number[]; // close prices
    h: number[];
    l: number[];
    o: number[];
    s: string; // status: "ok" or "no_data"
    t: number[]; // timestamps
    v: number[];
}

// Cache sparkline data in memory to avoid re-fetching
const sparklineCache: Record<string, number[]> = {};

function InlineSparklineInner({ ticker, width = 80, height = 24, days = 30 }: InlineSparklineProps) {
    const [prices, setPrices] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function fetchCandles() {
            // Skip cash/sum
            if (!ticker || ticker === "CASH" || ticker === "SUM") {
                setLoading(false);
                return;
            }

            // Check memory cache
            if (sparklineCache[ticker]) {
                setPrices(sparklineCache[ticker]);
                setLoading(false);
                return;
            }

            // Check localStorage cache
            try {
                const cached = localStorage.getItem(`sparkline_${ticker}`);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    // Use cache if less than 1 hour old
                    if (parsed.ts && Date.now() - parsed.ts < 3600000) {
                        sparklineCache[ticker] = parsed.data;
                        if (isMounted) {
                            setPrices(parsed.data);
                            setLoading(false);
                        }
                        return;
                    }
                }
            } catch (_) { }

            try {
                const range = days <= 30 ? '1mo' : days <= 90 ? '3mo' : days <= 180 ? '6mo' : '1y';
                const res = await fetch(
                    `/api/yahoo-chart?symbol=${ticker}&range=${range}&interval=1d`
                );

                if (res.ok) {
                    const data = await res.json();
                    if (data.prices && data.prices.length > 0) {
                        const closes = data.prices.slice(-days);
                        sparklineCache[ticker] = closes;

                        try {
                            localStorage.setItem(
                                `sparkline_${ticker}`,
                                JSON.stringify({ data: closes, ts: Date.now() })
                            );
                        } catch (_) { }

                        if (isMounted) setPrices(closes);
                    }
                }
            } catch (_) {
                // silently fail
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchCandles();

        return () => {
            isMounted = false;
        };
    }, [ticker, days]);

    if (loading) {
        return (
            <div
                style={{ width, height }}
                className="rounded bg-slate-800/50 animate-pulse"
            />
        );
    }

    if (prices.length < 2) {
        // No data available — show a subtle dash
        return (
            <div
                style={{ width, height }}
                className="flex items-center justify-center text-slate-600 text-[10px]"
            >
                —
            </div>
        );
    }

    // Calculate SVG path
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const padding = 1;

    const points = prices.map((price, i) => {
        const x = padding + (i / (prices.length - 1)) * (width - padding * 2);
        const y = padding + (1 - (price - min) / range) * (height - padding * 2);
        return { x, y };
    });

    const pathData = points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(" ");

    // Determine color: green if price went up, red if down
    const isUp = prices[prices.length - 1] >= prices[0];
    const strokeColor = isUp ? "#22c55e" : "#ef4444";

    // Create gradient fill path
    const fillPath = `${pathData} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="inline-block"
        >
            <defs>
                <linearGradient id={`grad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d={fillPath}
                fill={`url(#grad-${ticker})`}
            />
            <path
                d={pathData}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export const InlineSparkline = memo(InlineSparklineInner);
