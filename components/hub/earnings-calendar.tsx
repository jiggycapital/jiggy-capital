"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Calendar,
    Clock,
    ExternalLink,
    ChevronRight,
    Briefcase,
    Eye,
} from "lucide-react";

interface EarningsEvent {
    ticker: string;
    date: string;
    title: string;
    source: "portfolio" | "watchlist";
}

interface EarningsCalendarProps {
    events: EarningsEvent[];
    loading: boolean;
    logos: Record<string, string>;
    irLinks: Record<string, string>;
    selectedTicker: string | null;
    onSelectTicker: (ticker: string) => void;
    portfolioTickers: string[];
    watchlistTickers: string[];
}

interface WeekGroup {
    label: string;
    startDate: Date;
    events: EarningsEvent[];
    isThisWeek: boolean;
}

export function EarningsCalendar({
    events,
    loading,
    logos,
    irLinks,
    selectedTicker,
    onSelectTicker,
    portfolioTickers,
    watchlistTickers,
}: EarningsCalendarProps) {
    const [filter, setFilter] = useState<"all" | "portfolio" | "watchlist">("all");

    const filteredEvents = useMemo(() => {
        if (filter === "all") return events;
        return events.filter((e) => e.source === filter);
    }, [events, filter]);

    // Group events by day
    const dayGroups = useMemo(() => {
        const groups: { dateStr: string; dateObj: Date; events: EarningsEvent[] }[] = [];

        filteredEvents.forEach(event => {
            const dateObj = new Date(event.date);
            dateObj.setHours(0, 0, 0, 0);
            const dateStr = dateObj.toISOString().split("T")[0];

            let group = groups.find(g => g.dateStr === dateStr);
            if (!group) {
                group = { dateStr, dateObj, events: [] };
                groups.push(group);
            }
            group.events.push(event);
        });

        groups.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
        return groups;
    }, [filteredEvents]);

    const getCountdown = (dateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        const diff = Math.ceil(
            (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff === 0) return "Today";
        if (diff === 1) return "Tomorrow";
        if (diff <= 7) return `${diff}d`;
        return `${Math.ceil(diff / 7)}w`;
    };

    return (
        <Card className="bg-jiggy-surface border border-jiggy-tan/50 shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="py-4 border-b border-jiggy-tan/50 bg-jiggy-surface-2">
                <CardTitle className="text-sm font-black flex items-center justify-between text-slate-100 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-emerald-400" />
                        Upcoming Earnings Schedule
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <button
                            onClick={() => setFilter("all")}
                            className={`text-[10px] font-black px-3 py-1.5 rounded-xl border uppercase tracking-wider transition-all ${filter === "all"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-sm"
                                : "bg-terminal-bg text-slate-400 border-jiggy-border hover:bg-slate-800/40 hover:text-slate-200"
                                }`}
                        >
                            All ({events.length})
                        </button>
                        <button
                            onClick={() => setFilter("portfolio")}
                            className={`text-[10px] font-black px-3 py-1.5 rounded-xl border uppercase tracking-wider transition-all flex items-center gap-1.5 ${filter === "portfolio"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-sm"
                                : "bg-terminal-bg text-slate-400 border-jiggy-border hover:bg-slate-800/40 hover:text-slate-200"
                                }`}
                        >
                            <Briefcase className="w-3 h-3" />
                            Portfolio
                        </button>
                        <button
                            onClick={() => setFilter("watchlist")}
                            className={`text-[10px] font-black px-3 py-1.5 rounded-xl border uppercase tracking-wider transition-all flex items-center gap-1.5 ${filter === "watchlist"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-sm"
                                : "bg-terminal-bg text-slate-400 border-jiggy-border hover:bg-slate-800/40 hover:text-slate-200"
                                }`}
                        >
                            <Eye className="w-3 h-3" />
                            Watchlist
                        </button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 bg-terminal-bg/50">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
                        <p className="text-slate-500 text-sm">
                            Synchronizing earnings calendar...
                        </p>
                    </div>
                ) : dayGroups.length === 0 ? (
                    <div className="py-16 text-center">
                        <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-sm text-slate-500 italic">
                            No upcoming earnings found
                        </p>
                    </div>
                ) : (
                    <div className="max-h-[700px] overflow-y-auto custom-scrollbar p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dayGroups.map((group, gi) => (
                                <div key={gi} className="bg-jiggy-surface-2 border border-jiggy-border rounded-2xl overflow-hidden flex flex-col shadow-lg shadow-black/20">
                                    {/* Day Header */}
                                    <div className="px-4 py-3 border-b border-jiggy-border bg-emerald-500/5 flex items-center justify-between">
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                {group.dateObj.toLocaleDateString(undefined, { weekday: "long" })}
                                            </div>
                                            <div className="text-sm font-black text-slate-100">
                                                {group.dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                {getCountdown(group.dateStr)}
                                            </span>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                {group.events.length} Report{group.events.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Companies Stack */}
                                    <div className="flex-1 p-3 flex flex-col gap-2">
                                        {group.events.map((event, ei) => (
                                            <button
                                                key={`${event.ticker}-${ei}`}
                                                onClick={() => onSelectTicker(event.ticker)}
                                                className={`w-full flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-left group ${selectedTicker === event.ticker ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm" : ""
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-terminal-bg flex items-center justify-center shrink-0 border border-slate-700/50 group-hover:border-emerald-500/40 transition-colors shadow-sm overflow-hidden">
                                                        {logos[event.ticker] ? (
                                                            <img
                                                                src={logos[event.ticker]}
                                                                alt={event.ticker}
                                                                className="w-5 h-5 object-contain"
                                                            />
                                                        ) : (
                                                            <span className="text-[8px] font-black text-slate-500">
                                                                {event.ticker}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex flex-col">
                                                        <span className="text-sm font-black text-slate-100 group-hover:text-emerald-400 transition-colors tabular-nums">
                                                            {event.ticker}
                                                        </span>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest ${event.source === 'portfolio' ? 'text-emerald-500' : 'text-sky-500'
                                                            }`}>
                                                            {event.source}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
