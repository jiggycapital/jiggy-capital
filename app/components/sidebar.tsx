"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Table2, BarChart3, TrendingUp, Database } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
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

  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-slate-800 bg-slate-950">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-slate-800 px-6">
          <h1 className="text-xl font-bold text-slate-100">Jiggy Capital</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-800 text-slate-100"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

