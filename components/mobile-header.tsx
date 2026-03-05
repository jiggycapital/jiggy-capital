"use client";

import Link from "next/link";

export function MobileHeader() {
    return (
        <header className="fixed top-0 left-0 right-0 z-[88] md:hidden">
            {/* Safe area spacer - pushes content below the notch */}
            <div className="bg-[#0B0F19]" style={{ paddingTop: "env(safe-area-inset-top)" }} />
            <div className="bg-[#0B0F19]/90 backdrop-blur-2xl border-b border-jiggy-border/50 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-center h-11 px-4">
                    <Link href="/" className="flex items-center gap-2 group">
                        <img
                            src="/jiggy-icon.png"
                            alt="Jiggy Capital"
                            className="w-6 h-6 object-contain drop-shadow-sm"
                        />
                        <span className="text-sm font-extrabold text-slate-100 tracking-tight group-hover:text-jiggy-gold transition-colors">
                            Jiggy Capital
                        </span>
                    </Link>
                </div>
            </div>
        </header>
    );
}
