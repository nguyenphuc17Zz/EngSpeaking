import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, BookOpen, Loader2, Dices, Shuffle } from "lucide-react";
import type { SpokenWordItem } from "@/types/vocabulary-context";

interface SmartDictionarySearchProps {
  currentWordId: string;
  recentWords: SpokenWordItem[];
  isSearching: boolean;
  onSearch: (query: string) => void;
  onSelectWord: (wordItem: SpokenWordItem) => void;
  onShuffleRandomWord: (cefrLevel?: string) => void;
}

export function SmartDictionarySearch({
  currentWordId,
  recentWords,
  isSearching,
  onSearch,
  onSelectWord,
  onShuffleRandomWord,
}: SmartDictionarySearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim());
    }
  };

  const handleShuffle = () => {
    onShuffleRandomWord(selectedLevel === "all" ? undefined : selectedLevel);
  };

  return (
    <div className="space-y-3">
      {/* Search Bar & Random Shuffle Button */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={handleSubmit} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Tra cứu từ vựng bất kỳ (ví dụ: negotiate, comfortable, priority...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-2xl text-xs bg-card border-border/80"
            />
          </div>
          <Button
            type="submit"
            disabled={isSearching || !searchTerm.trim()}
            className="h-10 px-4 rounded-2xl text-xs font-bold gap-1.5 shadow-sm btn-spring"
          >
            {isSearching ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            <span>Tra từ</span>
          </Button>
        </form>

        {/* Prominent Random Word Button */}
        <Button
          onClick={handleShuffle}
          variant="outline"
          className="h-10 px-4 rounded-2xl text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shadow-xs btn-spring shrink-0"
        >
          <Dices className="size-4" />
          <span>🎲 Từ ngẫu nhiên (Shuffle)</span>
        </Button>
      </div>

      {/* Suggested Word Pills & CEFR Level Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs flex-1">
          <span className="text-[11px] font-bold text-muted-foreground shrink-0 mr-1">
            Từ gần đây:
          </span>
          {recentWords.map((w) => {
            const isSelected = w.id === currentWordId;
            return (
              <button
                key={w.id}
                onClick={() => onSelectWord(w)}
                className={`px-3 py-1 rounded-full text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-foreground border-border/70"
                }`}
              >
                <span>{w.word}</span>
                <span className={`text-[9px] px-1 py-0.2 rounded font-sans ${isSelected ? "bg-primary-foreground/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {w.cefrLevel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Level Filters for Random */}
        <div className="flex items-center gap-1 shrink-0 text-[11px]">
          {["all", "A2", "B1", "B2"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                setSelectedLevel(lvl);
                onShuffleRandomWord(lvl === "all" ? undefined : lvl);
              }}
              className={`px-2 py-0.5 rounded-md font-mono transition-colors ${
                selectedLevel === lvl
                  ? "bg-muted text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lvl.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
