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
    GripVertical,
    Building2,
    Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompanyLogos } from "@/hooks/use-company-logos";

// Helper to normalize company names for robust ticker matching
function normalizeName(name: string): string {
    if (!name) return "";
    return name.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/corp$|inc$|ltd$|company$|co$/g, '');
}

interface CompanyPickerProps {
    title?: string;
    allCompanies: string[]; // List of company names
    nameToTickerMap: Record<string, string>; // Map of company name to ticker
    initialLogos?: Record<string, string>; // Pre-fetched transparent logos from Google Sheet
    selectedCompanies: string[];
    singleSelection?: boolean;
    onClose: () => void;
    onSave: (companies: string[]) => void;
}

export function CompanyPicker({
    title = "Select Companies",
    allCompanies,
    nameToTickerMap,
    initialLogos = {},
    selectedCompanies: initialSelected,
    singleSelection = false,
    onClose,
    onSave,
}: CompanyPickerProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selected, setSelected] = useState<string[]>(initialSelected);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("All Companies");

    // Fetch logos for all available companies to display in the list
    const allTickers = useMemo(() => {
        return allCompanies.map(name => nameToTickerMap[normalizeName(name)] || nameToTickerMap[name]).filter(Boolean) as string[];
    }, [allCompanies, nameToTickerMap]);

    const { logos } = useCompanyLogos(allTickers, initialLogos);

    // Load favorites
    useEffect(() => {
        const saved = localStorage.getItem('jiggy_company_favorites');
        if (saved) {
            try {
                setFavorites(JSON.parse(saved));
            } catch (e) { }
        }
    }, []);

    const saveFavorites = (newFavs: string[]) => {
        setFavorites(newFavs);
        localStorage.setItem('jiggy_company_favorites', JSON.stringify(newFavs));
    };

    const toggleCompany = (c: string) => {
        if (singleSelection) {
            onSave([c]);
            return;
        }

        setSelected(prev => {
            const isSelected = prev.includes(c);
            if (isSelected) {
                return prev.filter(x => x !== c);
            }
            return [...prev, c];
        });
    };

    const removeCompany = (c: string) => {
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

        setSelected(items);
    };

    const currentList = useMemo(() => {
        let list = selectedCategory === "Favorites"
            ? favorites.filter(f => allCompanies.includes(f))
            : allCompanies;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(c =>
                c.toLowerCase().includes(q) ||
                (nameToTickerMap[c] && nameToTickerMap[c].toLowerCase().includes(q))
            );
        }
        return list;
    }, [selectedCategory, favorites, allCompanies, searchQuery, nameToTickerMap]);

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className={cn(
                "max-w-[1100px] w-[95vw] h-[85vh] bg-jiggy-surface border-jiggy-border p-0 flex flex-col overflow-hidden gap-0 rounded-2xl",
                singleSelection && "max-w-[800px]"
            )}>
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
                                    placeholder="Search companies..."
                                    className="pl-9 bg-terminal-bg border-jiggy-border text-sm h-10 rounded-xl focus:border-emerald-500/50 transition-all font-bold"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="px-2 py-2 space-y-1">
                                <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">My Companies</div>
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

                                <div className="pt-4 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Directories</div>
                                <button
                                    onClick={() => {
                                        setSelectedCategory("All Companies");
                                        setSearchQuery("");
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors text-left font-bold",
                                        selectedCategory === "All Companies" && !searchQuery ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:bg-slate-800/50"
                                    )}
                                >
                                    <Building2 className="h-4 w-4 shrink-0" />
                                    <span className="truncate">All Companies</span>
                                    <ChevronRight className="h-3 w-3 ml-auto opacity-50" />
                                </button>
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Middle Content - Available Companies */}
                    <div className="flex-1 flex flex-col bg-jiggy-surface border-r border-jiggy-border">
                        <div className="px-6 py-4 border-b border-jiggy-border flex items-center justify-between bg-jiggy-surface-2/50">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {searchQuery ? `Search Results (${currentList.length})` : `Available Companies: ${selectedCategory}`}
                            </h3>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                                {currentList.map(c => {
                                    const isSelected = selected.includes(c);
                                    const isFav = favorites.includes(c);
                                    const ticker = nameToTickerMap[normalizeName(c)] || nameToTickerMap[c];
                                    const logoUrl = ticker ? logos[ticker] : null;

                                    return (
                                        <div
                                            key={c}
                                            onClick={() => toggleCompany(c)}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group transition-all",
                                                isSelected ? "bg-emerald-500/10 border border-emerald-500/20" : "hover:bg-slate-800/50 border border-transparent"
                                            )}
                                        >
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 p-0 hover:bg-slate-700/50 rounded-lg shrink-0"
                                                onClick={(e) => toggleFavorite(c, e)}
                                            >
                                                <Star className={cn("h-3.5 w-3.5 transition-colors", isFav ? "fill-yellow-400 text-yellow-400" : "text-slate-600 group-hover:text-slate-400")} />
                                            </Button>

                                            {logoUrl ? (
                                                <img src={logoUrl} alt={c} className="w-6 h-6 object-contain rounded-full bg-white/10 p-0.5 shrink-0" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                                                    <span className="text-[8px] font-bold text-slate-400">{c.substring(0, 2).toUpperCase()}</span>
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <div className="text-[13px] font-bold text-slate-200 truncate">{c}</div>
                                                {ticker && <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{ticker}</div>}
                                            </div>

                                            {!singleSelection && (
                                                <Checkbox
                                                    checked={isSelected}
                                                    className="h-4 w-4 border-jiggy-border data-[state=checked]:bg-emerald-500 data-[state=checked]:text-slate-950 rounded shrink-0"
                                                    onCheckedChange={() => toggleCompany(c)}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right Sidebar - Selected Companies (Only for Multi-Select) */}
                    {!singleSelection && (
                        <div className="w-[300px] border-l border-jiggy-border bg-jiggy-surface-2 flex flex-col">
                            <div className="px-4 py-4 border-b border-jiggy-border flex items-center justify-between bg-jiggy-surface-2">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Companies</h3>
                                <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg">
                                    {selected.length}
                                </span>
                            </div>

                            <ScrollArea className="flex-1">
                                <DragDropContext onDragEnd={onDragEnd}>
                                    <Droppable droppableId="selected-companies">
                                        {(provided) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className="p-2 space-y-1"
                                            >
                                                {selected.map((c, index) => {
                                                    const ticker = nameToTickerMap[normalizeName(c)] || nameToTickerMap[c];
                                                    const logoUrl = ticker ? logos[ticker] : null;

                                                    return (
                                                        <Draggable key={c} draggableId={c} index={index}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    className={cn(
                                                                        "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm bg-jiggy-surface/60 border border-jiggy-border transition-all group font-bold",
                                                                        snapshot.isDragging && "bg-slate-700 border-emerald-500/50 shadow-xl z-50"
                                                                    )}
                                                                >
                                                                    <div {...provided.dragHandleProps} className="shrink-0 cursor-grab active:cursor-grabbing">
                                                                        <GripVertical className="h-4 w-4 text-slate-600 group-hover:text-slate-400" />
                                                                    </div>

                                                                    {logoUrl ? (
                                                                        <img src={logoUrl} alt={c} className="w-5 h-5 object-contain rounded-full bg-white/10 p-0.5 shrink-0" />
                                                                    ) : (
                                                                        <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                                                                            <span className="text-[7px] font-bold text-slate-400">{c.substring(0, 2).toUpperCase()}</span>
                                                                        </div>
                                                                    )}

                                                                    <span className="flex-1 text-[13px] text-slate-200 truncate">{c}</span>

                                                                    <button
                                                                        onClick={() => removeCompany(c)}
                                                                        className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                                                                    >
                                                                        <X className="h-3.5 w-3.5" />
                                                                    </button>
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
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
