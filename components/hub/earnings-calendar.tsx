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

    // Group events by week
    const weekGroups = useMemo(() => {
        const groups: WeekGroup[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get the start of current week (Sunday)
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - today.getDay());

        filteredEvents.forEach((event) => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);

            // Get the start of the event's week
            const eventWeekStart = new Date(eventDate);
            eventWeekStart.setDate(eventDate.getDate() - eventDate.getDay());

            const weekKey = eventWeekStart.toISOString().split("T")[0];
            const isThisWeek = eventWeekStart.getTime() === currentWeekStart.getTime();

            let group = groups.find(
                (g) => g.startDate.getTime() === eventWeekStart.getTime()
            );

            if (!group) {
                const endOfWeek = new Date(eventWeekStart);
                endOfWeek.setDate(eventWeekStart.getDate() + 6);

                const label = isThisWeek
                    ? "This Week"
                    : `${eventWeekStart.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                    })} — ${endOfWeek.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                    })}`;

                group = {
                    label,
                    startDate: eventWeekStart,
                    events: [],
                    isThisWeek,
                };
                groups.push(group);
            }

            group.events.push(event);
        });

        groups.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
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
        <Card className="bg-jiggy-surface border-jiggy-border shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="py-4 border-b border-jiggy-border bg-jiggy-surface-2">
                <CardTitle className="text-sm font-black flex items-center justify-between text-slate-100 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-emerald-400" />
                        Earnings Calendar
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setFilter("all")}
                            className={`text-[10px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-wider transition-all ${filter === "all"
                                ? "bg-purple-500/20 text-purple-300 border-purple-500/30 shadow-sm"
                                : "bg-jiggy-surface text-slate-500 border-jiggy-border hover:text-slate-300"
                                }`}
                        >
                            All ({events.length})
                        </button>
                        <button
                            onClick={() => setFilter("portfolio")}
                            className={`text-[10px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-wider transition-all flex items-center gap-1.5 ${filter === "portfolio"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-sm"
                                : "bg-jiggy-surface text-slate-500 border-jiggy-border hover:text-slate-300"
                                }`}
                        >
                            <Briefcase className="w-3 h-3" />
                            Portfolio
                        </button>
                        <button
                            onClick={() => setFilter("watchlist")}
                            className={`text-[10px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-wider transition-all flex items-center gap-1.5 ${filter === "watchlist"
                                ? "bg-sky-500/20 text-sky-300 border-sky-500/30 shadow-sm"
                                : "bg-jiggy-surface text-slate-500 border-jiggy-border hover:text-slate-300"
                                }`}
                        >
                            <Eye className="w-3 h-3" />
                            Watchlist
                        </button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
                        <p className="text-slate-500 text-sm">
                            Synchronizing earnings calendar...
                        </p>
                    </div>
                ) : weekGroups.length === 0 ? (
                    <div className="py-16 text-center">
                        <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-sm text-slate-500 italic">
                            No upcoming earnings found
                        </p>
                    </div>
                ) : (
                    <div className="max-h-[700px] overflow-y-auto custom-scrollbar">
                        {weekGroups.map((group, gi) => (
                            <div key={gi}>
                                {/* Week Header */}
                                <div
                                    className={`sticky top-0 z-10 px-4 py-2.5 border-b border-jiggy-border backdrop-blur-sm ${group.isThisWeek
                                        ? "bg-emerald-500/10 border-emerald-500/20"
                                        : "bg-jiggy-surface-2"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span
                                            className={`text-xs font-black uppercase tracking-widest ${group.isThisWeek ? "text-emerald-400" : "text-slate-400"
                                                }`}
                                        >
                                            {group.label}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono font-bold">
                                            {group.events.length} report
                                            {group.events.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                </div>

                                {/* Events */}
                                <div className="divide-y divide-jiggy-border/50">
                                    {group.events.map((event, ei) => (
                                        <button
                                            key={`${event.ticker}-${ei}`}
                                            onClick={() => onSelectTicker(event.ticker)}
                                            className={`w-full flex items-center justify-between p-4 hover:bg-slate-800/40 transition-all group text-left ${selectedTicker === event.ticker
                                                ? "bg-emerald-500/5 border-l-4 border-l-emerald-400"
                                                : "border-l-4 border-l-transparent bg-transparent"
                                                }`}
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-terminal-bg flex items-center justify-center shrink-0 border border-slate-700/50 group-hover:border-emerald-500/40 transition-colors shadow-sm">
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
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                                                            {event.ticker}
                                                        </span>
                                                        <span
                                                            className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${event.source === "portfolio"
                                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                                : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                                                }`}
                                                        >
                                                            {event.source}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-mono font-bold">
                                                        {new Date(event.date).toLocaleDateString(undefined, {
                                                            weekday: "short",
                                                            month: "short",
                                                            day: "numeric",
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-[10px] font-mono font-black text-slate-400 bg-jiggy-surface-2 px-2 py-1 rounded-md border border-jiggy-border shadow-sm">
                                                    {getCountdown(event.date)}
                                                </span>
                                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
