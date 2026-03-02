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
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from "@hello-pangea/dnd";
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
  Layout,
  GripVertical,
  Lock
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
      } catch (e) { }
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
    setSelected(prev => {
      const isSelected = prev.includes(c);
      if (isSelected) {
        // Don't allow deselecting the first column if it's ticker/symbol
        const isTicker = c.toLowerCase() === 'ticker' || c.toLowerCase() === 'symbol';
        if (isTicker) return prev;
        return prev.filter(x => x !== c);
      }
      return [...prev, c];
    });
  };

  const removeCriteria = (c: string) => {
    const isTicker = c.toLowerCase() === 'ticker' || c.toLowerCase() === 'symbol';
    if (isTicker) return;
    setSelected(prev => prev.filter(x => x !== c));
  };

  const toggleFavorite = (c: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavs = favorites.includes(c)
      ? favorites.filter(x => x !== c)
      : [...favorites, c];
    saveFavorites(newFavs);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(selected);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Ensure ticker stays at the top if it was there
    const tickerIndex = items.findIndex(i => i.toLowerCase() === 'ticker' || i.toLowerCase() === 'symbol');
    if (tickerIndex > 0) {
      const [ticker] = items.splice(tickerIndex, 1);
      items.unshift(ticker);
    }

    setSelected(items);
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
      <DialogContent className="max-w-[1100px] w-[95vw] h-[85vh] bg-jiggy-surface border-jiggy-border p-0 flex flex-col overflow-hidden gap-0 rounded-2xl">
        <DialogHeader className="p-6 border-b border-jiggy-border shrink-0 flex flex-row items-center justify-between bg-jiggy-surface-2">
          <DialogTitle className="text-xl font-black italic tracking-tighter text-slate-100">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Left Sidebar - Categories */}
          <div className="w-[240px] border-r border-jiggy-border bg-jiggy-surface-2 flex flex-col">
            <div className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                <Input
                  placeholder="Search criteria..."
                  className="pl-9 bg-terminal-bg border-jiggy-border text-sm h-10 rounded-xl focus:border-emerald-500/50 transition-all font-bold"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-2 py-2 space-y-1">
                <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">My Screen Criteria</div>
                <button
                  onClick={() => {
                    setSelectedCategory("Favorites");
                    setSearchQuery("");
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors font-bold",
                    selectedCategory === "Favorites" && !searchQuery ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:bg-slate-800/50"
                  )}
                >
                  <Star className={cn("h-4 w-4", selectedCategory === "Favorites" && "fill-emerald-400 text-emerald-400")} />
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
                        "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors text-left font-bold",
                        selectedCategory === cat && !searchQuery ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:bg-slate-800/50"
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

          {/* Middle Content - Available Criteria */}
          <div className="flex-1 flex flex-col bg-jiggy-surface border-r border-jiggy-border">
            <div className="px-6 py-4 border-b border-jiggy-border flex items-center justify-between bg-jiggy-surface-2/50">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {searchQuery ? `Search Results (${currentList.length})` : `Available Columns: ${selectedCategory}`}
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
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group transition-all",
                        isSelected ? "bg-emerald-500/10 border border-emerald-500/20" : "hover:bg-slate-800/50 border border-transparent"
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 p-0 hover:bg-slate-700/50 rounded-lg"
                        onClick={(e) => toggleFavorite(c, e)}
                      >
                        <Star className={cn("h-3.5 w-3.5 transition-colors", isFav ? "fill-yellow-400 text-yellow-400" : "text-slate-600 group-hover:text-slate-400")} />
                      </Button>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-slate-200 truncate">{formatName(c)}</div>
                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{criteriaCategories[c]}</div>
                      </div>
                      <Checkbox
                        checked={isSelected}
                        className="h-4 w-4 border-jiggy-border data-[state=checked]:bg-emerald-500 data-[state=checked]:text-slate-950 rounded"
                        onCheckedChange={() => toggleCriteria(c)}
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Right Sidebar - Selected Columns */}
          <div className="w-[300px] border-l border-jiggy-border bg-jiggy-surface-2 flex flex-col">
            <div className="px-4 py-4 border-b border-jiggy-border flex items-center justify-between bg-jiggy-surface-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Columns</h3>
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg">
                {selected.length}
              </span>
            </div>

            <ScrollArea className="flex-1">
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="selected-columns">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="p-2 space-y-1"
                    >
                      {selected.map((c, index) => {
                        const isTicker = c.toLowerCase() === 'ticker' || c.toLowerCase() === 'symbol';
                        return (
                          <Draggable key={c} draggableId={c} index={index} isDragDisabled={isTicker}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm bg-jiggy-surface/60 border border-jiggy-border transition-all group font-bold",
                                  snapshot.isDragging && "bg-slate-700 border-emerald-500/50 shadow-xl z-50",
                                  isTicker && "bg-jiggy-surface-2 opacity-80"
                                )}
                              >
                                <div {...(isTicker ? {} : provided.dragHandleProps)} className={cn("shrink-0", isTicker ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing")}>
                                  {isTicker ? (
                                    <Lock className="h-3 w-3 text-slate-600" />
                                  ) : (
                                    <GripVertical className="h-4 w-4 text-slate-600 group-hover:text-slate-400" />
                                  )}
                                </div>
                                <span className="flex-1 text-[13px] text-slate-200 truncate">{formatName(c)}</span>
                                {!isTicker && (
                                  <button
                                    onClick={() => removeCriteria(c)}
                                    className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-rose-400 transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </ScrollArea>

            <div className="p-4 border-t border-jiggy-border bg-jiggy-surface-2 flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setSelected(initialSelected)}
                  className="flex-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-10 rounded-xl hover:text-rose-400"
                >
                  Reset
                </Button>
                <Button
                  onClick={() => onSave(selected)}
                  className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black h-10 uppercase tracking-widest text-[10px] rounded-xl"
                >
                  Apply Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatName(name: string): string {
  if (!name) return "";
  const acronyms = ['EBITDA', 'FCF', 'GP', 'PE', 'P/E', 'EV', 'ROE', 'ROA', 'ROIC', 'EPS', 'DPS', 'CAGR', 'YTD', 'TTM', 'LTM', 'NOPAT', 'WACC', 'DCF', 'NPV', 'IRR'];
  let formatted = name.replace(/_/g, " ").replace(/\s*\/\s*/g, "/");
  formatted = formatted.split(' ').map(word => {
    const upper = word.toUpperCase();
    if (acronyms.includes(upper)) return upper;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
  return formatted.trim();
}
