import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint");
  const symbol = searchParams.get("symbol");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const resolution = searchParams.get("resolution");
  const token = process.env.FINNHUB_API_KEY || "d2l0fm1r01qqq9qsstfgd2l0fm1r01qqq9qsstg0";

  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
  }

  let url = `https://finnhub.io/api/v1/${endpoint}?token=${token}`;
  if (symbol) url += `&symbol=${symbol}`;
  if (from) url += `&from=${from}`;
  if (to) url += `&to=${to}`;
  if (resolution) url += `&resolution=${resolution}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Finnhub API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Finnhub proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch data from Finnhub" }, { status: 500 });
  }
}
