"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl text-slate-100">Jiggy Capital</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center space-x-6">
          <Link
            href="/"
            className={cn(
              "text-sm font-medium transition-colors hover:text-slate-100",
              pathname === "/"
                ? "text-slate-100"
                : "text-slate-400"
            )}
          >
            Home
          </Link>
          <Link
            href="/analyze"
            className={cn(
              "text-sm font-medium transition-colors hover:text-slate-100",
              pathname === "/analyze"
                ? "text-slate-100"
                : "text-slate-400"
            )}
          >
            Analyze
          </Link>
        </div>
      </div>
    </nav>
  );
}

