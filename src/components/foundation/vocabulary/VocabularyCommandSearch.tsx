"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  RotateCcw,
  X,
  Clock,
  Sparkles,
  BookOpen,
} from "lucide-react";
import type { SpokenWordItem } from "@/types/vocabulary-context";

interface VocabularyCommandSearchProps {
  currentWordId: string;
  recentWords: SpokenWordItem[];
  isSearching: boolean;
  onSearch: (query: string, forceAI?: boolean) => void;
  onSelectWord: (wordItem: SpokenWordItem) => void;
  onShuffleRandomWord: () => void;
}

export function VocabularyCommandSearch({
  currentWordId,
  recentWords,
  isSearching,
  onSearch,
  onSelectWord,
  onShuffleRandomWord,
}: VocabularyCommandSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Open on Ctrl+K
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyK") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.code === "Escape" && isOpen) {
        setIsOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSearch = () => {
    if (!query.trim()) return;
    onSearch(query.trim());
    setIsOpen(false);
    setQuery("");
  };

  const handleSelectRecent = (word: SpokenWordItem) => {
    onSelectWord(word);
    setIsOpen(false);
    setQuery("");
  };

  const filteredRecents = recentWords.filter(
    (w) =>
      w.id !== currentWordId &&
      (query === "" || w.word.toLowerCase().includes(query.toLowerCase()))
  );

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="rounded-xl h-8 gap-1.5 text-xs font-semibold border-border/80 text-muted-foreground hover:text-foreground"
        title="Tra cứu từ vựng (Ctrl+K)"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Tra từ</span>
        <kbd className="hidden sm:inline text-[10px] font-mono px-1 py-0.5 bg-muted rounded">Ctrl+K</kbd>
      </Button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-100"
        onClick={() => { setIsOpen(false); setQuery(""); }}
      />

      {/* Command Dialog */}
      <div className="fixed left-1/2 top-[18%] z-50 -translate-x-1/2 w-full max-w-lg animate-in fade-in-0 zoom-in-95 duration-150">
        <div className="rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
            {isSearching ? (
              <Sparkles className="size-4 text-primary animate-spin shrink-0" />
            ) : (
              <Search className="size-4 text-muted-foreground shrink-0" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.code === "Enter") handleSearch();
                if (e.code === "Escape") { setIsOpen(false); setQuery(""); }
              }}
              placeholder="Nhập từ vựng tiếng Anh để tra cứu (AI phân tích ngay)..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="px-3 py-2 flex items-center gap-2 border-b border-border/30 bg-muted/20">
            <Button
              size="sm"
              disabled={!query.trim() || isSearching}
              onClick={handleSearch}
              className="h-7 rounded-lg text-xs font-bold px-3 gap-1"
            >
              <Sparkles className="size-3" />
              <span>Tra & phân tích AI</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isSearching}
              onClick={() => { onShuffleRandomWord(); setIsOpen(false); setQuery(""); }}
              className="h-7 rounded-lg text-xs font-semibold px-3 gap-1 border-border/80"
            >
              <RotateCcw className="size-3" />
              <span>Từ ngẫu nhiên</span>
              <kbd className="text-[10px] font-mono px-1 bg-muted rounded">R</kbd>
            </Button>
            <span className="text-[11px] text-muted-foreground ml-auto">
              <kbd className="font-mono px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> Đóng
            </span>
          </div>

          {/* Recent Words List */}
          {filteredRecents.length > 0 && (
            <div className="max-h-60 overflow-y-auto">
              <div className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Clock className="size-3" />
                <span>Từ đã tra gần đây ({filteredRecents.length})</span>
              </div>
              {filteredRecents.slice(0, 8).map((word) => (
                <button
                  key={word.id}
                  onClick={() => handleSelectRecent(word)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="size-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {word.word}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-2 font-mono">{word.ipaUS}</span>
                    <p className="text-[11px] text-muted-foreground truncate">{word.meaningVi}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                      {word.cefrLevel}
                    </Badge>
                    {word.isMastered && (
                      <span className="text-[10px] text-emerald-500 font-bold">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {filteredRecents.length === 0 && query === "" && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              Nhập từ vựng để tra cứu hoặc bấm "Từ ngẫu nhiên" để luyện tập
            </div>
          )}
        </div>
      </div>
    </>
  );
}
