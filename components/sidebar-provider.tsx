"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isHidden: boolean;
  setIsHidden: (hidden: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const collapsed = localStorage.getItem("sidebar-collapsed");
    if (collapsed === "true") setIsCollapsed(true);
    
    const hidden = localStorage.getItem("sidebar-hidden");
    if (hidden === "true") setIsHidden(true);
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  const handleSetIsHidden = (hidden: boolean) => {
    setIsHidden(hidden);
    localStorage.setItem("sidebar-hidden", String(hidden));
  };

  return (
    <SidebarContext.Provider value={{ 
      isCollapsed, 
      toggleSidebar, 
      isHidden, 
      setIsHidden: handleSetIsHidden,
      isMobileOpen, 
      setIsMobileOpen 
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
