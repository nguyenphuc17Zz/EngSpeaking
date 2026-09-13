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
  Zap,
} from "lucide-react";
import type { SpokenWordItem } from "@/types/vocabulary-context";
import { searchLexiconPrefix } from "@/lib/foundation/vocabulary/lexicon-db.service";

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

  const liveSuggestions =
    query.trim().length > 0 ? searchLexiconPrefix(query.trim(), 6) : [];

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
        className="rounded-xl h-8 sm:h-8.5 gap-2 text-xs font-bold border-primary/30 bg-primary/5 hover:bg-primary/10 text-foreground hover:text-primary transition-all shadow-xs"
        title="Tra cứu bất kỳ từ vựng nào bằng AI (Ctrl+K)"
      >
        <div className="size-4 rounded-md bg-primary/20 text-primary flex items-center justify-center">
          <Search className="size-2.5" />
        </div>
        <span>Tra từ bất kỳ</span>
        <kbd className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 bg-background border border-border/60 rounded text-muted-foreground">
          Ctrl+K
        </kbd>
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
      <div className="fixed left-1/2 top-[16%] z-50 -translate-x-1/2 w-full max-w-lg px-3 animate-in fade-in-0 zoom-in-95 duration-150">
        <div className="rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden">
          {/* Header Hint */}
          <div className="px-4 py-2 bg-muted/40 border-b border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles className="size-3 text-primary" />
              <span>Tra cứu & Tự sinh bài học bằng AI</span>
            </span>
            <span>Hỗ trợ 100% từ tiếng Anh</span>
          </div>

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
              placeholder="Nhập bất kỳ từ tiếng Anh nào (AI phân tích ngay)..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none font-medium"
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
              className="h-7.5 rounded-lg text-xs font-bold px-3 gap-1 bg-primary text-primary-foreground shadow-xs"
            >
              <Sparkles className="size-3" />
              <span>Phân tích & Học từ này</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isSearching}
              onClick={() => { onShuffleRandomWord(); setIsOpen(false); setQuery(""); }}
              className="h-7.5 rounded-lg text-xs font-semibold px-3 gap-1 border-border/80"
            >
              <RotateCcw className="size-3" />
              <span>Từ ngẫu nhiên</span>
              <kbd className="text-[10px] font-mono px-1 bg-muted rounded">R</kbd>
            </Button>
            <span className="text-[11px] text-muted-foreground ml-auto">
              <kbd className="font-mono px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> Đóng
            </span>
          </div>

          {/* Live Auto-Complete Oxford Dictionary Suggestions (0ms) */}
          {liveSuggestions.length > 0 && (
            <div className="max-h-64 overflow-y-auto divide-y divide-border/20">
              <div className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between bg-muted/10">
                <div className="flex items-center gap-1.5">
                  <Zap className="size-3 text-amber-500" />
                  <span>Từ điển Oxford có sẵn ({liveSuggestions.length})</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">0ms Instant</span>
              </div>
              {liveSuggestions.map((word) => (
                <button
                  key={word.id}
                  onClick={() => handleSelectRecent(word)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <BookOpen className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {word.word}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">{word.ipaUS}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{word.meaningVi}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                      {word.cefrLevel}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent Words List (1-touch restore if user switched accidentally) */}
          {query === "" && filteredRecents.length > 0 && (
            <div className="max-h-64 overflow-y-auto divide-y divide-border/20">
              <div className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between bg-muted/10">
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3 text-primary" />
                  <span>Từ vừa xem gần đây ({filteredRecents.length})</span>
                </div>
                <span className="text-[10px] font-normal lowercase opacity-80">bấm để quay lại</span>
              </div>
              {filteredRecents.slice(0, 8).map((word, idx) => (
                <button
                  key={word.id}
                  onClick={() => handleSelectRecent(word)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="size-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {word.word}
                      </span>
                      {idx === 0 && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-0 font-normal">
                          Vừa học trước đó
                        </Badge>
                      )}
                    </div>
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
              Nhập bất kỳ từ vựng nào để tra cứu hoặc bấm &quot;Từ ngẫu nhiên&quot; để luyện tập
            </div>
          )}
        </div>
      </div>
    </>
  );
}
