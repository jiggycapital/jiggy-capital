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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

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
        { title: "Screener", href: "/screener", icon: Filter },
      ],
    },
    {
      label: "Research",
      items: [
        { title: "Charts", href: "/chart", icon: BarChart3 },
        { title: "Earnings", href: "/earnings", icon: Mic },
        { title: "Deep Research", href: "/deep-research", icon: Database },
      ],
    },
    {
      label: "Data",
      items: [
        { title: "Table", href: "/table", icon: Table2 },
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
      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-[#151536] border border-[#2A2A61] text-slate-100 hover:bg-[#222252]"
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen border-r border-[#2A2A61] bg-[#0F0F26] transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-56",
          "md:translate-x-0",
          isMobileOpen ? "translate-x-0 w-56" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col relative">
          {/* Collapse Toggle Button (Desktop only) */}
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-20 hidden md:flex h-6 w-6 items-center justify-center rounded-full border border-[#2A2A61] bg-[#151536] text-slate-400 hover:text-amber-400 shadow-xl z-[60] transition-colors"
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>

          {/* Logo */}
          <div className={cn(
            "flex h-14 items-center border-b border-[#2A2A61] px-5",
            isCollapsed ? "justify-center px-0" : "justify-between"
          )}>
            <Link href="/" className="flex items-center gap-2.5 group/logo min-w-0 overflow-hidden">
              <Logo className="h-7 w-7 shrink-0" />
              {!isCollapsed && (
                <h1 className="text-base font-extrabold text-slate-100 tracking-tight group-hover/logo:text-amber-400 transition-colors truncate">
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
                    <span className="text-[9px] font-extrabold text-slate-600 uppercase tracking-[0.15em]">
                      {section.label}
                    </span>
                  </div>
                )}
                {isCollapsed && si > 0 && (
                  <div className="mx-3 mb-2 border-t border-[#2A2A61]" />
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
                          "flex items-center gap-2.5 rounded-lg transition-all duration-150",
                          isCollapsed ? "justify-center p-2.5" : "px-3 py-2",
                          isActive
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "text-slate-400 hover:bg-[#151536] hover:text-slate-200 border border-transparent"
                        )}
                      >
                        <Icon className={cn(
                          "h-4 w-4 flex-shrink-0 transition-colors",
                          isActive ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"
                        )} />
                        {!isCollapsed && (
                          <span className={cn(
                            "text-[13px] font-semibold",
                            isActive ? "text-amber-400" : ""
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
          <div className="border-t border-[#2A2A61] p-3">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full flex items-center gap-2.5 text-slate-500 hover:text-slate-300 hover:bg-[#151536]",
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
