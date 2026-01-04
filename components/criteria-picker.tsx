"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Star, 
  X, 
  ChevronRight, 
  Flame, 
  BarChart3, 
  Zap, 
  FileText, 
  Percent, 
  Settings, 
  Activity, 
  Target, 
  TrendingUp, 
  Clock,
  Layout
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CriteriaPickerProps {
  title?: string;
  allCriteria: string[];
  selectedCriteria: string[];
  criteriaCategories: Record<string, string>;
  onClose: () => void;
  onSave: (criteria: string[]) => void;
  showOrder?: boolean;
}

// Icon mapping for categories based on Koyfin/Financial themes
const CATEGORY_ICONS: Record<string, any> = {
  "General Info": Layout,
  "Price Action": TrendingUp,
  "52W Price Action": Clock,
  "Moving Averages": Activity,
  "Earnings Results": BarChart3,
  "Earnings Expectations": Target,
  "Earnings Comps": Zap,
  "Fundamentals": Percent,
  "Forward Estimates": Zap,
  "Forward Growth Estimates": TrendingUp,
  "Foward Growth Estimates": TrendingUp, // Handle typo
  "Forward Multiples": Percent,
  "Historical Financials": FileText,
  "Favorites": Star,
  "Other": Settings,
};

export function CriteriaPicker({
  title = "Modify Screen",
  allCriteria,
  selectedCriteria: initialSelected,
  criteriaCategories = {},
  onClose,
  onSave,
  showOrder = true,
}: CriteriaPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Load favorites
  useEffect(() => {
    const saved = localStorage.getItem('jiggy_criteria_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveFavorites = (newFavs: string[]) => {
    setFavorites(newFavs);
    localStorage.setItem('jiggy_criteria_favorites', JSON.stringify(newFavs));
  };

  // Grouping logic
  const groupedCriteria = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    allCriteria.forEach(c => {
      const cat = criteriaCategories[c] || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(c);
    });
    return grouped;
  }, [allCriteria, criteriaCategories]);

  const categories = useMemo(() => {
    const cats = Object.keys(groupedCriteria).sort();
    return ["Favorites", ...cats];
  }, [groupedCriteria]);

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[1] || categories[0]); // Default to first real category
    }
  }, [categories, selectedCategory]);

  const toggleCriteria = (c: string) => {
    setSelected(prev => 
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  const toggleFavorite = (c: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavs = favorites.includes(c) 
      ? favorites.filter(x => x !== c) 
      : [...favorites, c];
    saveFavorites(newFavs);
  };

  const currentList = useMemo(() => {
    let list = selectedCategory === "Favorites" 
      ? favorites.filter(f => allCriteria.includes(f))
      : groupedCriteria[selectedCategory || ""] || [];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = allCriteria.filter(c => 
        c.toLowerCase().includes(q) || 
        formatName(c).toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedCategory, groupedCriteria, favorites, allCriteria, searchQuery]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[1000px] h-[80vh] bg-[#0f172a] border-slate-800 p-0 flex flex-col overflow-hidden gap-0">
        <DialogHeader className="p-6 border-b border-slate-800 flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-100">{title}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-100">
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Left Sidebar */}
          <div className="w-[280px] border-r border-slate-800 bg-[#0a0f1d] flex flex-col">
            <div className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Search criteria..." 
                  className="pl-9 bg-[#1e293b] border-slate-700 text-sm h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-2 py-2 space-y-1">
                <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">My Screen Criteria</div>
                <button
                  onClick={() => setSelectedCategory("Favorites")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    selectedCategory === "Favorites" ? "bg-blue-600/20 text-blue-400" : "text-slate-400 hover:bg-slate-800/50"
                  )}
                >
                  <Star className={cn("h-4 w-4", selectedCategory === "Favorites" && "fill-current")} />
                  <span>Saved Favorites</span>
                </button>

                <div className="pt-4 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">System Columns</div>
                {categories.filter(cat => cat !== "Favorites").map(cat => {
                  const Icon = CATEGORY_ICONS[cat] || Settings;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setSearchQuery("");
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                        selectedCategory === cat && !searchQuery ? "bg-blue-600/20 text-blue-400" : "text-slate-400 hover:bg-slate-800/50"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{cat}</span>
                      <ChevronRight className="h-3 w-3 ml-auto opacity-50" />
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col bg-[#0f172a]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-tight">
                {searchQuery ? `Search Results (${currentList.length})` : `Available Screen Criteria: ${selectedCategory}`}
              </h3>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2 grid grid-cols-1 gap-1">
                {currentList.map(c => {
                  const isSelected = selected.includes(c);
                  const isFav = favorites.includes(c);
                  return (
                    <div 
                      key={c}
                      onClick={() => toggleCriteria(c)}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer group transition-all",
                        isSelected ? "bg-blue-600/10 border border-blue-600/20" : "hover:bg-slate-800/50 border border-transparent"
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0"
                        onClick={(e) => toggleFavorite(c, e)}
                      >
                        <Star className={cn("h-4 w-4 transition-colors", isFav ? "fill-yellow-400 text-yellow-400" : "text-slate-600 group-hover:text-slate-400")} />
                      </Button>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-200">{formatName(c)}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{criteriaCategories[c]}</div>
                      </div>
                      <Checkbox checked={isSelected} className="border-slate-700 data-[state=checked]:bg-blue-600" />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-slate-800 bg-[#0a0f1d] flex items-center justify-between">
              <div className="text-xs text-slate-500">
                <span className="font-bold text-blue-400">{selected.length}</span> criteria selected
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={onClose} className="text-slate-400">Cancel</Button>
                <Button onClick={() => onSave(selected)} className="bg-blue-600 hover:bg-blue-700 px-8">Apply</Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatName(name: string): string {
  const acronyms = ['EBITDA', 'FCF', 'GP', 'PE', 'P/E', 'EV', 'ROE', 'ROA', 'ROIC', 'EPS', 'DPS', 'CAGR', 'YTD', 'TTM', 'LTM', 'NOPAT', 'WACC', 'DCF', 'NPV', 'IRR'];
  let formatted = name.replace(/_/g, " ").replace(/\s*\/\s*/g, "/");
  formatted = formatted.split(' ').map(word => {
    const upper = word.toUpperCase();
    if (acronyms.includes(upper)) return upper;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
  return formatted.trim();
}
