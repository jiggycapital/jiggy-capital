import { NextRequest, NextResponse } from "next/server";

// Yahoo Finance chart API — free, no API key needed
// Returns historical price data for sparklines
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    const range = searchParams.get("range") || "1mo"; // 1d, 5d, 1mo, 3mo, 6mo, 1y
    const interval = searchParams.get("interval") || "1d"; // 1m, 5m, 15m, 1d, 1wk

    if (!symbol) {
        return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0",
            },
            next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Yahoo Finance error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        const result = data?.chart?.result?.[0];

        if (!result) {
            return NextResponse.json({ error: "No data returned" }, { status: 404 });
        }

        // Extract OHLCV data
        const quote = result.indicators?.quote?.[0] || {};
        const closes = quote.close || [];
        const opens = quote.open || [];
        const highs = quote.high || [];
        const lows = quote.low || [];
        const volumes = quote.volume || [];
        const rawTimestamps = result.timestamp || [];

        // Filter out null values, keeping arrays aligned
        const prices: number[] = [];
        const openPrices: number[] = [];
        const highPrices: number[] = [];
        const lowPrices: number[] = [];
        const timestamps: number[] = [];
        const volumeData: number[] = [];
        for (let i = 0; i < closes.length; i++) {
            if (closes[i] !== null && closes[i] !== undefined) {
                prices.push(closes[i]);
                openPrices.push(opens[i] ?? closes[i]);
                highPrices.push(highs[i] ?? closes[i]);
                lowPrices.push(lows[i] ?? closes[i]);
                timestamps.push(rawTimestamps[i] || 0);
                volumeData.push(volumes[i] || 0);
            }
        }

        return NextResponse.json({
            symbol: result.meta?.symbol || symbol,
            prices,
            opens: openPrices,
            highs: highPrices,
            lows: lowPrices,
            timestamps,
            volumes: volumeData,
        });
    } catch (error) {
        console.error("Yahoo Finance proxy error:", error);
        return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
    }
}
