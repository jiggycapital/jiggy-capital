"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("relative group cursor-pointer", className)}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-700 ease-in-out group-hover:rotate-12 group-hover:scale-110"
      >
        {/* Background Ring */}
        <circle 
          cx="50" 
          cy="50" 
          r="48" 
          stroke="#3b82f6" 
          strokeWidth="1" 
          opacity="0.3" 
          className="transition-opacity duration-500 group-hover:opacity-50"
        />
        
        {/* Primary Connections */}
        <g className="transition-all duration-700 ease-in-out group-hover:translate-x-1 group-hover:-translate-y-1">
          <path d="M50 50 L20 20" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M50 50 L85 35" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M50 50 L40 85" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        
        {/* Secondary Connections */}
        <g className="transition-all duration-1000 ease-in-out group-hover:-translate-x-1 group-hover:translate-y-1">
          <path d="M20 20 L15 55" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
          <path d="M15 55 L40 85" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
          <path d="M40 85 L75 75" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
          <path d="M75 75 L85 35" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
          <path d="M85 35 L20 20" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
          <path d="M15 55 L85 35" stroke="#3b82f6" strokeWidth="1" opacity="0.4" strokeDasharray="2 2" />
        </g>

        {/* Nodes */}
        <circle cx="50" cy="50" r="6" fill="#3b82f6" className="transition-all duration-500 group-hover:fill-blue-400 group-hover:r-7" />
        
        <g className="transition-all duration-700 group-hover:translate-x-1 group-hover:-translate-y-1">
          <circle cx="20" cy="20" r="4.5" fill="#60a5fa" />
          <circle cx="85" cy="35" r="4.5" fill="#60a5fa" />
          <circle cx="40" cy="85" r="4.5" fill="#60a5fa" />
        </g>

        <g className="transition-all duration-1000 group-hover:-translate-x-1 group-hover:translate-y-1">
          <circle cx="15" cy="55" r="3" fill="#93c5fd" />
          <circle cx="75" cy="75" r="3" fill="#93c5fd" />
        </g>
      </svg>
      
      {/* Subtle Glow Effect on Hover */}
      <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
    </div>
  );
}
