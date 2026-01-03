"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ExternalLink, Clock } from "lucide-react";

interface Event {
  ticker: string;
  name: string;
  date: string;
  title: string;
  type: "earnings";
  link?: string;
}

interface UpcomingEventsProps {
  portfolioTickers: string[];
  logos: Record<string, string>;
  irLinks: Record<string, string>; // From Logos Pt2 sheet
  className?: string;
}

export function UpcomingEvents({ portfolioTickers, logos, irLinks, className }: UpcomingEventsProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        
        // 0. Check Cache
        const CACHE_KEY = "finnhub_upcoming_events_v2";
        const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
        
        try {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_EXPIRY) {
              setEvents(data);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn("Failed to read events cache:", e);
        }

        const allEvents: Event[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Fetch Earnings sequentially to avoid rate limiting
        const cleanTickers = portfolioTickers
          .map(t => t.toString().toUpperCase())
          .filter(t => t && t !== "CASH" && t !== "SUM");

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (const ticker of cleanTickers) {
          try {
            const fromDate = today.toISOString().split('T')[0];
            const toDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const resp = await fetch(`/api/finnhub?endpoint=calendar/earnings&symbol=${ticker}&from=${fromDate}&to=${toDate}`);
            
            if (resp.ok) {
              const data = await resp.json();
              if (data.earningsCalendar && Array.isArray(data.earningsCalendar)) {
                data.earningsCalendar.forEach((e: any) => {
                  allEvents.push({
                    ticker: e.symbol,
                    name: e.symbol,
                    date: e.date,
                    title: "Earnings Call",
                    type: "earnings" as const,
                  });
                });
              }
            }
            // Small delay to prevent rate limiting
            await sleep(100);
          } catch (e) {
            console.error(`Error fetching earnings for ${ticker}:`, e);
          }
        }

        const sortedEvents = allEvents
          .filter(e => new Date(e.date) >= today)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Save to cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          data: sortedEvents
        }));

        setEvents(sortedEvents);
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setLoading(false);
      }
    }

    if (portfolioTickers.length > 0) {
      fetchEvents();
    }
  }, [portfolioTickers, irLinks]);

  return (
    <Card className={`bg-slate-900/50 border-slate-800 overflow-hidden flex flex-col shadow-2xl ${className || 'h-[750px]'}`}>
      <CardHeader className="py-4 border-b border-slate-800 shrink-0">
        <CardTitle className="text-sm font-bold flex items-center justify-between text-slate-100 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            Upcoming Events
          </div>
          <span className="text-[10px] text-slate-500 lowercase font-normal italic">Updated every 24h</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            </div>
            <p className="text-slate-500 text-sm">Synchronizing calendars...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-slate-500 text-sm italic">No upcoming events scheduled</div>
        ) : (
          <div className="divide-y divide-slate-800/50 overflow-y-auto flex-1 custom-scrollbar">
            {events.map((event, i) => (
              <div key={`${event.ticker}-${i}`} className="p-4 hover:bg-slate-800/40 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 shadow-inner group-hover:border-purple-500/50 transition-colors">
                      {logos[event.ticker] ? (
                        <img src={logos[event.ticker]} alt={event.ticker} className="w-7 h-7 object-contain" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">{event.ticker}</span>
                      )}
                    </div>
                    {event.type === 'earnings' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900 shadow-sm animate-pulse" title="Earnings Season" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-slate-100 group-hover:text-purple-300 transition-colors">{event.ticker}</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded tracking-tighter uppercase border bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {event.type}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 truncate pr-2 font-medium tracking-tight uppercase opacity-70 group-hover:opacity-100">{event.title}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="bg-slate-800/80 px-2 py-1 rounded border border-slate-700/50 group-hover:bg-slate-800 group-hover:border-slate-600 transition-all">
                    <div className="text-[11px] font-mono font-bold text-slate-200 flex items-center gap-1.5 justify-end">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                    </div>
                  </div>
                  {event.link && (
                    <a 
                      href={event.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 justify-end mt-1.5 tracking-wide uppercase opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 transition-all"
                    >
                      Resource <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
