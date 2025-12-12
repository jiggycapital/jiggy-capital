"use client";

import { useState, useMemo } from "react";
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
import { Search, Star, GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColumnSelectorProps {
  allColumns: string[];
  visibleColumns: string[];
  columnOrder: string[];
  onClose: () => void;
  onSave: (columns: string[]) => void;
}

export function ColumnSelector({
  allColumns,
  visibleColumns,
  columnOrder,
  onClose,
  onSave,
}: ColumnSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>(visibleColumns);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    if (!searchQuery) return allColumns;
    const query = searchQuery.toLowerCase();
    return allColumns.filter(col =>
      col.toLowerCase().includes(query) ||
      formatColumnName(col).toLowerCase().includes(query)
    );
  }, [allColumns, searchQuery]);

  const toggleColumn = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const toggleFavorite = (column: string) => {
    setFavorites(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
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

  const handleSelectAll = () => {
    setSelectedColumns([...allColumns]);
  };

  const handleDeselectAll = () => {
    setSelectedColumns([]);
  };

  const handleSave = () => {
    onSave(selectedColumns);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Column Selection</DialogTitle>
          <DialogDescription className="text-slate-400">
            Select and reorder columns to display in the table. Drag columns to reorder.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search available columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>

          <div className="flex flex-1 gap-4 overflow-hidden">
            {/* Available Columns */}
            <div className="flex-1 border border-slate-800 rounded-lg overflow-hidden">
              <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-100">Available Columns</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-slate-400 hover:text-slate-100 h-7"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAll}
                      className="text-slate-400 hover:text-slate-100 h-7"
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>
              </div>
              <ScrollArea className="h-[calc(90vh-300px)]">
                <div className="p-2 space-y-1">
                  {filteredColumns.map((column) => {
                    const isSelected = selectedColumns.includes(column);
                    const isFavorite = favorites.includes(column);
                    return (
                      <div
                        key={column}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded hover:bg-slate-800 cursor-pointer",
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(column);
                          }}
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
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Selected Columns (Reorderable) */}
            <div className="flex-1 border border-slate-800 rounded-lg overflow-hidden">
              <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
                <h3 className="font-semibold text-slate-100">
                  Selected Columns ({selectedColumns.length})
                </h3>
              </div>
              <ScrollArea className="h-[calc(90vh-300px)]">
                <div className="p-2 space-y-1">
                  {selectedColumns.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                      No columns selected. Select columns from the left panel.
                    </div>
                  ) : (
                    selectedColumns.map((column, index) => (
                      <div
                        key={column}
                        draggable
                        onDragStart={() => handleDragStart(column)}
                        onDragOver={(e) => handleDragOver(e, column)}
                        onDragEnd={handleDragEnd}
                        className="flex items-center gap-2 p-2 rounded bg-slate-800 hover:bg-slate-700 cursor-move"
                      >
                        <GripVertical className="h-4 w-4 text-slate-500" />
                        <span className="flex-1 text-sm text-slate-300">
                          {formatColumnName(column)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleColumn(column)}
                        >
                          <X className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-slate-800 border-slate-700 text-slate-100"
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
      </DialogContent>
    </Dialog>
  );
}

function formatColumnName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .trim();
}

