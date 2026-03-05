"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Table2,
    CandlestickChart,
    Mic,
    MoreHorizontal,
    BarChart3,
    Filter,
    Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const PRIMARY_TABS = [
    { title: "Home", href: "/", icon: LayoutDashboard },
    { title: "Table", href: "/table", icon: Table2 },
    { title: "Trading", href: "/trading", icon: CandlestickChart },
    { title: "Earnings", href: "/earnings", icon: Mic },
];

const MORE_ITEMS = [
    { title: "Charts", href: "/chart", icon: BarChart3 },
    { title: "Screener", href: "/screener", icon: Filter },
    { title: "Research", href: "/deep-research", icon: Database },
];

export function MobileNavBar() {
    const pathname = usePathname();
    const [showMore, setShowMore] = useState(false);

    const isMoreActive = MORE_ITEMS.some((item) => pathname === item.href);

    return (
        <>
            {/* More Drawer */}
            {showMore && (
                <>
                    <div
                        className="fixed inset-0 z-[89] bg-black/50 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
                        onClick={() => setShowMore(false)}
                    />
                    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[90] md:hidden animate-slide-up-spring">
                        <div className="bg-[#0B0F19]/95 backdrop-blur-2xl border border-jiggy-border rounded-2xl shadow-2xl overflow-hidden">
                            {MORE_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setShowMore(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-5 py-3.5 transition-all active:scale-[0.98] active:opacity-80",
                                            isActive
                                                ? "bg-jiggy-gold/10 text-jiggy-gold"
                                                : "text-slate-400 active:bg-jiggy-surface-2"
                                        )}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="text-sm font-bold">{item.title}</span>
                                        {isActive && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-jiggy-gold" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Bottom Tab Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-[88] md:hidden">
                <div className="bg-[#0B0F19]/90 backdrop-blur-2xl border-t border-jiggy-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
                    <div className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
                        {PRIMARY_TABS.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[60px] transition-all relative",
                                        "active:scale-90 active:opacity-80",
                                        isActive
                                            ? "text-jiggy-gold"
                                            : "text-slate-500"
                                    )}
                                >
                                    {/* Animated active indicator */}
                                    <div className={cn(
                                        "absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-jiggy-gold transition-all duration-300",
                                        isActive ? "w-5 opacity-100" : "w-0 opacity-0"
                                    )} />
                                    <Icon
                                        className={cn(
                                            "w-5 h-5 transition-transform duration-200",
                                            isActive && "scale-110"
                                        )}
                                    />
                                    <span
                                        className={cn(
                                            "text-[10px] font-bold tracking-wide",
                                            isActive ? "text-jiggy-gold" : "text-slate-500"
                                        )}
                                    >
                                        {item.title}
                                    </span>
                                </Link>
                            );
                        })}

                        {/* More Button */}
                        <button
                            onClick={() => setShowMore(!showMore)}
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[60px] transition-all relative",
                                "active:scale-90 active:opacity-80",
                                isMoreActive || showMore
                                    ? "text-jiggy-gold"
                                    : "text-slate-500"
                            )}
                        >
                            {/* Animated active indicator */}
                            <div className={cn(
                                "absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-jiggy-gold transition-all duration-300",
                                (isMoreActive || showMore) ? "w-5 opacity-100" : "w-0 opacity-0"
                            )} />
                            <MoreHorizontal
                                className={cn(
                                    "w-5 h-5 transition-transform duration-200",
                                    (isMoreActive || showMore) && "scale-110"
                                )}
                            />
                            <span
                                className={cn(
                                    "text-[10px] font-bold tracking-wide",
                                    isMoreActive || showMore ? "text-jiggy-gold" : "text-slate-500"
                                )}
                            >
                                More
                            </span>
                        </button>
                    </div>
                </div>
            </nav>
        </>
    );
}
