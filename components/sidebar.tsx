"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-provider";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Table2, BarChart3, TrendingUp, Database, Menu, X, Filter, ChevronLeft, ChevronRight, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar, isHidden, setIsHidden, isMobileOpen, setIsMobileOpen } = useSidebar();

  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Screener",
      href: "/screener",
      icon: Filter,
    },
    {
      title: "Table",
      href: "/table",
      icon: Table2,
    },
    {
      title: "Chart",
      href: "/chart",
      icon: BarChart3,
    },
    {
      title: "DR Table",
      href: "/dr-table",
      icon: Database,
    },
    {
      title: "DR Chart",
      href: "/dr-chart",
      icon: TrendingUp,
    },
  ];

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

  // Prevent body scroll when mobile menu is open
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
          className="bg-slate-900 border border-slate-700 text-slate-100 hover:bg-slate-800"
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen border-r border-slate-800 bg-slate-950 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64",
          "md:translate-x-0",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col relative">
          {/* Collapse Toggle Button (Desktop only) */}
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-20 hidden md:flex h-6 w-6 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-100 shadow-xl z-[60]"
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>

          {/* Logo */}
          <div className={cn(
            "flex h-14 items-center border-b border-slate-800 px-6",
            isCollapsed ? "justify-center px-0" : "justify-between"
          )}>
            <Link href="/" className="flex items-center gap-3 group/logo min-w-0 overflow-hidden">
              <Logo className="h-8 w-8 shrink-0" />
              {!isCollapsed && (
                <h1 className="text-xl font-bold text-slate-100 tracking-tight group-hover/logo:text-blue-400 transition-colors truncate">
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

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.title : ""}
                  className={cn(
                    "flex items-center gap-3 rounded-lg transition-colors",
                    isCollapsed ? "justify-center p-2" : "px-3 py-2.5",
                    isActive
                      ? "bg-slate-800 text-slate-100 shadow-lg shadow-blue-500/5"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  )}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-blue-400")} />
                  {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="border-t border-slate-800 p-3 space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full flex items-center gap-3 text-slate-400 hover:text-slate-100 hover:bg-slate-900",
                isCollapsed ? "justify-center" : "justify-start px-3"
              )}
              onClick={() => setIsHidden(true)}
              title="Hide Sidebar"
            >
              <EyeOff className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span className="text-xs font-medium">Hide Sidebar</span>}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

