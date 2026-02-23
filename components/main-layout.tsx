"use client";

import { useSidebar } from "./sidebar-provider";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { PanelLeftOpen } from "lucide-react";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed, isHidden, setIsHidden } = useSidebar();

  return (
    <div className="flex min-h-screen">
      {!isHidden && <Sidebar />}

      {/* Floating button to show sidebar when hidden */}
      {isHidden && (
        <div className="fixed top-4 left-4 z-[100] group">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsHidden(false)}
            className="bg-[#111D33] backdrop-blur border border-[#1E2D47] text-slate-400 hover:text-amber-400 hover:bg-[#162340] shadow-2xl transition-all"
            title="Show Sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </Button>
        </div>
      )}

      <main
        className={cn(
          "flex-1 min-h-screen transition-all duration-300 ease-in-out relative",
          isHidden ? "ml-0" : (isCollapsed ? "md:ml-20" : "md:ml-64"),
          "ml-0" // No margin on mobile
        )}
      >
        {children}
      </main>
    </div>
  );
}
