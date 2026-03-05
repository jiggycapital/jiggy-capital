"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-provider";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Table2,
  BarChart3,
  Database,
  Menu,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Mic,
  Eye,
  Newspaper,
  CandlestickChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavSection {
  label: string;
  items: {
    title: string;
    href: string;
    icon: any;
  }[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar, isHidden, setIsHidden, isMobileOpen, setIsMobileOpen } = useSidebar();

  const navSections: NavSection[] = [
    {
      label: "Portfolio",
      items: [
        { title: "Dashboard", href: "/", icon: LayoutDashboard },
        { title: "Table", href: "/table", icon: Table2 },
        { title: "Earnings", href: "/earnings", icon: Mic },
      ],
    },
    {
      label: "Research",
      items: [
        { title: "Trading", href: "/trading", icon: CandlestickChart },
        { title: "Charts", href: "/chart", icon: BarChart3 },
        { title: "Screener", href: "/screener", icon: Filter },
        { title: "Deep Research", href: "/deep-research", icon: Database },
      ],
    },
  ];

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen border-r border-jiggy-tan/50 bg-jiggy-surface/80 backdrop-blur-2xl transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-56",
          "md:translate-x-0",
          isMobileOpen ? "translate-x-0 w-56" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col relative">
          {/* Collapse Toggle Button (Desktop only) */}
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-20 hidden md:flex h-6 w-6 items-center justify-center rounded-full border border-jiggy-tan/50 bg-jiggy-surface text-slate-400 hover:text-jiggy-gold shadow-xl z-[60] transition-colors"
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>

          {/* Logo */}
          <div className={cn(
            "flex h-14 items-center border-b border-jiggy-tan/50 px-5",
            isCollapsed ? "justify-center px-0" : "justify-between"
          )}>
            <Link href="/" className="flex items-center gap-2.5 group/logo min-w-0 overflow-hidden logo-hover">
              <img src="/jiggy-icon.png" alt="Jiggy Capital Logo" className="h-6 w-auto shrink-0 drop-shadow-sm" />
              {!isCollapsed && (
                <h1 className="text-base font-extrabold text-slate-100 tracking-tight group-hover/logo:text-jiggy-gold transition-colors truncate">
                  Jiggy Capital
                </h1>
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation — Grouped Sections */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
            {navSections.map((section, si) => (
              <div key={section.label} className={si > 0 ? "mt-5" : ""}>
                {/* Section Label */}
                {!isCollapsed && (
                  <div className="px-3 mb-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      {section.label}
                    </span>
                  </div>
                )}
                {isCollapsed && si > 0 && (
                  <div className="mx-3 mb-2 border-t border-jiggy-tan/50" />
                )}

                {/* Section Items */}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={isCollapsed ? item.title : ""}
                        className={cn(
                          "flex items-center gap-3 rounded-xl transition-all duration-200",
                          isCollapsed ? "justify-center p-3" : "px-3 py-2.5",
                          isActive
                            ? "bg-jiggy-gold/20 text-jiggy-gold border border-jiggy-gold/30"
                            : "text-slate-300 hover:bg-jiggy-surface-2 hover:text-slate-100 border border-transparent"
                        )}
                      >
                        <Icon className={cn(
                          "h-5 w-5 flex-shrink-0 transition-colors",
                          isActive ? "text-jiggy-gold" : "text-slate-400 group-hover:text-slate-200"
                        )} />
                        {!isCollapsed && (
                          <span className={cn(
                            "text-sm font-bold",
                            isActive ? "text-jiggy-gold" : ""
                          )}>
                            {item.title}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="border-t border-jiggy-tan/50 p-4">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full flex items-center gap-3 text-slate-400 hover:text-slate-200 hover:bg-jiggy-surface-2 rounded-xl py-5",
                isCollapsed ? "justify-center" : "justify-start px-3"
              )}
              onClick={() => setIsHidden(true)}
              title="Hide Sidebar"
            >
              <EyeOff className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="text-xs font-medium">Hide Sidebar</span>}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
