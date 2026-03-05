"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper, ExternalLink, MessageSquare } from "lucide-react";

/**
 * Advanced headline relevance checker to filter out "clout-chasing" news.
 */
function isHeadlineRelevant(headline: string, ticker: string, companyName: string): boolean {
  const h = headline.toLowerCase();
  const t = ticker.toLowerCase();
  const n = companyName.toLowerCase().replace(/ (inc|corp|ltd|plc|class [ab])$/i, "").trim();

  if (!h.includes(t) && !h.includes(n)) return false;

  const platformKeywords = [
    "launches on", "available on", "now on", "integrated with",
    "integration with", "listed on", "marketplace", "app store",
    "play store", "on aws", "on azure", "on google cloud",
    "partnership with", "support for", "using google", "using microsoft",
    "powered by", "built on", "hosted on"
  ];

  for (const phrase of platformKeywords) {
    if (h.includes(phrase)) {
      const phraseIdx = h.indexOf(phrase);
      const companyIdx = h.includes(t) ? h.indexOf(t) : h.indexOf(n);
      if (companyIdx > phraseIdx) {
        const first15 = h.substring(0, 15);
        if (first15.includes(t) || first15.includes(n)) return true;
        return false;
      }
    }
  }

  if (h.includes(":") || h.includes(" - ")) {
    const separator = h.includes(":") ? ":" : " - ";
    const parts = h.split(separator);
    const subject = parts[0].trim();
    const details = parts.slice(1).join(separator).trim();
    const inSubject = subject.includes(t) || subject.includes(n);
    const inDetails = details.includes(t) || details.includes(n);
    if (inDetails && !inSubject) {
      const financeKeywords = ["shares", "stock", "earnings", "dividend", "revenue", "profit", "outlook", "guidance", "buyback"];
      if (!financeKeywords.some(k => details.includes(k))) {
        return false;
      }
    }
  }

  return true;
}

interface NewsItem {
  id: string;
  ticker: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  image: string;
}

interface NewsFeedProps {
  portfolioData: any[];
  logos: Record<string, string>;
  className?: string;
}

