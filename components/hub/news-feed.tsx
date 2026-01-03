"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper, ExternalLink, MessageSquare } from "lucide-react";

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
        
        const allFetchedNews: any[] = [];
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

        const uniqueNewsMap = new Map();
        allFetchedNews.forEach(n => {
          if (n.id && !uniqueNewsMap.has(n.id)) {
            uniqueNewsMap.set(n.id, n);
          }
        });
        const uniqueNews = Array.from(uniqueNewsMap.values());

        const filteredNews = uniqueNews.filter(n => {
          const ticker = (n.ticker || "").toUpperCase();
          const url = (n.url || "").toLowerCase();
          const source = (n.source || "").toLowerCase();
          
          if (ticker === 'TSLA') return false; // Filter out Tesla due to noise
          if (url.includes('fool.com')) return false;
          if (url.includes('seekingalpha.com')) return false;
          if (source.includes('seekingalpha')) return false;
          if (source.includes('seeking alpha')) return false;

          const headline = (n.headline || "").toLowerCase();
          const tickerLower = (n.ticker || "").toLowerCase();
          const companyName = (n.companyName || "").toLowerCase();
          
          const hasTicker = headline.includes(tickerLower);
          const companyWords = companyName.split(' ');
          const hasCompanyName = companyWords.some((word: string) => {
            if (word.length < 3) return false;
            return headline.includes(word);
          });

          return hasTicker || hasCompanyName;
        });

        const sortedNews = filteredNews
          .sort((a, b) => b.datetime - a.datetime)
          .slice(0, 30);

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
    <Card className={`bg-slate-900/50 border-slate-800 overflow-hidden flex flex-col shadow-2xl ${className || 'h-[750px]'}`}>
      <CardHeader className="py-4 border-b border-slate-800 shrink-0">
        <CardTitle className="text-sm font-bold flex items-center justify-between text-slate-100 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-emerald-400" />
            Company News
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-slate-500 lowercase font-normal italic">real-time pulses</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
            <p className="text-slate-500 text-sm">Aggregating market signal...</p>
          </div>
        ) : news.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-slate-500 text-sm italic">No relevant news found for your holdings</div>
        ) : (
                 <div className="divide-y divide-slate-800/50 overflow-y-auto flex-1 custom-scrollbar">
                   {news.map((item) => (
                     <div key={item.id} className="p-3.5 hover:bg-slate-800/40 transition-all flex gap-4 group relative overflow-hidden">
                       <div className="shrink-0 flex flex-col items-center gap-1.5 relative z-10">
                         <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 shadow-xl group-hover:border-emerald-500/30 transition-all transform group-hover:scale-105">
                           {logos[item.ticker] ? (
                             <img src={logos[item.ticker]} alt={item.ticker} className="w-6 h-6 object-contain" />
                           ) : (
                             <span className="text-[10px] font-black text-slate-500">{item.ticker}</span>
                           )}
                         </div>
                         <div className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[8px] font-black text-slate-400 font-mono tracking-tighter uppercase group-hover:bg-slate-700 group-hover:text-slate-200 transition-colors">
                           {item.ticker}
                         </div>
                       </div>
                       <div className="min-w-0 flex-1 relative z-10">
                         <div className="flex items-center justify-between mb-1">
                           <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">{item.source}</span>
                             <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                               <MessageSquare className="w-2.5 h-2.5" />
                               {new Date(item.datetime * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(item.datetime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </span>
                           </div>
                         </div>
                         <h4 className="text-[14px] font-bold text-slate-100 leading-[1.3] mb-1 group-hover:text-emerald-50 transition-colors tracking-tight">
                           {item.headline}
                         </h4>
                         <p className="text-[12px] text-slate-400 line-clamp-2 mb-2 leading-relaxed font-medium group-hover:text-slate-300 transition-colors">
                           {item.summary}
                         </p>
                         <a 
                           href={item.url} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="inline-flex items-center gap-2 text-[10px] font-black text-blue-400 hover:text-blue-300 transition-all transform group-hover:translate-x-1"
                         >
                           READ ANALYSIS <ExternalLink className="w-2.5 h-2.5" />
                         </a>
                       </div>
                       {/* Subtle background decoration */}
                       <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] rounded-full -translate-y-16 translate-x-16 pointer-events-none" />
                     </div>
                   ))}
                 </div>
        )}
      </CardContent>
    </Card>
  );
}
