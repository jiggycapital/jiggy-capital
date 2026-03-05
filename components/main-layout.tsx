"use client";

import { useSidebar } from "./sidebar-provider";
import { Sidebar } from "./sidebar";
import { MobileHeader } from "./mobile-header";
import { MobileNavBar } from "./mobile-nav-bar";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { PanelLeftOpen } from "lucide-react";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed, isHidden, setIsHidden } = useSidebar();

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar — hidden on mobile */}
      <div className="hidden md:block">
        {!isHidden && <Sidebar />}
      </div>

      {/* Floating button to show sidebar when hidden (Desktop only) */}
      {isHidden && (
        <div className="fixed top-4 left-4 z-[100] group hidden md:block">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsHidden(false)}
            className="bg-jiggy-surface backdrop-blur border border-jiggy-border text-slate-400 hover:text-jiggy-gold hover:bg-jiggy-surface-2 shadow-2xl transition-all"
            title="Show Sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Mobile Header — top logo bar */}
      <MobileHeader />

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 min-h-screen transition-all duration-300 ease-in-out relative",
          "animate-fade-in-up",
          // Mobile: safe-area-aware padding for header + tab bar
          "pt-[calc(44px+env(safe-area-inset-top,0px))] pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]",
          "md:pt-0 md:pb-0",
          // Desktop: sidebar margin
          isHidden ? "md:ml-0" : (isCollapsed ? "md:ml-20" : "md:ml-64"),
          "ml-0"
        )}
      >
        {children}
      </main>

      {/* Mobile Bottom Nav — tab bar */}
      <MobileNavBar />
    </div>
  );
}