export function NewsFeed({ portfolioData, logos, className }: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsSource, setNewsSource] = useState<"fmp" | "finnhub">("fmp");

  useEffect(() => {
    async function fetchNews() {
      try {
        setLoading(true);
        const today = new Date();
        const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
        const fromDate = sevenDaysAgo.toISOString().split('T')[0];
        const toDate = today.toISOString().split('T')[0];

        const tickers = portfolioData
          .map(p => ({
            ticker: (p.Ticker || p.Symbol || "").toString().toUpperCase(),
            name: p.Name || p.Company || p.Ticker || p.Symbol || ""
          }))
          .filter(t => t.ticker && t.ticker !== "CASH" && t.ticker !== "SUM");

        // Try FMP first (multi-source news: Reuters, CNBC, MarketWatch, etc.)
        let allFetchedNews: any[] = [];
        let usedFMP = false;

        try {
          const tickerList = tickers.map(t => t.ticker).join(",");
          const fmpResp = await fetch(
            `/api/fmp?endpoint=stock-news&tickers=${tickerList}&from=${fromDate}&to=${toDate}&limit=100`
          );

          if (fmpResp.ok) {
            const fmpData = await fmpResp.json();
            if (Array.isArray(fmpData) && fmpData.length > 0) {
              allFetchedNews = fmpData.map((item: any) => ({
                id: item.url || `fmp-${item.publishedDate}-${item.title?.substring(0, 20)}`,
                ticker: (item.symbol || item.tickers || "").toString().split(",")[0].toUpperCase(),
                headline: item.title || "",
                summary: item.text || "",
                source: item.site || item.source || "FMP",
                url: item.url || "",
                datetime: item.publishedDate ? Math.floor(new Date(item.publishedDate).getTime() / 1000) : 0,
                image: item.image || "",
                companyName: tickers.find(t => t.ticker === (item.symbol || "").toUpperCase())?.name || "",
              }));
              usedFMP = true;
              setNewsSource("fmp");
            }
          }
        } catch (e) {
          console.warn("FMP news fetch failed, falling back to Finnhub:", e);
        }

        // Fallback to Finnhub if FMP fails or returns no data
        if (!usedFMP) {
          setNewsSource("finnhub");
          const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

          for (const item of tickers) {
            try {
              const resp = await fetch(`/api/finnhub?endpoint=company-news&symbol=${item.ticker}&from=${fromDate}&to=${toDate}`);
              if (!resp.ok) continue;

              const data = await resp.json();
              if (Array.isArray(data)) {
                const taggedNews = data.map((newsItem: any) => ({
                  ...newsItem,
                  ticker: item.ticker,
                  companyName: item.name
                }));
                allFetchedNews.push(...taggedNews);
              }
              await sleep(100);
            } catch (e) {
              console.error(`Error fetching news for ${item.ticker}:`, e);
            }
          }
        }

        // Deduplicate
        const uniqueNewsMap = new Map();
        allFetchedNews.forEach(n => {
          const key = n.id || n.url || `${n.headline}-${n.datetime}`;
          if (key && !uniqueNewsMap.has(key)) {
            uniqueNewsMap.set(key, n);
          }
        });
        const uniqueNews = Array.from(uniqueNewsMap.values());

        // Filter
        const filteredNews = uniqueNews.filter(n => {
          const ticker = (n.ticker || "").toUpperCase();
          const headline = n.headline || "";
          const companyName = n.companyName || "";

          if (ticker === 'TSLA') return false;

          return isHeadlineRelevant(headline, ticker, companyName);
        });

        const sortedNews = filteredNews
          .sort((a, b) => b.datetime - a.datetime)
          .slice(0, 40);

        setNews(sortedNews);
      } catch (err) {
        console.error("Failed to load news:", err);
      } finally {
        setLoading(false);
      }
    }

    if (portfolioData.length > 0) {
      fetchNews();
    }
  }, [portfolioData]);

  return (
    <Card className={`bg-jiggy-surface border border-jiggy-tan/50 overflow-hidden flex flex-col shadow-2xl rounded-xl md:rounded-2xl ${className || 'h-[400px] md:h-[750px]'}`}>
      <CardHeader className="py-2 md:py-4 border-b border-jiggy-tan/50 shrink-0 bg-jiggy-surface-2 px-3 md:px-6">
        <CardTitle className="text-xs md:text-sm font-bold flex items-center justify-between text-slate-100 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 md:w-5 md:h-5 text-jiggy-gold" />
            Company News
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[9px] text-slate-600 lowercase font-semibold">
              {newsSource === "fmp" ? "multi-source" : "finnhub"}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jiggy-gold"></div>
            </div>
            <p className="text-slate-500 text-sm">Aggregating market signal...</p>
          </div>
        ) : news.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-slate-500 text-sm italic">No relevant news found for your holdings</div>
        ) : (
          <div className="divide-y divide-jiggy-border border-t border-jiggy-border overflow-y-auto flex-1 custom-scrollbar">
            {news.map((item) => (
              <div key={item.id} className="p-2 md:p-4 hover:bg-jiggy-surface-2 transition-all flex gap-2 md:gap-4 group relative overflow-hidden active:bg-jiggy-surface-2/50">
                <div className="shrink-0 flex flex-col items-center gap-1 md:gap-1.5 relative z-10">
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-terminal-bg flex items-center justify-center shrink-0 border border-jiggy-tan/50 shadow-xl group-hover:border-jiggy-gold/40 transition-all transform group-hover:scale-105 logo-glow">
                    {logos[item.ticker] ? (
                      <img src={logos[item.ticker]} alt={item.ticker} className="w-5 h-5 md:w-8 md:h-8 object-contain drop-shadow-sm" />
                    ) : (
                      <span className="text-[10px] font-black text-slate-500">{item.ticker}</span>
                    )}
                  </div>
                  <div className="px-1.5 py-0.5 rounded bg-terminal-bg border border-jiggy-border text-[9px] font-black text-slate-400 font-mono tracking-tighter uppercase group-hover:text-jiggy-gold transition-colors">
                    {item.ticker}
                  </div>
                </div>
                <div className="min-w-0 flex-1 relative z-10">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-jiggy-gold bg-jiggy-gold/10 border border-jiggy-gold/20 px-1.5 py-0.5 rounded uppercase tracking-tighter">{item.source}</span>
                      <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-500" />
                        {new Date(item.datetime * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(item.datetime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <h4 className="text-xs md:text-[15px] font-extrabold text-slate-100 leading-[1.3] mb-1 md:mb-1.5 group-hover:text-jiggy-gold transition-colors tracking-tight line-clamp-2">
                    {item.headline}
                  </h4>
                  <p className="text-[11px] md:text-[13px] text-slate-300 line-clamp-2 mb-1 md:mb-2 leading-relaxed font-medium transition-colors hidden md:block">
                    {item.summary}
                  </p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[10px] font-black text-jiggy-gold hover:text-jiggy-gold-alt transition-all transform group-hover:translate-x-1 py-1 active:opacity-70"
                  >
                    READ ARTICLE <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
