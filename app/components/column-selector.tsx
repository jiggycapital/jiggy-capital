"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Star, GripVertical, X, StarIcon, Flame, BarChart3, Info, Zap, FileText, User, Percent, Settings, Briefcase, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColumnSelectorProps {
  allColumns: string[];
  visibleColumns: string[];
  columnOrder: string[];
  columnCategories?: Record<string, string>;
  onClose: () => void;
  onSave: (columns: string[]) => void;
}

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, any> = {
  "Earnings Comps": BarChart3,
  "Historical Financials": FileText,
  "Forward Growth Estimates": Zap,
  "Valuation": Percent,
  "Other": Settings,
};

// Default category icons
const DEFAULT_CATEGORY_ICON = Settings;

export function ColumnSelector({
  allColumns,
  visibleColumns,
  columnOrder,
  columnCategories = {},
  onClose,
  onSave,
}: ColumnSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>(visibleColumns);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('jiggy-column-favorites');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: string[]) => {
    try {
      localStorage.setItem('jiggy-column-favorites', JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (err) {
      console.error('Failed to save favorites:', err);
    }
  };

  // Group columns by category
  const columnsByCategory = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    const uncategorized: string[] = [];

    allColumns.forEach(col => {
      const category = columnCategories[col] || "Other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(col);
    });

    // Sort categories: Favorites first, then alphabetically
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      if (a === "Favorites") return -1;
      if (b === "Favorites") return 1;
      return a.localeCompare(b);
    });

    // Create a new object with sorted categories
    const sorted: Record<string, string[]> = {};
    sortedCategories.forEach(cat => {
      sorted[cat] = grouped[cat];
    });

    return sorted;
  }, [allColumns, columnCategories]);

  // Get all categories
  const categories = useMemo(() => {
    const cats = Object.keys(columnsByCategory);
    // Add "Favorites" category if there are favorites
    if (favorites.length > 0 && !cats.includes("Favorites")) {
      return ["Favorites", ...cats];
    }
    return cats;
  }, [columnsByCategory, favorites]);

  // Get columns for selected category or favorites
  const categoryColumns = useMemo(() => {
    if (selectedCategory === "Favorites") {
      return favorites.filter(fav => allColumns.includes(fav));
    }
    if (selectedCategory && columnsByCategory[selectedCategory]) {
      return columnsByCategory[selectedCategory];
    }
    // If no category selected, show all columns
    return allColumns;
  }, [selectedCategory, columnsByCategory, favorites, allColumns]);

  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    const cols = categoryColumns;
    if (!searchQuery) return cols;
    const query = searchQuery.toLowerCase();
    return cols.filter(col =>
      col.toLowerCase().includes(query) ||
      formatColumnName(col).toLowerCase().includes(query)
    );
  }, [categoryColumns, searchQuery]);

  // Set initial category to first available
  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      // Prefer "Favorites" if available, otherwise first category
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  const toggleColumn = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const toggleFavorite = (column: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const newFavorites = favorites.includes(column)
      ? favorites.filter(c => c !== column)
      : [...favorites, column];
    saveFavorites(newFavorites);
  };

  const handleDragStart = (column: string) => {
    setDraggedColumn(column);
  };

  const handleDragOver = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumn) return;

    const newOrder = [...selectedColumns];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumn);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedColumn);
      setSelectedColumns(newOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  const handleSave = () => {
    onSave(selectedColumns);
  };

  const getCategoryIcon = (category: string) => {
    if (category === "Favorites") return StarIcon;
    return CATEGORY_ICONS[category] || DEFAULT_CATEGORY_ICON;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[1400px] h-[85vh] max-h-[900px] bg-slate-900 border-slate-800 text-slate-100 p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-800 flex-shrink-0">
          <div>
            <DialogTitle className="text-slate-100 text-xl">Column Selection</DialogTitle>
            <DialogDescription className="text-slate-400 mt-1">
              Select and reorder columns to display in the table
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-slate-800 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search available columns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Left Sidebar - Categories */}
            <div className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-slate-800 flex-shrink-0">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Categories
                </h3>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="py-2">
                  {categories.map((category) => {
                    const Icon = getCategoryIcon(category);
                    const isSelected = selectedCategory === category;
                    const columnCount = category === "Favorites" 
                      ? favorites.filter(f => allColumns.includes(f)).length
                      : columnsByCategory[category]?.length || 0;

                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={cn(
                          "w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-slate-800 transition-colors",
                          isSelected && "bg-slate-800 border-l-2 border-blue-500"
                        )}
                      >
                        <Icon className={cn(
                          "h-4 w-4",
                          category === "Favorites" && favorites.length > 0
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-slate-400"
                        )} />
                        <span className={cn(
                          "text-sm flex-1",
                          isSelected ? "text-slate-100 font-medium" : "text-slate-300"
                        )}>
                          {category}
                        </span>
                        {columnCount > 0 && (
                          <span className="text-xs text-slate-500">
                            {columnCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Center Panel - Columns for Selected Category */}
            <div className="flex-1 border-r border-slate-800 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/50 flex-shrink-0">
                <h3 className="text-sm font-semibold text-slate-100">
                  {selectedCategory === "Favorites" ? "My Saved Favorites" : selectedCategory || "All Columns"}
                </h3>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-1">
                  {filteredColumns.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                      {selectedCategory === "Favorites" 
                        ? "No favorite columns yet. Click the star icon next to any column to add it to favorites."
                        : "No columns found in this category."}
                    </div>
                  ) : (
                    filteredColumns.map((column) => {
                      const isSelected = selectedColumns.includes(column);
                      const isFavorite = favorites.includes(column);
                      return (
                        <div
                          key={column}
                          className={cn(
                            "flex items-center gap-3 p-2.5 rounded hover:bg-slate-800 cursor-pointer transition-colors",
                            isSelected && "bg-slate-800"
                          )}
                          onClick={() => toggleColumn(column)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleColumn(column)}
                            className="border-slate-700"
                          />
                          <span className="flex-1 text-sm text-slate-300">
                            {formatColumnName(column)}
                          </span>
                          {isFavorite && (
                            <Flame className="h-3.5 w-3.5 text-orange-500" />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-slate-700"
                            onClick={(e) => toggleFavorite(column, e)}
                          >
                            <Star
                              className={cn(
                                "h-4 w-4",
                                isFavorite ? "fill-yellow-400 text-yellow-400" : "text-slate-500"
                              )}
                            />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right Panel - Selected Columns */}
            <div className="w-80 flex flex-col bg-slate-950 min-h-0">
              <div className="px-4 py-3 border-b border-slate-800 flex-shrink-0">
                <h3 className="text-sm font-semibold text-slate-100">
                  Selected Columns ({selectedColumns.length})
                </h3>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-1">
                  {selectedColumns.length === 0 ? (
                    <div className="text-center text-slate-500 py-8 text-sm">
                      No columns selected. Select columns from the left panel.
                    </div>
                  ) : (
                    selectedColumns.map((column, index) => {
                      const isLocked = index === 0 && (column.toLowerCase() === 'ticker' || column.toLowerCase() === 'symbol');
                      return (
                        <div
                          key={column}
                          draggable={!isLocked}
                          onDragStart={() => !isLocked && handleDragStart(column)}
                          onDragOver={(e) => !isLocked && handleDragOver(e, column)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "flex items-center gap-2 p-2.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors",
                            isLocked ? "cursor-default" : "cursor-move"
                          )}
                        >
                          {isLocked ? (
                            <Lock className="h-4 w-4 text-slate-500" />
                          ) : (
                            <GripVertical className="h-4 w-4 text-slate-500" />
                          )}
                          <span className="flex-1 text-sm text-slate-300">
                            {formatColumnName(column)}
                          </span>
                          {!isLocked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-slate-600"
                              onClick={() => toggleColumn(column)}
                            >
                              <X className="h-4 w-4 text-slate-500" />
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Footer with Tip and Actions */}
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="text-yellow-400">💡</span>
              <span>Save your favorite columns by clicking the star next to the label.</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatColumnName(name: string): string {
  const acronyms = ['EBITDA', 'FCF', 'GP', 'PE', 'P/E', 'EV', 'ROE', 'ROA', 'ROIC', 'EPS', 'DPS', 'CAGR', 'YTD', 'TTM', 'LTM', 'NOPAT', 'WACC', 'DCF', 'NPV', 'IRR'];
  
  let formatted = name.replace(/_/g, " "); // Replace underscores with spaces
  
  // Preserve slashes (e.g., P/E, P/FCF)
  formatted = formatted.replace(/\s*\/\s*/g, "/");

  // Capitalize first letter of each word, but handle acronyms
  formatted = formatted.split(' ').map(word => {
    const upperWord = word.toUpperCase();
    if (acronyms.includes(upperWord) || acronyms.includes(word)) {
      return upperWord;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');

  // Handle cases like "2026e P/E"
  formatted = formatted.replace(/(\d{4}e?)\s*([A-Z\/]+)/g, '$1 $2');

  return formatted.trim();
}
