import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");
    const tickers = searchParams.get("tickers");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = searchParams.get("limit") || "50";
    const page = searchParams.get("page") || "0";

    const apiKey = process.env.FMP_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "FMP API key not configured. Set FMP_API_KEY in environment variables." },
            { status: 500 }
        );
    }

    if (!endpoint) {
        return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
    }

    // Map friendly endpoint names to FMP stable API paths
    const endpointMap: Record<string, string> = {
        "stock-news": "news/stock",
        "stock-news-latest": "news/stock-latest",
        "profile": "profile",
    };

    const fmpPath = endpointMap[endpoint] || endpoint;
    let url = `https://financialmodelingprep.com/stable/${fmpPath}?apikey=${apiKey}`;

    if (tickers) url += `&tickers=${tickers}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;
    if (limit) url += `&limit=${limit}`;
    if (page) url += `&page=${page}`;

    // For profile endpoint, use symbol param instead of tickers
    const symbol = searchParams.get("symbol");
    if (symbol) url += `&symbol=${symbol}`;

    try {
        const response = await fetch(url, {
            next: { revalidate: 300 }, // Cache for 5 minutes
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: `FMP API error: ${response.statusText}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("FMP proxy error:", error);
        return NextResponse.json({ error: "Failed to fetch data from FMP" }, { status: 500 });
    }
}
